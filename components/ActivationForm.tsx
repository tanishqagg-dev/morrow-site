"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  AppleLogo,
  ArrowClockwise,
  ArrowDown,
  CheckCircle,
  Key,
  SpinnerGap,
  WarningCircle,
  WindowsLogo,
} from "@phosphor-icons/react";
import type { DownloadPlatform, LicenseCheckResponse } from "@/lib/contracts";
import { formatActivationCodeInput } from "@/lib/activation-code";
import {
  activationCheckRequest,
  activationServiceErrorMessage,
  downloadExpiryDelay,
  parseLicenseCheckResponse,
} from "@/lib/license-check";
import { siteConfig } from "@/lib/site-config";
import { licensingFunctionsBase } from "@/lib/supabase-browser";

type ActivationState = "idle" | "loading" | "success" | "error" | "expired";
type ErrorKind = "input" | "unavailable" | "service" | null;

const REQUEST_TIMEOUT_MS = 15_000;

export function ActivationForm() {
  const [code, setCode] = useState("");
  const [platform, setPlatform] = useState<DownloadPlatform>("macos");
  const [state, setState] = useState<ActivationState>("idle");
  const [errorKind, setErrorKind] = useState<ErrorKind>(null);
  const [result, setResult] = useState<LicenseCheckResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestController = useRef<AbortController | null>(null);

  useEffect(() => {
    if (/Windows/i.test(window.navigator.userAgent)) setPlatform("windows");
  }, []);

  useEffect(() => () => {
    requestController.current?.abort();
    requestController.current = null;
  }, []);

  const downloadExpiresAt = result?.downloadExpiresAt;
  useEffect(() => {
    if (state !== "success" || !downloadExpiresAt) return;
    const delay = downloadExpiryDelay(downloadExpiresAt);
    if (delay === null || delay === 0) {
      setState("expired");
      return;
    }
    const timeout = window.setTimeout(() => setState("expired"), delay);
    return () => window.clearTimeout(timeout);
  }, [downloadExpiresAt, state]);

  const showError = (kind: Exclude<ErrorKind, null>, message: string) => {
    setResult({ eligible: false, status: "unavailable", message });
    setErrorKind(kind);
    setState("error");
    if (kind === "input") window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const checkCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (state === "loading") return;

    const requestBody = activationCheckRequest(code, platform);
    if (!requestBody) {
      showError("input", "Enter your complete activation code.");
      return;
    }

    const base = licensingFunctionsBase();
    const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
    if (!base || !publishableKey) {
      showError(
        "unavailable",
        "Morrow activation is temporarily unavailable. Please try again in a moment or contact support.",
      );
      return;
    }

    setState("loading");
    setErrorKind(null);
    setResult(null);
    requestController.current?.abort();
    const controller = new AbortController();
    requestController.current = controller;
    const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${base}/check-license`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: publishableKey,
        },
        body: JSON.stringify(requestBody),
        cache: "no-store",
        credentials: "omit",
        referrerPolicy: "no-referrer",
        signal: controller.signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        showError("service", activationServiceErrorMessage(response.status, payload));
        return;
      }

      const data = parseLicenseCheckResponse(payload, {
        expectedSupabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || "",
        expectedPlatform: platform,
      });
      if (!data) {
        showError(
          "service",
          "Morrow activation returned an unexpected response. Please try again or contact support.",
        );
        return;
      }
      if (!data.eligible || data.status === "unavailable") {
        showError("input", data.message);
        return;
      }

      setResult(data);
      setErrorKind(null);
      setState("success");
    } catch (error) {
      if (requestController.current !== controller) return;
      const timedOut = error instanceof DOMException && error.name === "AbortError";
      showError(
        "service",
        timedOut
          ? "The activation check took too long. Check your connection and try again."
          : "Morrow activation could not be reached. Check your connection and try again.",
      );
    } finally {
      window.clearTimeout(timeout);
      if (requestController.current === controller) requestController.current = null;
    }
  };

  const updateCode = (value: string) => {
    setCode(formatActivationCodeInput(value));
    if (state !== "idle") {
      setState("idle");
      setErrorKind(null);
      setResult(null);
    }
  };

  const selectPlatform = (nextPlatform: DownloadPlatform) => {
    if (platform === nextPlatform) return;
    requestController.current?.abort();
    requestController.current = null;
    setPlatform(nextPlatform);
    setState("idle");
    setErrorKind(null);
    setResult(null);
  };

  const protectDownload = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (!downloadExpiresAt || downloadExpiresAt * 1_000 <= Date.now()) {
      event.preventDefault();
      setState("expired");
    }
  };

  const downloadUrl = result?.downloadUrl;
  const inputError = state === "error" && errorKind === "input" ? result?.message : null;
  const stalePageError = state === "error" && result?.message.includes("unexpected response");
  const platformLabel = platform === "windows" ? "Windows" : "Mac";

  return (
    <div className="activation-panel">
      <form
        id="activation-form"
        className="activation-form"
        onSubmit={checkCode}
        aria-busy={state === "loading"}
        noValidate
      >
        <div className="form-heading">
          <span className="form-icon" aria-hidden="true"><Key weight="duotone" /></span>
          <div>
            <h2>Check your code.</h2>
            <p>This verifies your access before you download. Your device is linked later in the app.</p>
          </div>
        </div>

        <fieldset className="platform-fieldset" disabled={state === "loading"}>
          <legend>Download for</legend>
          <div className="platform-selector">
            <button
              className={platform === "macos" ? "selected" : ""}
              type="button"
              aria-pressed={platform === "macos"}
              onClick={() => selectPlatform("macos")}
            >
              <AppleLogo aria-hidden="true" weight="fill" />
              Mac
            </button>
            <button
              className={platform === "windows" ? "selected" : ""}
              type="button"
              aria-pressed={platform === "windows"}
              onClick={() => selectPlatform("windows")}
            >
              <WindowsLogo aria-hidden="true" weight="fill" />
              Windows
            </button>
          </div>
        </fieldset>

        {platform === "windows" && (
          <Link className="text-link activation-help-link" href="/windows-setup">
            Windows setup help
          </Link>
        )}

        <label htmlFor="activation-code">Activation code</label>
        <input
          ref={inputRef}
          id="activation-code"
          name="code"
          inputMode="text"
          autoComplete="one-time-code"
          autoCapitalize="characters"
          enterKeyHint="go"
          spellCheck={false}
          placeholder="J4U-XXXXX-XXXXX-XXXXX-XXXXX"
          value={code}
          onChange={(event) => updateCode(event.target.value)}
          minLength={27}
          maxLength={27}
          disabled={state === "loading"}
          aria-invalid={Boolean(inputError)}
          aria-describedby={inputError ? "activation-code-hint activation-code-error" : "activation-code-hint"}
          required
        />
        <p id="activation-code-hint" className="form-hint">The code starts with J4U and contains four groups of five characters.</p>
        {inputError && <p id="activation-code-error" className="field-error">{inputError}</p>}

        <button className="button button-primary button-wide" type="submit" disabled={state === "loading"}>
          {state === "loading" ? <SpinnerGap className="spin" aria-hidden="true" /> : <Key aria-hidden="true" weight="fill" />}
          {state === "loading" ? "Checking invitation" : "Check activation"}
        </button>
      </form>

      <div
        className={`activation-result ${state}`}
        role={state === "error" ? "alert" : "status"}
        aria-live={state === "error" ? "assertive" : "polite"}
        aria-atomic="true"
        aria-busy={state === "loading"}
      >
        {state === "idle" && (
          <>
            <span className="result-icon" aria-hidden="true"><CheckCircle weight="duotone" /></span>
            <strong>What happens next</strong>
            <p>Download Morrow, enter the same code in the app, then sign in through the official ChatGPT page.</p>
          </>
        )}
        {state === "loading" && (
          <div className="result-loading">
            <span className="result-icon" aria-hidden="true"><SpinnerGap className="spin" weight="bold" /></span>
            <strong>Checking your invitation</strong>
            <p>This usually takes only a few seconds.</p>
          </div>
        )}
        {state === "error" && result && (
          <>
            <span className="result-icon error" aria-hidden="true"><WarningCircle weight="fill" /></span>
            <strong>{errorKind === "input" ? "Check the code and try again" : "Activation is not available right now"}</strong>
            <p>{result.message}</p>
            {stalePageError && (
              <button className="button button-secondary" onClick={() => window.location.reload()} type="button">
                <ArrowClockwise aria-hidden="true" weight="bold" />
                Reload latest page
              </button>
            )}
            {errorKind !== "input" && (
              <a className="text-link result-support" href={siteConfig.supportUrl} target="_blank" rel="noreferrer">
                Contact support
              </a>
            )}
          </>
        )}
        {state === "success" && result && (
          <>
            <span className="result-icon success" aria-hidden="true"><CheckCircle weight="fill" /></span>
            <strong>{result.status === "pending" ? "Invitation confirmed" : "Your invitation is ready"}</strong>
            <p>{result.message}</p>
            {result.status === "pending" ? (
              <p className="release-pending">No download is enabled yet. This code will continue to work when the pilot build is released.</p>
            ) : downloadUrl ? (
              <a
                className="button button-primary"
                href={downloadUrl}
                referrerPolicy="no-referrer"
                onClick={protectDownload}
              >
                Download Morrow for {platformLabel}
                <ArrowDown aria-hidden="true" weight="bold" />
              </a>
            ) : (
              <p className="release-pending">The private installer could not be prepared. Check the code again or contact support.</p>
            )}
            {result.status === "recognized" && (
              <>
                <p className="release-pending">
                  {platform === "windows"
                    ? "Open the installer, complete setup, then enter this same code in Morrow."
                    : "Open the DMG, drag Morrow to Applications, then enter this same code in the app."}
                </p>
                <p className="result-expiry">For your security, this private link expires in a few minutes.</p>
              </>
            )}
          </>
        )}
        {state === "expired" && (
          <>
            <span className="result-icon error" aria-hidden="true"><ArrowClockwise weight="bold" /></span>
            <strong>Your private link expired</strong>
            <p>Create a fresh link with the same activation code. Your invitation is still valid.</p>
            <button className="button button-secondary" type="submit" form="activation-form">
              <ArrowClockwise aria-hidden="true" weight="bold" />
              Create a fresh link
            </button>
          </>
        )}
      </div>
    </div>
  );
}
