"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  ArrowClockwise,
  Check,
  LockKey,
  ShieldCheck,
  SignOut,
  SpinnerGap,
  WarningCircle,
} from "@phosphor-icons/react";
import type { OperatorLicenseItem, OperatorLicenseListResponse } from "@/lib/contracts";
import { getSupabaseBrowserClient, licensingFunctionsBase } from "@/lib/supabase-browser";
import { SupportAdmin } from "@/components/SupportAdmin";
import { BillingAdmin } from "@/components/BillingAdmin";

type Notice = { kind: "success" | "error"; message: string } | null;
type MfaStatus = "signed-out" | "checking" | "required" | "verified" | "error";
type MfaFactor = { id: string; friendlyName?: string };
type MfaEnrollment = { factorId: string; qrCode: string; secret: string };
type OperatorAccess = "idle" | "checking" | "authorized" | "bootstrap" | "denied";

class OperatorInvocationError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = "OperatorInvocationError";
  }
}

function edgeError(payload: unknown) {
  if (payload && typeof payload === "object") {
    const value = payload as { message?: string; error?: { code?: string; message?: string } };
    return { code: value.error?.code, message: value.error?.message || value.message };
  }
  return {};
}

async function invokeOperator<T>(functionName: string, token: string, body: unknown): Promise<T> {
  const base = licensingFunctionsBase();
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
  if (!base || !publishableKey) throw new Error("The licensing service is not configured for this deployment.");
  const response = await fetch(`${base}/${functionName}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: publishableKey,
    },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const detail = edgeError(payload);
    throw new OperatorInvocationError(
      response.status,
      detail.code || "OPERATOR_REQUEST_FAILED",
      detail.message || "The licensing service could not complete this action.",
    );
  }
  return payload as T;
}

export function OperatorConsole() {
  const client = getSupabaseBrowserClient();
  const previousUserId = useRef<string | null>(null);
  const signOutInFlight = useRef(false);
  const authGeneration = useRef(0);
  const mfaCheckGeneration = useRef(0);
  const licenseLoadGeneration = useRef(0);
  const licenseLoadInFlight = useRef<{
    scope: number;
    sequence: number;
    cursor: string | null;
    request: Promise<boolean>;
  } | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus>("signed-out");
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([]);
  const [mfaEnrollment, setMfaEnrollment] = useState<MfaEnrollment | null>(null);
  const [operatorAccess, setOperatorAccess] = useState<OperatorAccess>("idle");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [licenses, setLicenses] = useState<OperatorLicenseItem[]>([]);
  const [nextLicenseCursor, setNextLicenseCursor] = useState<string | null>(null);

  const clearOperatorScopedState = useCallback(() => {
    authGeneration.current += 1;
    mfaCheckGeneration.current += 1;
    licenseLoadGeneration.current += 1;
    licenseLoadInFlight.current = null;
    setLicenses([]);
    setNextLicenseCursor(null);
    setNotice(null);
    setMfaFactors([]);
    setMfaEnrollment(null);
    setMfaStatus("signed-out");
    setOperatorAccess("idle");
    setBusy(false);
  }, []);

  const acceptSession = useCallback((nextSession: Session | null) => {
    const nextUserId = nextSession?.user.id || null;
    if (!nextUserId || previousUserId.current !== nextUserId) {
      clearOperatorScopedState();
    }
    previousUserId.current = nextUserId;
    setSession(nextSession);
  }, [clearOperatorScopedState]);

  useEffect(() => {
    if (!client) {
      setCheckingSession(false);
      return;
    }
    let mounted = true;
    let sessionEventReceived = false;
    void client.auth.getSession().then(({ data }) => {
      if (mounted && !sessionEventReceived) {
        acceptSession(data.session);
        setCheckingSession(false);
      }
    });
    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      sessionEventReceived = true;
      if (!mounted) return;
      acceptSession(nextSession);
      setCheckingSession(false);
    });
    return () => {
      mounted = false;
      authGeneration.current += 1;
      licenseLoadGeneration.current += 1;
      licenseLoadInFlight.current = null;
      data.subscription.unsubscribe();
    };
  }, [acceptSession, client]);

  const refreshMfa = useCallback(async (activeSession: Session) => {
    if (!client || previousUserId.current !== activeSession.user.id) return;
    const scope = authGeneration.current;
    const check = ++mfaCheckGeneration.current;
    setMfaStatus("checking");
    const [assurance, factors] = await Promise.all([
      client.auth.mfa.getAuthenticatorAssuranceLevel(activeSession.access_token),
      client.auth.mfa.listFactors(),
    ]);
    if (scope !== authGeneration.current || check !== mfaCheckGeneration.current) return;
    if (assurance.error || factors.error) {
      setMfaStatus("error");
      setNotice({ kind: "error", message: assurance.error?.message || factors.error?.message || "Two-step verification could not be checked." });
      return;
    }
    setMfaFactors(factors.data.all
      .filter((factor) => factor.factor_type === "totp" && factor.status === "verified")
      .map((factor) => ({ id: factor.id, friendlyName: factor.friendly_name })));
    setMfaStatus(assurance.data.currentLevel === "aal2" ? "verified" : "required");
  }, [client]);

  useEffect(() => {
    if (session) void refreshMfa(session);
  }, [refreshMfa, session]);

  const signIn = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || signOutInFlight.current) return;
    const scope = authGeneration.current;
    setBusy(true);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const { error } = await client.auth.signInWithPassword({
      email: String(form.get("email") || ""),
      password: String(form.get("password") || ""),
    });
    if (scope !== authGeneration.current) return;
    setBusy(false);
    if (error) setNotice({ kind: "error", message: error.message });
  };

  const beginMfaEnrollment = async () => {
    if (!client || !session) return;
    const scope = authGeneration.current;
    setBusy(true);
    setNotice(null);
    const listed = await client.auth.mfa.listFactors();
    if (scope !== authGeneration.current) return;
    if (listed.error) {
      setBusy(false);
      setNotice({ kind: "error", message: listed.error.message });
      return;
    }
    const abandoned = listed.data.all.filter((factor) => factor.factor_type === "totp" && factor.status === "unverified");
    for (const factor of abandoned) {
      const { error } = await client.auth.mfa.unenroll({ factorId: factor.id });
      if (scope !== authGeneration.current) return;
      if (error) {
        setBusy(false);
        setNotice({ kind: "error", message: "An unfinished authenticator setup could not be reset. Sign out and ask the Supabase administrator to remove the unverified factor." });
        return;
      }
    }
    const { data, error } = await client.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Morrow operations",
      issuer: "Skills4U Aestrum",
    });
    if (scope !== authGeneration.current) return;
    setBusy(false);
    if (error) {
      setNotice({ kind: "error", message: error.message });
      return;
    }
    setMfaEnrollment({ factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret });
  };

  const verifyMfa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client || !session) return;
    const scope = authGeneration.current;
    const factorId = mfaEnrollment?.factorId || mfaFactors[0]?.id;
    if (!factorId) return;
    setBusy(true);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const { error } = await client.auth.mfa.challengeAndVerify({
      factorId,
      code: String(form.get("code") || "").replace(/\D/g, ""),
    });
    if (scope !== authGeneration.current) return;
    if (error) {
      setBusy(false);
      setNotice({ kind: "error", message: error.message });
      return;
    }
    const { data } = await client.auth.getSession();
    if (scope !== authGeneration.current) return;
    setMfaEnrollment(null);
    acceptSession(data.session);
    if (data.session) await refreshMfa(data.session);
    if (scope !== authGeneration.current) return;
    setBusy(false);
    setNotice({ kind: "success", message: "Two-step verification complete." });
  };

  const loadLicenses = useCallback(async (activeSession: Session, cursor: string | null = null, force = false) => {
    if (previousUserId.current !== activeSession.user.id) return false;
    const scope = authGeneration.current;
    const inFlight = licenseLoadInFlight.current;
    if (!force && inFlight?.scope === scope && inFlight.cursor === cursor) return inFlight.request;
    const sequence = ++licenseLoadGeneration.current;
    const isCurrent = () => scope === authGeneration.current && sequence === licenseLoadGeneration.current;
    const request = (async () => {
      if (!cursor) setOperatorAccess("checking");
      setNotice(null);
      try {
        let data: OperatorLicenseListResponse | null = null;
        for (let attempt = 0; attempt < 2; attempt += 1) {
          if (!isCurrent()) return false;
          try {
            data = await invokeOperator<OperatorLicenseListResponse>("operator-list-licenses", activeSession.access_token, {
              query: null,
              status: null,
              cursor,
              limit: 50,
            });
            break;
          } catch (error) {
            const retryable = error instanceof OperatorInvocationError
              && error.status === 503
              && error.code === "LICENSING_DATABASE_UNAVAILABLE";
            if (!retryable || attempt === 1) throw error;
            await new Promise((resolve) => window.setTimeout(resolve, 250));
          }
        }
        if (!data) throw new Error("Licenses could not be loaded.");
        // An old account's response must not repopulate a signed-out console.
        if (!isCurrent()) return false;
        const items = data.items;
        setLicenses((current) => cursor
          ? [...new Map([...current, ...items].map((item) => [item.id, item])).values()]
          : items);
        setNextLicenseCursor(data.nextCursor);
        setOperatorAccess("authorized");
        return true;
      } catch (error) {
        if (!isCurrent()) return false;
        if (error instanceof OperatorInvocationError && error.code === "OPERATOR_FORBIDDEN") {
          setOperatorAccess("bootstrap");
          setNotice(null);
          return false;
        }
        setOperatorAccess("denied");
        setNotice({ kind: "error", message: error instanceof Error ? error.message : "Licenses could not be loaded." });
        return false;
      } finally {
        if (licenseLoadInFlight.current?.sequence === sequence) licenseLoadInFlight.current = null;
      }
    })();
    licenseLoadInFlight.current = { scope, sequence, cursor, request };
    return request;
  }, []);

  useEffect(() => {
    if (session && mfaStatus === "verified") void loadLicenses(session);
  }, [loadLicenses, mfaStatus, session]);

  const bootstrapOwner = async () => {
    if (!session || mfaStatus !== "verified") return;
    const scope = authGeneration.current;
    setBusy(true);
    setNotice(null);
    try {
      await invokeOperator("operator-bootstrap-owner", session.access_token, {});
      if (scope !== authGeneration.current) return;
      const loaded = await loadLicenses(session, null, true);
      if (scope !== authGeneration.current) return;
      if (loaded) setNotice({ kind: "success", message: "First owner created. Subscription controls are now unlocked." });
    } catch (error) {
      if (scope !== authGeneration.current) return;
      setNotice({ kind: "error", message: error instanceof Error ? error.message : "First-owner setup could not be completed." });
    } finally {
      if (scope === authGeneration.current) setBusy(false);
    }
  };

  const signOut = async () => {
    if (!client || signOutInFlight.current) return;
    signOutInFlight.current = true;
    // Invalidate requests immediately, before the Auth network request settles.
    acceptSession(null);
    setBusy(true);
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
    } catch {
      if (!previousUserId.current) {
        setNotice({ kind: "error", message: "This page is locked, but account sign-out could not finish. Check your connection and sign in again before continuing." });
      }
    } finally {
      signOutInFlight.current = false;
      if (!previousUserId.current) setBusy(false);
    }
  };

  if (checkingSession) {
    return <div className="operator-loading" aria-live="polite"><span /><span /><span /><p>Opening the secure console</p></div>;
  }

  if (!client) {
    return (
      <div className="operator-config-error" role="alert">
        <WarningCircle aria-hidden="true" weight="duotone" />
        <span className="operator-config-kicker">MORROW / OPERATIONS</span>
        <h1>Connect the control room.</h1>
        <p>Add the public Supabase URL, publishable key, and licensing functions URL to the deployment. No Supabase secret key belongs in this website.</p>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="operator-login">
        <div className="operator-login-copy">
          <span className="form-icon" aria-hidden="true"><LockKey weight="duotone" /></span>
          <h1>Morrow operations</h1>
          <p>Sign in with your approved Supabase operator account. An authenticator code is required before the console opens.</p>
        </div>
        <form onSubmit={signIn}>
          <label htmlFor="operator-email">Operator email</label>
          <input id="operator-email" name="email" type="email" autoComplete="username" required />
          <label htmlFor="operator-password">Password</label>
          <input id="operator-password" name="password" type="password" autoComplete="current-password" minLength={8} required />
          <button className="button button-primary button-wide" disabled={busy} type="submit">
            {busy ? <SpinnerGap className="spin" aria-hidden="true" /> : <LockKey aria-hidden="true" weight="fill" />}
            {busy ? "Signing in" : "Continue securely"}
          </button>
          {notice?.kind === "error" && <p className="form-error" role="alert"><WarningCircle aria-hidden="true" weight="fill" />{notice.message}</p>}
        </form>
      </div>
    );
  }

  if (mfaStatus !== "verified") {
    const needsEnrollment = mfaFactors.length === 0 && !mfaEnrollment;
    return (
      <div className="operator-login operator-mfa">
        <div className="operator-login-copy">
          <span className="form-icon" aria-hidden="true"><ShieldCheck weight="duotone" /></span>
          <h1>Two-step verification</h1>
          <p>The admin stays locked until this session reaches Supabase AAL2.</p>
        </div>
        {mfaStatus === "checking" ? (
          <div className="mfa-checking" aria-live="polite"><SpinnerGap className="spin" aria-hidden="true" /><p>Checking session security</p></div>
        ) : needsEnrollment ? (
          <div className="mfa-enroll-start">
            <p>No authenticator is enrolled for this operator. Set one up before continuing.</p>
            <button className="button button-primary button-wide" disabled={busy} onClick={() => void beginMfaEnrollment()} type="button">
              {busy ? <SpinnerGap className="spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" weight="fill" />}
              Set up authenticator
            </button>
          </div>
        ) : (
          <form onSubmit={verifyMfa}>
            {mfaEnrollment && (
              <div className="mfa-qr">
                <img alt="Authenticator enrollment QR code" src={mfaEnrollment.qrCode} />
                <p>Scan with your authenticator app, or enter this secret manually:</p>
                <code>{mfaEnrollment.secret}</code>
              </div>
            )}
            <label htmlFor="operator-totp">Six-digit authenticator code</label>
            <input id="operator-totp" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} required />
            <button className="button button-primary button-wide" disabled={busy} type="submit">
              {busy ? <SpinnerGap className="spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" weight="fill" />}
              {busy ? "Verifying" : "Unlock console"}
            </button>
          </form>
        )}
        {notice?.kind === "error" && <p className="form-error" role="alert"><WarningCircle aria-hidden="true" weight="fill" />{notice.message}</p>}
        <button className="button button-secondary button-wide" onClick={() => void signOut()} type="button"><SignOut aria-hidden="true" />Sign out</button>
      </div>
    );
  }

  if (operatorAccess === "idle" || operatorAccess === "checking") {
    return <div className="operator-loading" aria-live="polite"><span /><span /><span /><p>Checking admin access</p></div>;
  }

  if (operatorAccess === "bootstrap") {
    return (
      <div className="operator-login operator-mfa">
        <div className="operator-login-copy">
          <span className="form-icon" aria-hidden="true"><ShieldCheck weight="duotone" /></span>
          <h1>Finish first-owner setup</h1>
          <p>This authenticator-protected account has no admin role yet. Continue only if the project administrator selected this exact Auth user as the first Morrow owner.</p>
        </div>
        <button className="button button-primary button-wide" disabled={busy} onClick={() => void bootstrapOwner()} type="button">
          {busy ? <SpinnerGap className="spin" aria-hidden="true" /> : <ShieldCheck aria-hidden="true" weight="fill" />}
          {busy ? "Creating owner" : "Create first owner"}
        </button>
        {notice && <p className={notice.kind === "error" ? "form-error" : "operator-notice success"} role={notice.kind === "error" ? "alert" : "status"}><WarningCircle aria-hidden="true" weight="fill" />{notice.message}</p>}
        <button className="button button-secondary button-wide" onClick={() => void signOut()} type="button"><SignOut aria-hidden="true" />Sign out</button>
      </div>
    );
  }

  if (operatorAccess === "denied") {
    return (
      <div className="operator-login operator-mfa">
        <div className="operator-login-copy">
          <span className="form-icon" aria-hidden="true"><WarningCircle weight="duotone" /></span>
          <h1>Admin access unavailable</h1>
          <p>{notice?.message || "The operator role could not be checked."}</p>
        </div>
        <button className="button button-primary button-wide" disabled={busy} onClick={() => void loadLicenses(session)} type="button"><ArrowClockwise aria-hidden="true" />Try again</button>
        <button className="button button-secondary button-wide" onClick={() => void signOut()} type="button"><SignOut aria-hidden="true" />Sign out</button>
      </div>
    );
  }

  return (
    <div className="operator-console">
      <header className="operator-bar">
        <div><p>Morrow operations</p><h1>Subscriptions.</h1></div>
        <div className="operator-bar-actions">
          <span><ShieldCheck aria-hidden="true" weight="fill" /> AAL2 · {session.user.email}</span>
          <button className="button button-secondary" onClick={() => void signOut()} type="button"><SignOut aria-hidden="true" />Sign out</button>
        </div>
      </header>

      {notice && <div className={`operator-notice ${notice.kind}`} role={notice.kind === "error" ? "alert" : "status"}>
        {notice.kind === "success" ? <Check aria-hidden="true" weight="bold" /> : <WarningCircle aria-hidden="true" weight="fill" />}{notice.message}
      </div>}

      <SupportAdmin key={`support-${session.user.id}`} token={session.access_token} />
      <BillingAdmin key={session.user.id} token={session.access_token} />

    </div>
  );
}
