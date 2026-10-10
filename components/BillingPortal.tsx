"use client";

import { lazy, Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClerkProvider, SignUp, SignIn, UserButton, useAuth, useClerk, useUser } from "@clerk/react";
import { ArrowRight, CheckCircle, CreditCard, SpinnerGap } from "@phosphor-icons/react";
import { BillingError, parseCheckoutReply, billingQuote, firstPaymentQuote, billingRequest, loadRazorpayCheckout, paidSeatForAccount, parseBillingCatalog, parsePendingPayment, rupees } from "@/lib/billing";
import type { BillingTrial, CheckoutReply, BillingAccount, BillingPlan, BillingSeat, BillingSnapshot, BillingSubscription } from "@/lib/billing";
import styles from "./SubscriptionFlow.module.css";
import { BillingJourney } from "./BillingJourney";
import { currentSubscriptionForAccount, subscriptionStage, paymentPollDelay } from "@/lib/subscription-flow";
import { siteConfig } from "@/lib/site-config";
import { billingAuthToken } from "@/lib/billing-auth";
import { CheckoutUnavailable } from "./CheckoutUnavailable";


function day(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }).format(new Date(value)) : "Awaiting first payment";
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}




type CustomerIdentity = {
  loaded?: boolean;
  userId: string | null;
  email: string | null;
  getToken: () => Promise<string | null>;
  openSignIn: () => void;
  signOut: () => Promise<void>;
};

const DevFixture = process.env.NODE_ENV === "development" ? lazy(() => import("./BillingDevFixture").then(module => ({ default: module.BillingDevFixture }))) : null;
export function BillingPortal() {
  const [fixture, setFixture] = useState<string | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV === "development") setFixture(new URLSearchParams(window.location.search).get("qa"));
  }, []);
  if (DevFixture && fixture) return <Suspense fallback={<p>Loading preview…</p>}><DevFixture state={fixture} /></Suspense>;
  if (process.env.NEXT_PUBLIC_CHECKOUT_ENABLED === "false") return <CheckoutUnavailable />;
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "";
  return publishableKey ? <ClerkProvider publishableKey={publishableKey} afterSignOutUrl="/subscribe"
     appearance={{
    variables: {
      colorPrimary: "#ffe34b", colorPrimaryForeground: "#111111",
      colorBackground: "#fffdf8", colorForeground: "#111111",
      colorInput: "#ffffff", colorInputForeground: "#111111",
      colorMutedForeground: "#575757", colorBorder: "#dedede",
      borderRadius: "14px", fontFamily: "Satoshi, -apple-system, BlinkMacSystemFont, Arial, sans-serif",
    },
    elements: {
      header: { display: "none" },
      headerTitle: { display: "none" },
      headerSubtitle: { display: "none" },
      footer: { background: "transparent", backgroundImage: "none" },
      rootBox: { width: "100%" },
      cardBox: { width: "100%", boxShadow: "none", overflow: "visible", borderRadius: 0 },
      card: { boxShadow: "none", background: "transparent", border: 0, padding: 0, gap: "24px" },
      main: { gap: "24px" },
      socialButtons: { width: "100%", display: "grid", gridTemplateColumns: "1fr", gap: "12px" },
      socialButtonsProviderIcon: { width: "18px", height: "18px" },
      formFieldInput: { boxShadow: "none", border: "1px solid #dedede", borderRadius: "10px", minHeight: "48px" },
      formFieldCheckboxInput__legalAccepted: { margin: 0, flexShrink: 0, borderRadius: "4px" },
      formFieldCheckboxLabel: { margin: 0, lineHeight: "20px" },
      socialButtonsBlockButton: { width: "100%", color: "#111111", border: "1px solid #dedede", borderRadius: "10px", minHeight: "48px", boxShadow: "none", background: "#ffffff" },
      formButtonPrimary: { boxShadow: "none", minHeight: "48px" },
      socialButtonsBlockButtonText: { color: "#111111" },
      footerActionLink: { color: "#111111", fontWeight: 700 },
    },
  }}>
    <ClerkBillingPortal />
  </ClerkProvider> : <BillingPortalContent identity={null} />;
}

function ClerkBillingPortal() {
  const [authMode, setAuthMode] = useState<"sign-up" | "sign-in">("sign-up");
  const [returnUrl, setReturnUrl] = useState("/subscribe");
  useEffect(() => {
    setReturnUrl(window.location.pathname + window.location.search);
    const syncMode = () => {
      if (window.location.hash.includes("sign-in")) setAuthMode("sign-in");
      else if (window.location.hash.includes("sign-up")) setAuthMode("sign-up");
    };
    syncMode(); window.addEventListener("hashchange", syncMode);
    return () => window.removeEventListener("hashchange", syncMode);
  }, []);
  const { isLoaded, userId, getToken } = useAuth();
  const { user } = useUser();
  const clerk = useClerk();
  const identity = useMemo<CustomerIdentity>(() => ({
    loaded: isLoaded,
    userId: userId || null,
    email: user?.primaryEmailAddress?.emailAddress || null,
    getToken: () => getToken(),
    openSignIn: () => { void clerk.openSignIn({ fallbackRedirectUrl: "/subscribe" }); },
    signOut: () => clerk.signOut(),
  }), [clerk, getToken, isLoaded, user?.primaryEmailAddress?.emailAddress, userId]);
  return <BillingPortalContent key={userId || "signed-out"} identity={identity} authTitle={authMode === "sign-up" ? "Create your Morrow account." : "Sign in to Morrow."} authContent={<div className={styles.embeddedAuth}>
    {authMode === "sign-up" ? <SignUp routing="hash" forceRedirectUrl={returnUrl} signInForceRedirectUrl={returnUrl} signInUrl={`${returnUrl}#sign-in`} /> : <SignIn routing="hash" forceRedirectUrl={returnUrl} signUpForceRedirectUrl={returnUrl} signUpUrl={`${returnUrl}#sign-up`} />}
  </div>} accountControl={userId ?
    <UserButton>
      <UserButton.MenuItems>
        <UserButton.Link label="Subscription" labelIcon={<CreditCard />} href="/subscribe?view=subscription" />
      </UserButton.MenuItems>
      <UserButton.UserProfileLink label="Subscription" labelIcon={<CreditCard />} url="/subscribe?view=subscription" />
    </UserButton> : undefined} />;
}

export function BillingPortalContent({ identity, accountControl, authContent, authTitle }: { identity: CustomerIdentity | null; accountControl?: ReactNode; authContent?: ReactNode; authTitle?: string }) {
  const signedIn = Boolean(identity?.userId);
  const [clock, setClock] = useState(Date.now());
  useEffect(() => { const timer = window.setInterval(() => setClock(Date.now()), 1000); return () => window.clearInterval(timer); }, []);
  const bulkEmail = siteConfig.bulkEmail;
  const identityRef = useRef(identity);
  identityRef.current = identity;
  const activeUserId = useRef<string | null>(null);
  activeUserId.current = identity?.userId || null;
  useEffect(() => {
    activeUserId.current = identity?.userId || null;
    return () => { activeUserId.current = null; };
  }, [identity?.userId]);
  const [businessInvoice,setBusinessInvoice] = useState(false);
  const [invoiceDetails,setInvoiceDetails] = useState({businessName:"",gstin:"",address:"",stateCode:"",postalCode:""});
  const [inviteCode, setInviteCode] = useState("");
  const [inviteAccepted, setInviteAccepted] = useState(false);
  useEffect(() => {
    setInviteAccepted(false);
    let provided = new URLSearchParams(window.location.search).get("invite") || "";
    let savedInvite = "";
    try {
      provided ||= sessionStorage.getItem("morrow:desktop-invite") || "";
      savedInvite = sessionStorage.getItem(`morrow:beta-invite:${identity?.userId}`) || "";
    } catch { /* The URL invitation remains usable when storage is unavailable. */ }
    setInviteCode(provided || savedInvite);

  }, [identity?.userId]);
  const [invoices, setInvoices] = useState<Array<{id:string;number:string;status:string;amountPaise:number;paidAt:string|null;url:string|null}>>([]);
  const selectedAccountRef = useRef("");
  const refreshSequence = useRef(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponPaymentMethod, setCouponPaymentMethod] = useState<"upi" | "card">("upi");
  const [coupon, setCoupon] = useState<{ code: string; unitAmountPaise: number; duration?: string; accessDays?: number; chargeAmountPaise?: number; renewalAmountPaise?: number; paymentMethods?: Array<"upi" | "card">; context: string } | null>(null);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "error">("loading");
  const [paymentMode, setPaymentMode] = useState<"test" | "live" | null>(null);
  const [trialConfig, setTrialConfig] = useState<BillingTrial>({ enabled: false, days: 7 });
  const [trialDeclined, setTrialDeclined] = useState(false);
  const [preparedCheckout, setPreparedCheckout] = useState<{ reply: CheckoutReply; context: string } | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [snapshotFailed, setSnapshotFailed] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  const [audience, setAudience] = useState<"personal" | "company">("personal");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [seats, setSeats] = useState(2);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  selectedAccountRef.current = selectedAccountId;
  useEffect(() => { setInvoices([]); }, [selectedAccountId]);
  const [seatEmail, setSeatEmail] = useState("");
  const desktopRequestRef = useRef("");
  const [desktopRequest, setDesktopRequest] = useState("");
  const [desktopConnected, setDesktopConnected] = useState(false);
  const [desktopConnecting, setDesktopConnecting] = useState(false);
  const [busy, setBusy] = useState("");
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const checkoutLock = useRef(false);
  const [notice, setNotice] = useState("");
  const [manageAccount, setManageAccount] = useState(false);
  useEffect(() => {
    setManageAccount(new URLSearchParams(window.location.search).get("view") === "subscription");
  }, []);
  const [paymentPending, setPaymentPending] = useState(false);
  const [paymentDesktopRequest, setPaymentDesktopRequest] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelRetryId, setCancelRetryId] = useState<string | null>(null);
  const connectionLock = useRef(false);
  const pendingKey = `morrow:payment-pending:${identity?.userId}:${selectedAccountId}`;
  const rememberPendingPayment = (pending: boolean) => {
    setPaymentPending(pending);
    setPaymentDesktopRequest(pending ? desktopRequest : "");
    try {
      if (pending) sessionStorage.setItem(pendingKey, JSON.stringify({ desktopRequest }));
      else sessionStorage.removeItem(pendingKey);
    } catch { /* The server remains the source of account access. */ }
  };
  useEffect(() => {
    setConfirmCancel(false); setError(""); setNotice("");
    try {
      const saved = sessionStorage.getItem(pendingKey);
      const receipt = saved ? parsePendingPayment(JSON.parse(saved)) : null;
      if (saved && !receipt) sessionStorage.removeItem(pendingKey);
      setPaymentPending(Boolean(receipt));
      setPaymentDesktopRequest(typeof receipt?.desktopRequest === "string" ? receipt.desktopRequest : "");
    } catch { setPaymentPending(false); setPaymentDesktopRequest(""); }
  }, [pendingKey]);
  const [error, setError] = useState("");
  useEffect(() => {
    setAuthTimedOut(false);
    if (identity?.loaded !== false) return;
    const timer = setTimeout(() => setAuthTimedOut(true), 20_000);
    return () => clearTimeout(timer);
  }, [identity?.loaded]);

  useEffect(() => {
    try {
      const candidate = new URLSearchParams(window.location.search).get("coupon") || sessionStorage.getItem("morrow:checkout-coupon") || "";
      if (/^[A-Z0-9][A-Z0-9_-]{2,31}$/.test(candidate.toUpperCase())) {
        setCouponCode(candidate.toUpperCase());
        sessionStorage.setItem("morrow:checkout-coupon", candidate.toUpperCase());
      }
    } catch { /* Storage is optional; checkout still works without it. */ }
  }, []);

  useEffect(() => {
    try {
      const term = new URLSearchParams(window.location.search).get("period") || sessionStorage.getItem("morrow:billing-period");
      if (term === "monthly" || term === "yearly") setPeriod(term);
    } catch { /* Storage is optional. */ }
  }, []);
  const choosePeriod = (value: "monthly" | "yearly") => {
    setPeriod(value);
    try { sessionStorage.setItem("morrow:billing-period", value); } catch { /* Storage is optional. */ }
  };

  const rememberCoupon = (value: string) => {
    setCouponCode(value); setCoupon(null);
    try {
      if (value) sessionStorage.setItem("morrow:checkout-coupon", value);
      else sessionStorage.removeItem("morrow:checkout-coupon");
    } catch { /* Private browsing can deny storage. */ }
  };

  const authToken = useCallback(async () => {
    return billingAuthToken(() => identityRef.current?.getToken() ?? Promise.resolve(null));
  }, []);

  useEffect(() => {
    const incoming = new URLSearchParams(window.location.search).get("desktop");
    const valid = (value: string | null) => Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
    try {
      if (valid(incoming)) sessionStorage.setItem("morrow:desktop-request", incoming!);
      const saved = incoming || sessionStorage.getItem("morrow:desktop-request");
      if (valid(saved)) { desktopRequestRef.current = saved!; setDesktopRequest(saved!); }
    } catch { if (valid(incoming)) { desktopRequestRef.current = incoming!; setDesktopRequest(incoming!); } }
  }, []);

  const refresh = useCallback(async () => {
    const userId = activeUserId.current;
    const accountId = selectedAccountRef.current;
    const sequence = ++refreshSequence.current;
    const stillCurrent = () => userId === activeUserId.current
      && accountId === selectedAccountRef.current && sequence === refreshSequence.current;
    try {
      const token = await authToken();
      if (!stillCurrent()) return;
      let next = await billingRequest<BillingSnapshot>("billing-customer", { action: "snapshot", accountId: accountId || undefined, desktopRequestId: desktopRequestRef.current || undefined }, token);
      if (!stillCurrent()) return;
      if (!next.accounts.some((account) => account.kind === "personal")) {
        await billingRequest("billing-customer", {action:"create_account",kind:"personal",name:"Personal account"}, token);
        if (!stillCurrent()) return;
        next = await billingRequest<BillingSnapshot>("billing-customer", {action:"snapshot",accountId:accountId || undefined,desktopRequestId:desktopRequestRef.current || undefined}, token);
      }
      if (!stillCurrent()) return;
      setSnapshotFailed(false);
      setSnapshot(next);
      setSelectedAccountId((current) => next.accounts.some((account) => account.id === current) ? current : next.accounts.find((account) => paidSeatForAccount(next, account.id, identityRef.current?.email || null))?.id || next.accounts.find((account) => account.kind === "personal")?.id || "");
      return next;
    } catch (caught) {
      if (stillCurrent()) { setSnapshotFailed(true); throw caught; }
    }
  }, [authToken]);

  useEffect(() => {
    void billingRequest<unknown>("billing-catalog")
      .then((result) => { const catalog = parseBillingCatalog(result); setPlans(catalog.plans); setPaymentMode(catalog.mode); setTrialConfig(catalog.trial); setCatalogState("ready"); })
      .catch(() => { setPlans([]); setCatalogState("error"); });
  }, []);

  useEffect(() => {
    if (!signedIn) { setSnapshot(null); setSelectedAccountId(""); setDesktopConnected(false); return; }
    let cancelled = false;
    void refresh().catch((caught) => { if (!cancelled) setError(errorText(caught)); });
    return () => { cancelled = true; };
  }, [signedIn, identity?.userId, refresh]);

  const activePlan = plans.find((plan) => plan.audience === audience && plan.period === period);
  const monthlyAvailable = plans.some((plan) => plan.audience === audience && plan.period === "monthly");
  const yearlyAvailable = plans.some((plan) => plan.audience === audience && plan.period === "yearly");
  useEffect(() => {
    if (catalogState !== "ready" || activePlan) return;
    const available = plans.find((plan) => plan.audience === audience);
    if (available) {
      setPeriod(available.period);
      setNotice("Your saved billing period is unavailable. Review the current plan below.");
    }
  }, [catalogState, activePlan, plans, audience]);
  const couponContext = `${identity?.userId}:${selectedAccountId}:${activePlan?.id}:${seats}:${audience}:${period}`;
  const appliedCoupon = coupon?.context === couponContext ? coupon : null;
  const gstBenefit = Boolean(businessInvoice && activePlan?.gstDiscountAvailable && !appliedCoupon);
  const gstBenefitTotal = activePlan?.amountPaise ?? 0;
  const gstBenefitBase = gstBenefitTotal - Math.round(gstBenefitTotal * 18 / 118);
  const unitPrice = gstBenefit ? gstBenefitBase : appliedCoupon?.unitAmountPaise ?? activePlan?.amountPaise ?? 0;
  const recurringQuote = billingQuote(unitPrice,
    audience === "company" ? seats : 1,
    gstBenefit ? gstBenefitTotal : appliedCoupon ? appliedCoupon.chargeAmountPaise : activePlan ? activePlan.chargeAmountPaise : undefined);
  // Introductory quotes already contain the aggregate first payment for all seats.
  const firstTotal = appliedCoupon?.duration === "first_cycle" ? appliedCoupon.chargeAmountPaise : undefined;
  const { base: quote, gst, total: totalCharge } = firstTotal === undefined ? recurringQuote : firstPaymentQuote(firstTotal);
  const renewalPeriod = period === "yearly" ? "year" : "month";
  const firstPaymentTerms = appliedCoupon?.duration === "first_cycle" ? `First payment only. Then ${rupees(appliedCoupon.renewalAmountPaise!)} per ${renewalPeriod} including GST.` : "";
  const trialEligible = Boolean(trialConfig.enabled && snapshot?.trial?.enabled && snapshot.trial.eligible && !trialDeclined && audience === "personal" && period === "monthly" && !appliedCoupon && !businessInvoice);
  const checkoutContext = `${couponContext}:${inviteCode}:${businessInvoice}:${JSON.stringify(invoiceDetails)}:${trialEligible}`;
  const prepared = preparedCheckout?.context === checkoutContext ? preparedCheckout.reply : null;
  const trialEndsAt = prepared?.trialEndsAt || (snapshot?.subscriptions || []).find(sub => sub.account_id === selectedAccountId && sub.status === "created")?.trial_ends_at || null;
  const billedSeats = audience === "company" ? seats : 1;
  const monthlyPrice = plans.find((plan) => plan.audience === audience && plan.period === "monthly")?.amountPaise ?? 0;
  const yearlyPrice = plans.find((plan) => plan.audience === audience && plan.period === "yearly")?.amountPaise ?? 0;
  const yearlyDiscount = monthlyPrice > 0 ? Math.max(0, Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100)) : 0;
  const monthlyEquivalent = period === "yearly" ? totalCharge / 12 : totalCharge;
  const accounts = snapshot?.accounts || [];
  const selectedAccount: BillingAccount | undefined = accounts.find((account) => account.id === selectedAccountId);
  useEffect(() => { if (selectedAccount) setAudience(selectedAccount.kind); }, [selectedAccount?.kind]);
  const subscriptions = useMemo(() => (snapshot?.subscriptions || []).filter((subscription) =>
    subscription.account_id === selectedAccountId), [snapshot, selectedAccountId]);
  const currentSubscription = currentSubscriptionForAccount(snapshot, selectedAccountId);
  const matchingAccount = selectedAccount?.kind === audience;
  const hasPaidAccess = Boolean(currentSubscription?.paid_until && new Date(currentSubscription.paid_until).getTime() > clock);
  const accountSeats = (snapshot?.seats || []).filter((seat) => seat.account_id === selectedAccountId);
  const paidAccountIds = new Set((snapshot?.subscriptions || [])
    .filter((subscription) => subscription.paid_until && new Date(subscription.paid_until).getTime() > Date.now())
    .map((subscription) => subscription.account_id));
  const claimableSeats = (snapshot?.seats || []).filter((seat) =>
    seat.email.toLowerCase() === identity?.email?.toLowerCase() && seat.licenseStatus !== "revoked" && paidAccountIds.has(seat.account_id));

  const run = async (name: string, task: () => Promise<void>) => {
    setBusy(name); setError(""); setNotice("");
    try { await task(); } catch (caught) { setError(errorText(caught)); }
    finally { setBusy(""); }
  };

  const signIn = () => void run("sign-in", async () => {
    if (!identity) throw new Error("Morrow sign-in is not connected on this site yet.");
    identity.openSignIn();
  });

  const applyCoupon = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run("coupon", async () => {
      if (!matchingAccount) throw new Error("Your account is still loading. Try again in a moment.");
      const result = await billingRequest<{ code: string; unitAmountPaise: number; duration?: string; accessDays?: number; chargeAmountPaise?: number; renewalAmountPaise?: number; paymentMethods?: Array<"upi" | "card"> }>("billing-customer", {
        action: "quote_coupon", accountId: selectedAccountId, planId: activePlan?.id,
        quantity: billedSeats, couponCode: couponCode.trim(),
      }, await authToken());
      setCoupon({ ...result, context: couponContext });
      setCouponPaymentMethod(result.paymentMethods?.[0] || "upi");
      setNotice(result.duration === "fixed" ? `Admin coupon applied: ${result.accessDays} days of access. It will not renew.` : result.duration === "first_cycle" ? `First payment ${rupees(result.chargeAmountPaise!)} including GST. Then ${rupees(result.renewalAmountPaise!)} per ${renewalPeriod} including GST until cancelled.` : "Coupon applied. This price continues for the life of this subscription.");
    });
  };

  const verifyInvite = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const userId = activeUserId.current;
    void run("invite", async () => {
      await billingRequest("billing-customer", { action: "verify_invite", inviteCode }, await authToken());
      if (userId !== activeUserId.current) return;
      setInviteAccepted(true);
      try { sessionStorage.setItem(`morrow:beta-invite:${userId}`, inviteCode.trim()); } catch { /* Optional storage. */ }
    });
  };

  const startCheckout = () => {
    if (checkoutLock.current || paymentPending || hasPaidAccess) return;
    checkoutLock.current = true;
    let opened = false;
    void run("checkout", async () => {
    if (!signedIn || !selectedAccount) throw new Error("Your account is still loading. Please try again.");
    const checkoutUser = activeUserId.current;
    await billingRequest("billing-customer", {action:"save_invoice_profile",accountId:selectedAccount.id,invoiceProfile:businessInvoice?invoiceDetails:null}, await authToken());
    if (appliedCoupon?.duration === "fixed") {
      const redeemingUser = activeUserId.current;
      const result = await billingRequest<{ expiresAt: string }>("billing-customer", {
        action: "redeem_access_coupon", accountId: selectedAccount.id, couponCode: appliedCoupon.code, inviteCode,
      }, await authToken());
      const latest = await refresh(); rememberCoupon("");
      setNotice(`Access granted until ${day(result.expiresAt)}. Open Morrow and sign in with this account. No automatic renewal.`);
      if (latest) await connectAfterPayment(latest, selectedAccount.id, redeemingUser);
      return;
    }
    if (snapshot?.betaInviteRequired && !inviteAccepted) throw new Error("Enter your beta invite code first.");
    if (!activePlan) throw new Error("Choose a published plan first.");
    if (selectedAccount.kind !== audience) throw new Error("Select a matching personal or company account.");
    if (couponCode.trim() && !appliedCoupon) throw new Error("Apply your coupon or remove it before continuing.");
    await loadRazorpayCheckout();
    if (checkoutUser !== activeUserId.current) return;
    const requestId = crypto.randomUUID();
    let result = prepared;
    if (!result) {
    try {
    result = parseCheckoutReply(await billingRequest<unknown>("billing-customer", {
      action: "checkout", accountId: selectedAccount.id, planId: activePlan.id,
      quantity: audience === "company" ? seats : 1, requestId, trial: trialEligible, desktopRequestId: desktopRequest || undefined, couponCode: appliedCoupon?.code, inviteCode,
      ...(appliedCoupon?.duration === "first_cycle" ? {paymentMethod: couponPaymentMethod} : {}),
    }, await authToken()));
    } catch (caught) {
      if (caught instanceof BillingError && caught.code === "TRIAL_CHECKOUT_EXPIRED") {
        setPreparedCheckout(null); setNotice("This checkout expired. Review your trial again to get a new date.");
        return;
      }
      if (caught instanceof BillingError && caught.code === "TRIAL_NOT_AVAILABLE") {
        setTrialDeclined(true); setPreparedCheckout(null);
        setNotice("This account cannot start another trial. You can subscribe to the plan below.");
        return;
      }
      throw caught;
    }
    if (checkoutUser !== activeUserId.current) return;
    setPreparedCheckout({ reply: result, context: checkoutContext });
    if (trialEligible) {
      if (!result.trialEndsAt) throw new Error("The trial's first charge date is unavailable. Check your account before trying again.");
      return; // Show the fixed server date before the customer authorizes their bank.
    }
    }
    if (trialEligible && (!result.trialEndsAt || Date.parse(result.trialEndsAt) <= Date.now())) {
      setPreparedCheckout(null); setNotice("This checkout expired. Review your trial again to get a new date.");
      return;
    }
    if (!window.Razorpay) throw new Error("Razorpay checkout could not be opened.");
    if (checkoutUser !== activeUserId.current) return;
    let outcome: "open" | "failed" | "confirming" = "open";
    const checkout = new window.Razorpay({
      key: result.keyId, subscription_id: result.subscriptionId, name: "Morrow",
      ...(result.paymentMethod ? {config: {display: {blocks: {selected: {name: result.paymentMethod === "upi" ? (trialEligible ? "Set up UPI AutoPay" : `Pay ${rupees(totalCharge)} with UPI`) : "Pay with credit or debit card", instruments: [{method: result.paymentMethod}]}}, sequence: ["block.selected"], preferences: {show_default_blocks: false}}}} : {}),
      description: `${audience === "company" ? `${seats} business seats` : "Personal"} · ${period}`,
      prefill: { email: result.email }, theme: { color: "#ffe34b" },
      handler: (response: unknown) => {
        if (outcome === "confirming") return;
        outcome = "confirming";
        checkoutLock.current = false; setCheckoutOpen(false);
        if (checkoutUser !== activeUserId.current) return;
        const details = response as { razorpay_payment_id?: string; razorpay_subscription_id?: string; razorpay_signature?: string };
        rememberPendingPayment(true);
        void run("confirm", async () => {
          await billingRequest("billing-customer", {
            action: "confirm_checkout", subscriptionId: details.razorpay_subscription_id,
            paymentId: details.razorpay_payment_id, signature: details.razorpay_signature,
          }, await authToken());
          setNotice("");
        });
      },
      modal: { ondismiss: () => {
        checkoutLock.current = false; setCheckoutOpen(false);
        if (checkoutUser === activeUserId.current && outcome === "open") {
          setNotice("Checkout closed. You can retry. If you approved a payment, refresh access to check its status.");
        }
      } },
    });
    checkout.on("payment.failed", (response: unknown) => {
      if (outcome === "confirming" || checkoutUser !== activeUserId.current) return;
      outcome = "failed";
      const failure = response as { error?: { description?: string } };
      setNotice("");
      setError(typeof failure?.error?.description === "string"
        ? `Payment failed: ${failure.error.description.slice(0, 240)}`
        : "Payment failed. Retry in Razorpay or close checkout and try again.");
    });
    checkout.open();
    opened = true; setCheckoutOpen(true);
    }).finally(() => { if (!opened) checkoutLock.current = false; });
  };

  const approveDesktop = async (seat: BillingSeat, userId = activeUserId.current) => {
    if (!desktopRequest) throw new Error("Open Morrow and choose Sign in to Morrow first.");
    if (connectionLock.current) return;
    connectionLock.current = true;
    setDesktopConnecting(true);
    try {
      const token = await authToken();
      if (!userId || userId !== activeUserId.current) return;
      await billingRequest("billing-customer", {action:"approve_desktop",requestId:desktopRequest,seatId:seat.id}, token);
      if (userId !== activeUserId.current) return;
      setDesktopConnected(true);
      try { sessionStorage.removeItem("morrow:desktop-request"); } catch { /* Optional storage. */ }
      setNotice("");
    } finally { connectionLock.current = false; setDesktopConnecting(false); }
  };

  const connectAfterPayment = async (latest: BillingSnapshot, accountId: string, userId: string | null) => {
    if (!desktopRequest || desktopConnected || userId !== activeUserId.current) return;
    const seat = paidSeatForAccount(latest, accountId, identityRef.current?.email || null);
    if (!seat) return;
    try { await approveDesktop(seat, userId); }
    catch { if (userId === activeUserId.current) setNotice("Your subscription is active. Reopen Morrow and sign in to finish connecting this Mac."); }
  };

  const connectDesktop = (seat: BillingSeat) => void run("connect-desktop", () => approveDesktop(seat));

  const refreshAccess = () => void run("refresh", async () => {
    if (identityRef.current?.loaded === false) { window.location.reload(); return; }
    const userId = activeUserId.current;
    const latest = await refresh();
    if (latest && paidSeatForAccount(latest, selectedAccountId, identityRef.current?.email || null)) {
      rememberPendingPayment(false);
      if (paymentPending && paymentDesktopRequest === desktopRequest) await connectAfterPayment(latest, selectedAccountId, userId);
    }
  });

  const pendingCheck = useRef<() => Promise<boolean>>(async () => false);
  pendingCheck.current = async () => {
    const userId = activeUserId.current;
    const latest = await refresh();
    if (!latest || userId !== activeUserId.current) return false;
    if (!paidSeatForAccount(latest, selectedAccountId, identityRef.current?.email || null)) return false;
    rememberPendingPayment(false);
    if (paymentDesktopRequest === desktopRequest) await connectAfterPayment(latest, selectedAccountId, userId);
    return true;
  };
  useEffect(() => {
    if (!paymentPending) return;
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try { if (await pendingCheck.current()) return; }
      catch { /* A slow webhook or offline browser can retry without starting another payment. */ }
      if (!stopped) timer = setTimeout(check, paymentPollDelay(attempt++));
    };
    timer = setTimeout(check, 1500);
    return () => { stopped = true; clearTimeout(timer); };
  }, [paymentPending, pendingKey]);

  const autoApprove = useRef<() => Promise<void>>(async () => {});
  autoApprove.current = async () => {
    const seat = claimableSeats.find(item => item.account_id === selectedAccountId);
    if (seat && !desktopConnected && !desktopConnecting) await approveDesktop(seat);
  };
  useEffect(() => {
    if (!hasPaidAccess || !desktopRequest || desktopConnected) return;
    void autoApprove.current().catch(caught => setError(errorText(caught)));
  }, [hasPaidAccess, desktopRequest, desktopConnected, selectedAccountId]);

  const stage = subscriptionStage({ loadFailed: authTimedOut || snapshotFailed, loaded: identity?.loaded !== false, signedIn, snapshotLoaded: snapshot !== null,
    hasPaidAccess, paymentPending, manageAccount, inviteRequired: snapshot?.betaInviteRequired === true, inviteAccepted });

  const assignSeat = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run("assign", async () => {
      if (!signedIn || !selectedAccount) throw new Error("Select a company account.");
      await billingRequest("billing-customer", { action: "assign_seat", accountId: selectedAccount.id, email: seatEmail }, await authToken());
      setSeatEmail(""); await refresh(); setNotice("Seat assigned. Ask this person to sign in with that email.");
    });
  };

  const removeSeat = (seat: BillingSeat) => void run(`remove-${seat.id}`, async () => {
    if (!signedIn) throw new Error("Sign in first.");
    await billingRequest("billing-customer", { action: "remove_seat", seatId: seat.id }, await authToken());
    await refresh(); setNotice("Seat removed and its access revoked.");
  });

  const changeSubscription = (action: "cancel" | "change_quantity", subscription: BillingSubscription, nextQuantity?: number) =>
    void run(action, async () => {
      if (!signedIn) throw new Error("Sign in first.");
      if (action === "cancel") setCancelRetryId(null);
      try {
        await billingRequest("billing-customer", { action, subscriptionId: subscription.id,
          ...(nextQuantity ? { quantity: nextQuantity } : {}) }, await authToken());
      } catch (caught) {
        if (action === "cancel" && caught instanceof BillingError && caught.code === "CANCELLATION_VERIFICATION_FAILED") {
          setCancelRetryId(subscription.id);
          throw new Error("We couldn't confirm the cancellation with Razorpay. Nothing changed. Try again in a minute.");
        }
        throw caught;
      }
      await refresh();
      setConfirmCancel(false);
      setNotice(action === "cancel" ? (subscription.status === "trialing" ? "Trial canceled. You will not be charged. Access stays active until your trial ends." : "Renewal cancelled. Access stays active through the paid term.") : "Seat change scheduled for the next billing cycle.");
    });

  const loadInvoices = () => void run("invoices", async () => {
    const userId = activeUserId.current;
    const accountId = selectedAccountId;
    const stillSelected = () => userId === activeUserId.current && accountId === selectedAccountRef.current;
    try {
      const token = await authToken();
      if (!stillSelected()) return;
      const results = await Promise.all(subscriptions.filter(sub => sub.razorpay_subscription_id).map(sub =>
        billingRequest<{invoices:typeof invoices}>("billing-customer", {action:"invoices",subscriptionId:sub.id}, token)));
      if (!stillSelected()) return;
      setInvoices(results.flatMap(result => result.invoices));
      if (!results.some(result => result.invoices.length)) setNotice("No invoices have been issued yet.");
    } catch (caught) { if (stillSelected()) throw caught; }
  });

  return <BillingJourney authTitle={authTitle} authContent={authContent} accountControl={accountControl} stage={stage} email={identity?.email || null} desktopRequest={Boolean(desktopRequest)}
    desktopConnected={desktopConnected} busy={Boolean(busy) || desktopConnecting} error={error} notice={notice}
    signInAvailable={Boolean(identity)} onSignIn={signIn} onRefresh={refreshAccess}
    onSignOut={() => void identity?.signOut()} onAccount={() => setManageAccount(true)}
    onBack={() => { setManageAccount(false); setConfirmCancel(false); }}
    canConnect={claimableSeats.some((seat) => seat.account_id === selectedAccountId)}
    onConnect={() => { const seat = claimableSeats.find((item) => item.account_id === selectedAccountId); if (seat) connectDesktop(seat); }}>
    {stage === "invite" && <section aria-labelledby="invite-title">
      <h1 id="invite-title">Your invitation to Morrow.</h1>
      <p className={styles.subtitle}>An invitation is required for this account. Enter the code you received.</p>
      <form onSubmit={verifyInvite} className={styles.inviteForm}>
        <label className={styles.field}>Invite code<input value={inviteCode} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64} required
          onChange={(event) => { setInviteCode(event.target.value); setInviteAccepted(false); }} disabled={Boolean(busy)} placeholder="Enter your invite code" /></label>
        <p className={styles.termNote}>Your invite gives you access to subscribe; it does not waive payment. Review your current plan on the next screen.</p>
        <button className={styles.primary} type="submit" disabled={Boolean(busy) || !inviteCode.trim()}>{busy === "invite" ? "Checking invite…" : <>Continue to plan <ArrowRight /></>}</button>
      </form>
      <p className={styles.supportNote}>No invitation yet? <a href="/#beta">Request beta access</a>.</p>
    </section>}
    {stage === "plan" && <section aria-labelledby="plan-title" id="plans">
      <h1 id="plan-title">{trialEligible ? `Start your ${snapshot?.trial?.days || trialConfig.days}-day free trial.` : "Subscribe to Morrow."}</h1>
      <p className={styles.subtitle}>{trialEligible ? "Authorize your bank, then Morrow unlocks on your Mac." : "Your voice workspace on your Mac."}</p>
      {monthlyAvailable && yearlyAvailable && <div className={styles.termSwitch} role="group" aria-label="Billing period">
        <button aria-pressed={period === "monthly"} onClick={() => choosePeriod("monthly")} disabled={Boolean(busy) || checkoutOpen}>Monthly</button>
        <button aria-pressed={period === "yearly"} onClick={() => choosePeriod("yearly")} disabled={Boolean(busy) || checkoutOpen}>Yearly {yearlyDiscount > 0 && <span>Save {yearlyDiscount}%</span>}</button>
      </div>}
      <div className={styles.plan} aria-label="Your plan">
        <div className={styles.planHeading}><h2>Morrow {audience === "company" ? "Business" : "Personal"}</h2><span>For {audience === "company" ? "your team" : "you"}</span></div>
        {trialEligible ? <>
          <ol className={styles.trialTimeline} aria-label="Your trial timeline" aria-live="polite">
            <li><div><span className={styles.timelineDate}>Today</span><strong className={styles.timelineAmount}>₹0</strong><p>Set up AutoPay to start your trial.</p></div></li>
            <li><div><span className={styles.timelineDate}>{trialEndsAt ? day(trialEndsAt) : "When your trial ends"}</span><strong className={styles.timelineAmount}>{rupees(prepared?.amountPaise ?? prepared?.chargeAmountPaise ?? totalCharge)} first charge</strong><p>{rupees(quote)} + GST, then monthly.</p><p className={styles.timelineCancel}>{trialEndsAt ? `Cancel before ${day(trialEndsAt)} to avoid this charge.` : "Review your trial to see the exact charge date."}</p></div></li>
          </ol>
          <p className={styles.authorizationNote}>Your bank may show a ₹5 check. It is refunded automatically. <a href="https://razorpay.com/docs/payments/subscriptions/faqs/" target="_blank" rel="noopener noreferrer">How authorization works ↗</a></p>
        </> : <>
          <p className={styles.price}>{appliedCoupon?.duration === "fixed" ? "No charge" : (activePlan ? rupees(monthlyEquivalent) : "Price unavailable")}{appliedCoupon?.duration !== "fixed" && <span>/ month including GST</span>}</p>
          <p className={styles.termNote}>{appliedCoupon?.duration === "fixed" ? `${appliedCoupon.accessDays} days of access. Does not renew.` : appliedCoupon?.duration === "first_cycle" ? `${firstPaymentTerms} Cancel renewal anytime.` : period === "yearly" ? `${rupees(totalCharge)} billed yearly, including GST.` : "Billed monthly. Cancel renewal anytime."}</p>
        </>}
        <ul className={styles.benefits}>
          <li><CheckCircle aria-hidden="true" />Voice and text on your Mac</li>
          <li><CheckCircle aria-hidden="true" />Work with files and connected apps</li>
          <li><CheckCircle aria-hidden="true" />{trialEligible ? "Your ChatGPT subscription is separate" : "Manage your subscription from your account"}</li>
        </ul>
        {audience === "company" && <label className={styles.field}>Seats<input type="number" min={2} max={100} value={seats} disabled={Boolean(busy) || checkoutOpen} onChange={(event) => setSeats(Math.max(2, Math.min(100, Number(event.target.value) || 2)))} /></label>}
        <details className={`${styles.coupon} ${styles.planOption}`} open={couponCode ? true : undefined}>
          <summary>Have a coupon?</summary>
          <form onSubmit={applyCoupon}>
            <label htmlFor="billing-coupon" className={styles.srOnly}>Coupon code</label>
            <div className={styles.inputRow}><input id="billing-coupon" value={couponCode} placeholder="Enter code" autoCapitalize="characters" autoComplete="off" maxLength={32}
              disabled={Boolean(busy) || checkoutOpen} onChange={(event) => rememberCoupon(event.target.value.toUpperCase())} />
              <button type="submit" disabled={Boolean(busy) || checkoutOpen || !couponCode.trim() || !matchingAccount}>{busy === "coupon" ? "Checking…" : "Apply"}</button></div>
            {appliedCoupon && <p role="status">{appliedCoupon.duration === "fixed" ? `${appliedCoupon.accessDays} days of access applied.` : appliedCoupon.duration === "first_cycle" ? firstPaymentTerms : "Discount applied to every renewal."} <button type="button" onClick={() => rememberCoupon("")}>Remove</button></p>}
          </form>
        </details>
  <details className={`${styles.management} ${styles.planOption}`}><summary>Business invoice (optional)</summary>
        <label><input type="checkbox" checked={businessInvoice} onChange={e=>setBusinessInvoice(e.target.checked)}/> Add my business GSTIN</label>
        {businessInvoice && <div className={styles.invoiceFields}>
          <label>Registered business name<input value={invoiceDetails.businessName} maxLength={160} onChange={e=>setInvoiceDetails({...invoiceDetails,businessName:e.target.value})}/></label>
          <label>GSTIN<input value={invoiceDetails.gstin} maxLength={15} autoCapitalize="characters" onChange={e=>{const gstin=e.target.value.toUpperCase();setInvoiceDetails({...invoiceDetails,gstin,stateCode:gstin.slice(0,2)});}}/></label>
          <label>Registered billing address<textarea value={invoiceDetails.address} maxLength={500} onChange={e=>setInvoiceDetails({...invoiceDetails,address:e.target.value})}/></label>
          <label>PIN code<input value={invoiceDetails.postalCode} inputMode="numeric" maxLength={6} onChange={e=>setInvoiceDetails({...invoiceDetails,postalCode:e.target.value})}/></label>
          <p>{activePlan?.gstDiscountAvailable ? `With valid GSTIN details, Morrow funds a discount equal to the standard GST charge. Your total is ${rupees(activePlan.amountPaise)} per ${renewalPeriod}, including applicable GST. Coupons cannot be combined with this discount.` : "GST is included in the checkout total."} Your details go to our billing team for the GST invoice. A GSTIN does not guarantee input tax credit.</p>
        </div>}
      </details>
            {!trialEligible && <dl className={styles.total}>
          <div><dt>Plan</dt><dd>{activePlan || appliedCoupon ? rupees(quote) : "Unavailable"}</dd></div>
          {appliedCoupon?.duration !== "fixed" && <div><dt>GST (18%{gstBenefit ? " after discount" : ""})</dt><dd>{activePlan || appliedCoupon ? rupees(gst) : "Unavailable"}</dd></div>}
          <div className={styles.totalFinal}><dt>Due today</dt><dd>{trialEligible ? "₹0" : activePlan || appliedCoupon ? rupees(totalCharge) : "Loading…"}</dd></div>
        </dl>}

        {paymentMode === "test" && <p className={styles.notice}>Test checkout. No real money is collected.</p>}
        {!activePlan && appliedCoupon?.duration !== "fixed" && <p className={styles.notice} role="status">{catalogState === "loading" ? "Loading plans…" : "This plan is not available for checkout yet. Choose another billing period or try again later."}</p>}
        {appliedCoupon?.duration === "first_cycle" && <label className={styles.field}>
          Payment method
          <select aria-label="Payment method" value={couponPaymentMethod} disabled={Boolean(busy) || checkoutOpen} onChange={event => setCouponPaymentMethod(event.target.value as "upi" | "card")}>
            {(appliedCoupon.paymentMethods || ["upi"]).map(method => <option key={method} value={method}>{method === "upi" ? "UPI" : "Credit or debit card"}</option>)}
          </select>
        </label>}
        <button className={styles.primary} onClick={startCheckout} disabled={Boolean(busy) || checkoutOpen || !matchingAccount || (!activePlan && appliedCoupon?.duration !== "fixed")}>
          {busy === "checkout" ? <><SpinnerGap className={styles.spin} /> Opening checkout…</> : checkoutOpen ? "Complete payment in Razorpay" : appliedCoupon?.duration === "fixed" ? "Redeem access" : <>{trialEligible ? (prepared?.trialEndsAt ? "Set up UPI AutoPay" : "Review free trial") : "Subscribe"} <ArrowRight /></>}
        </button>
        <p className={styles.finePrint}>{!activePlan && !appliedCoupon ? "Pricing is unavailable. Refresh your account." : trialEligible ? "Your trial starts after bank confirmation." : appliedCoupon?.duration === "fixed" ? "No payment or automatic renewal." : appliedCoupon?.duration === "first_cycle" ? `${rupees(totalCharge)} first payment, then ${rupees(appliedCoupon.renewalAmountPaise!)} per ${renewalPeriod}.` : `${rupees(totalCharge)} including GST ${period === "yearly" ? "per year" : "per month"}. Cancel renewal anytime.`}</p>
        <p className={styles.finePrint}>By continuing, you agree to the <a href="/terms">Terms</a>.</p>
      </div>
      {!trialEligible && <p className={styles.supportNote}>Your ChatGPT subscription is separate.</p>}
      {snapshot?.betaInviteRequired && <button className={styles.textButton} onClick={() => { setInviteAccepted(false); setError(""); }} disabled={Boolean(busy) || checkoutOpen}>Use a different invite code</button>}
      {bulkEmail && <p className={styles.supportNote}>Buying for a team? <a href={`mailto:${bulkEmail}?subject=Morrow%20bulk%20package`}>Contact us</a></p>}
    </section>}
    {stage === "account" && <section aria-labelledby="account-title" id="account">
      <h1 id="account-title">Your subscription</h1>
      <p className={styles.subtitle}>{identity?.email}</p>
      {accounts.length > 1 && <label className={styles.field}>Account<select value={selectedAccountId} onChange={(event) => { const account = accounts.find((item) => item.id === event.target.value); if (account) { setSelectedAccountId(account.id); setAudience(account.kind); } }}>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select></label>}
      <div className={styles.accountSummary}>
        <div className={styles.planHeading}><h2>{currentSubscription?.plan.name || "Morrow Personal"}</h2><span>{hasPaidAccess ? currentSubscription?.status === "trialing" ? "Trial" : currentSubscription?.status === "trial_canceled" ? "Trial canceled" : "Active" : currentSubscription ? "Expired" : "Not subscribed"}</span></div>
        {hasPaidAccess && currentSubscription ? <>
          <p>{currentSubscription.status === "trial_canceled" ? `Trial canceled. Access until ${day(currentSubscription.trial_ends_at || currentSubscription.paid_until)}. You won't be charged.` : currentSubscription.status === "trialing" ? `Trial ends ${day(currentSubscription.trial_ends_at || currentSubscription.paid_until)}. First charge ${rupees((currentSubscription.plan.charge_amount_paise ?? billingQuote(currentSubscription.plan.amount_paise).total) * currentSubscription.quantity)}.` : currentSubscription.access_source === "admin_coupon" ? "Complimentary access" : `${rupees((currentSubscription.plan.charge_amount_paise ?? billingQuote(currentSubscription.plan.amount_paise).total) * currentSubscription.quantity)} including GST, billed ${currentSubscription.plan.period}`}</p>
          <p role="timer">{Math.max(0, Math.floor((Date.parse(currentSubscription.paid_until!) - clock) / 86400000))} days, {Math.max(0, Math.floor((Date.parse(currentSubscription.paid_until!) - clock) / 3600000) % 24)} hours of access remaining</p>
          <dl className={styles.total}><div><dt>{currentSubscription.status === "trialing" ? "First charge" : currentSubscription.status === "trial_canceled" || currentSubscription.cancel_at_period_end || currentSubscription.access_source === "admin_coupon" ? "Access until" : "Next charge"}</dt><dd>{day(currentSubscription.paid_until)}</dd></div></dl>
          {currentSubscription.cancel_at_period_end && <p className={styles.notice}>{currentSubscription.access_source === "admin_coupon" ? "This access does not renew." : "Renewal is cancelled. You can keep using Morrow until this date."}</p>}
          {currentSubscription.razorpay_subscription_id && !currentSubscription.cancel_at_period_end && currentSubscription.status !== "trial_canceled" && <>
            {!confirmCancel ? <button className={styles.textButton} onClick={() => setConfirmCancel(true)}>{currentSubscription.status === "trialing" ? "Cancel trial" : "Cancel subscription"}</button> : <div className={styles.cancelConfirmation}>
              <h3>{currentSubscription.status === "trialing" ? "Cancel your trial?" : "Cancel renewal?"}</h3><p>You can keep using Morrow until {day(currentSubscription.paid_until)}. {currentSubscription.status === "trialing" ? "If confirmed, your first charge will be canceled." : "If confirmed, there will be no further renewals."}</p>
              <div className={styles.inputRow}><button onClick={() => { setConfirmCancel(false); setCancelRetryId(null); setError(""); }} disabled={Boolean(busy)}>Keep subscription</button><button onClick={() => changeSubscription("cancel", currentSubscription)} disabled={Boolean(busy)}>{busy === "cancel" ? "Cancelling…" : cancelRetryId === currentSubscription.id ? "Retry cancellation" : currentSubscription.status === "trialing" ? "Cancel trial" : "Cancel renewal"}</button></div>
            </div>}
          </>}
        </> : <>{currentSubscription?.paid_until && <p role="status">{currentSubscription.trial_ends_at ? "Your trial has ended" : "Your paid access ended"} on {day(currentSubscription.paid_until)}. Renew to use Morrow. Your files and payment history remain available.</p>}{currentSubscription?.razorpay_subscription_id && !currentSubscription.cancel_at_period_end && !["trial_canceled","cancelled","expired","completed"].includes(currentSubscription.status) && <button disabled={Boolean(busy)} onClick={() => changeSubscription("cancel", currentSubscription)}>{cancelRetryId === currentSubscription.id ? "Retry cancellation" : "Cancel existing renewal"}</button>}<p>{snapshot?.betaInviteRequired ? "Enter your invitation to choose a plan." : "Choose a plan to start using Morrow."}</p><button className={styles.primary} onClick={() => setManageAccount(false)}>{snapshot?.betaInviteRequired ? "Enter invite code" : "Choose a plan"} <ArrowRight /></button></>}
      </div>
      {selectedAccount?.kind === "company" && <details className={styles.management}><summary>Manage team seats</summary>
        <form onSubmit={assignSeat}><label className={styles.field}>Email<input type="email" value={seatEmail} onChange={(event) => setSeatEmail(event.target.value)} placeholder="name@company.com" required /></label><button disabled={Boolean(busy) || !hasPaidAccess}>Assign seat</button></form>
        {accountSeats.map((seat) => <div className={styles.paymentRow} key={seat.id}><span>{seat.email}</span><button onClick={() => removeSeat(seat)} disabled={Boolean(busy)}>Remove</button></div>)}
        <label className={styles.field}>Seats for next billing period<input type="number" min={2} max={100} value={seats} onChange={(event) => setSeats(Math.max(2, Math.min(100, Number(event.target.value) || 2)))} /></label>
        {currentSubscription && <button onClick={() => changeSubscription("change_quantity", currentSubscription, seats)} disabled={Boolean(busy) || !hasPaidAccess || seats === currentSubscription.quantity}>Update seats</button>}
      </details>}
      <details className={styles.management}><summary>Payments and invoices</summary>
        <button disabled={Boolean(busy)} onClick={loadInvoices}>{busy === "invoices" ? "Loading invoices…" : "Load invoices"}</button>
        {invoices.map(invoice => <div key={invoice.id} className={styles.paymentRow}><span>{invoice.number}</span><strong>{rupees(invoice.amountPaise)}</strong><span>{invoice.status}</span>{invoice.url && <a href={invoice.url} target="_blank" rel="noopener noreferrer">View invoice</a>}</div>)}
        {(snapshot?.payments || []).filter((payment) => subscriptions.some((sub) => sub.id === payment.subscription_id)).length === 0 ? <p>No payments yet.</p> :
          (snapshot?.payments || []).filter((payment) => subscriptions.some((sub) => sub.id === payment.subscription_id)).map((payment) => <div key={payment.id} className={styles.paymentRow}><span>{day(payment.paid_at)}<br /><small>Payment ID: {payment.razorpay_payment_id}</small></span><strong>{rupees(payment.amount_paise)}</strong><span>{payment.status}</span></div>)}
      </details>
      <p className={styles.supportNote}>Need a refund? <a href={`mailto:${siteConfig.supportEmail}?subject=Morrow%20refund%20request`}>Contact support</a> within 7 days of your first payment. <a href="/refunds">See the policy</a>.</p>
      <button className={styles.textButton} onClick={refreshAccess} disabled={Boolean(busy)}>{busy === "refresh" ? "Checking…" : "Refresh subscription"}</button>
    </section>}
  </BillingJourney>;
}
