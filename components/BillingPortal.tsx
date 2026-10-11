"use client";

import { lazy, Suspense, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClerkProvider, SignUp, SignIn, UserButton, useAuth, useClerk, useUser, useReverification } from "@clerk/react";
import { ArrowRight, CheckCircle, CreditCard, SpinnerGap, ArrowClockwise } from "@phosphor-icons/react";
import { isReverificationHint, BillingError, parseCheckoutReply, billingQuote, firstPaymentQuote, billingRequest, loadRazorpayCheckout, paidSeatForAccount, parseBillingCatalog, parsePendingPayment, clearPendingAuthorizations, rupees } from "@/lib/billing";
import type { BillingTrial, CheckoutReply, BillingAccount, BillingPlan, BillingSeat, BillingSnapshot, BillingSubscription } from "@/lib/billing";
import styles from "./SubscriptionFlow.module.css";
import { SubscriptionRecoveryGuidance } from "./SubscriptionRecoveryGuidance";
import { BillingJourney } from "./BillingJourney";
import { currentSubscriptionForAccount, subscriptionStage, paymentPollDelay, trialAuthorizationExpired, PAYMENT_CONFIRMATION_TIMEOUT_MS, pendingPaymentOutcome } from "@/lib/subscription-flow";
import { siteConfig } from "@/lib/site-config";
import { billingAuthToken } from "@/lib/billing-auth";
import { gstStates, invoiceFormFromProfile, invoiceProfileForCheckout, invoiceRecipientFromAccount, invoiceRecipientNameForCheckout } from "@/lib/invoice-profile";
import { pollDesktopCompletion } from "@/lib/desktop-completion";
import { revokeConnectedMac, signOutEverywhere, type ConnectedMac } from "@/lib/connected-macs";
import { clearDesktopRequest, resolveDesktopRequest, type StoredDesktopRequest } from "@/lib/desktop-storage";
import { BillingDocuments } from "./BillingDocuments";
import { printGstDocument, type GstDocument, type GatewayReceipt, type BillingDocumentsReply } from "@/lib/billing-documents";
import { DesktopConsent } from "./DesktopConsent";
import { approveDesktopRequest, type DesktopRequest } from "@/lib/desktop-consent";
import { quantityChangeEligibility } from "@/lib/subscription-quantity";
import { CheckoutRecovery } from "./CheckoutRecovery";
import { abandonCheckout, type CheckoutRecoveryState } from "@/lib/checkout-recovery";
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
  sensitiveMutation?: (body: object, expectedUserId: string) => Promise<unknown>;
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
      colorPrimary: "#F5D33F", colorPrimaryForeground: "#111111",
      colorBackground: "#FFFFFF", colorForeground: "#111111",
      colorInput: "#ffffff", colorInputForeground: "#111111",
      colorMutedForeground: "#575757", colorBorder: "#EBEBEB",
      borderRadius: "12px", fontFamily: "Satoshi, -apple-system, BlinkMacSystemFont, Arial, sans-serif",
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
      formFieldInput: { boxShadow: "none", border: "1px solid #D4D4D4", borderRadius: "12px", minHeight: "48px" },
      formFieldCheckboxInput__legalAccepted: { margin: 0, flexShrink: 0, borderRadius: "4px" },
      formFieldCheckboxLabel: { margin: 0, lineHeight: "20px" },
      socialButtonsBlockButton: { width: "100%", color: "#111111", border: "1px solid #D4D4D4", borderRadius: "12px", minHeight: "48px", boxShadow: "none", background: "#ffffff" },
      formButtonPrimary: { background: "#F5D33F", backgroundImage: "none", color: "#0A0A0A", boxShadow: "none", minHeight: "50px", borderRadius: "999px", "&::before": { display: "none", background: "none", backgroundImage: "none", boxShadow: "none" }, "&::after": { display: "none", background: "none !important", backgroundImage: "none !important", boxShadow: "none" }, "&:after": { display: "none", background: "none !important", backgroundImage: "none !important", boxShadow: "none" } },
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
  const previousUserId = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!isLoaded) return;
    if (previousUserId.current && previousUserId.current !== userId) {
      try { clearDesktopRequest(sessionStorage); if (previousUserId.current) clearPendingAuthorizations(sessionStorage, previousUserId.current); } catch { /* Optional storage. */ }
      const url = new URL(window.location.href); url.searchParams.delete("desktop");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      setReturnUrl(url.pathname + url.search);
    }
    previousUserId.current = userId || null;
  }, [isLoaded, userId]);
  const reverifiedMutation = useReverification(async (body: object, expectedUserId: string) => {
    if (!userId || userId !== expectedUserId) throw new Error("Your account changed. Sign in again before continuing.");
    const token = await billingAuthToken(() => getToken({ skipCache: true }));
    if (clerk.user?.id !== expectedUserId) throw new Error("Your account changed. Sign in again before continuing.");
    return billingRequest<unknown>("billing-customer", body, token);
  });
  const identity = useMemo<CustomerIdentity>(() => ({
    sensitiveMutation: reverifiedMutation,
    loaded: isLoaded,
    userId: userId || null,
    email: user?.primaryEmailAddress?.emailAddress || null,
    getToken: () => getToken(),
    openSignIn: () => { void clerk.openSignIn({ fallbackRedirectUrl: "/subscribe" }); },
    signOut: () => {
      try { clearDesktopRequest(sessionStorage); if (userId) clearPendingAuthorizations(sessionStorage, userId); } catch { /* Optional storage. */ }
      const url = new URL(window.location.href); url.searchParams.delete("desktop");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      return clerk.signOut();
    },
  }), [reverifiedMutation, clerk, getToken, isLoaded, user?.primaryEmailAddress?.emailAddress, userId]);
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
  const [invoiceRecipientName, setInvoiceRecipientName] = useState("");
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
  const [devices, setDevices] = useState<ConnectedMac[]>([]);
  const [devicesLoading, setDevicesLoading] = useState(false);
  const [devicesError, setDevicesError] = useState("");
  const [invoices, setInvoices] = useState<GstDocument[]>([]);
  const [receipts, setReceipts] = useState<GatewayReceipt[]>([]);
  const [receiptsStatus, setReceiptsStatus] = useState<"available" | "unavailable" | null>(null);
  const selectedAccountRef = useRef("");
  const refreshSequence = useRef(0);
  const [couponCode, setCouponCode] = useState("");
  const [couponPaymentMethod, setCouponPaymentMethod] = useState<"upi" | "card">("upi");
  const [coupon, setCoupon] = useState<{ code: string; unitAmountPaise: number; duration?: string; accessDays?: number; chargeAmountPaise?: number; renewalAmountPaise?: number; paymentMethods?: Array<"upi" | "card">; context: string } | null>(null);
  const [catalogState, setCatalogState] = useState<"loading" | "ready" | "error">("loading");
  const [paymentMode, setPaymentMode] = useState<"test" | "live" | null>(null);
  const [trialConfig, setTrialConfig] = useState<BillingTrial>({ enabled: false, days: 7 });
  const [trialDeclined, setTrialDeclined] = useState(false);
  const [preparedCheckout, setPreparedCheckout] = useState<{ reply: CheckoutReply; context: string; preparedAt: number; requestId: string } | null>(null);
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [snapshotFailed, setSnapshotFailed] = useState(false);
  const [authTimedOut, setAuthTimedOut] = useState(false);
  const [snapshot, setSnapshot] = useState<BillingSnapshot | null>(null);
  const [audience, setAudience] = useState<"personal" | "company">("personal");
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [seats, setSeats] = useState(2);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  selectedAccountRef.current = selectedAccountId;
  useEffect(() => { setInvoices([]); setReceipts([]); setReceiptsStatus(null); }, [selectedAccountId]);
  const [seatEmail, setSeatEmail] = useState("");
  const desktopRequestRef = useRef("");
  const [desktopRequest, setDesktopRequest] = useState("");
  const [desktopConnected, setDesktopConnected] = useState(false);
  const [desktopDetails, setDesktopDetails] = useState<DesktopRequest | null>(null);
  const [desktopProblem, setDesktopProblem] = useState("");
  const [codeReset, setCodeReset] = useState(0);
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
  const pendingReceipt = useRef<NonNullable<ReturnType<typeof parsePendingPayment>> | null>(null);
  const [checkoutRecovery, setCheckoutRecovery] = useState<CheckoutRecoveryState | null>(null);
  const checkoutFailure = useRef("");
  const [paymentRecovery, setPaymentRecovery] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelRetryId, setCancelRetryId] = useState<string | null>(null);
  const connectionLock = useRef(false);
  const pendingKey = `morrow:payment-pending:${identity?.userId}:${selectedAccountId}`;
  const rememberPendingPayment = (pending: boolean, subscriptionId?: string, authorization?: {requestId: string; userId: string; expiresAt: number; checkout?: {reply: CheckoutReply; preparedAt: number}}) => {
    const receipt = pending ? pendingReceipt.current?.subscriptionId === subscriptionId ? pendingReceipt.current : { desktopRequest, subscriptionId, startedAt: Date.now(), ...authorization } : null;
    pendingReceipt.current = receipt;
    setPaymentPending(pending);
    if (!pending) { setCheckoutRecovery(null); checkoutFailure.current = ""; }
    setPaymentDesktopRequest(pending ? desktopRequest : "");
    try {
      if (pending) sessionStorage.setItem(pendingKey, JSON.stringify(receipt));
      else sessionStorage.removeItem(pendingKey);
    } catch {
      if (authorization) {
        pendingReceipt.current = null; setPaymentPending(false); setPaymentDesktopRequest("");
        throw new Error("We could not save this payment for recovery. Allow session storage in your browser before opening checkout.");
      }
      // Legacy receipts remain optional; new checkouts require durable recovery state.
    }
  };
  useEffect(() => {
    setConfirmCancel(false); setError(""); setNotice(""); setPaymentRecovery(false); setCheckoutRecovery(null); checkoutFailure.current = "";
    try {
      const saved = sessionStorage.getItem(pendingKey);
      let receipt = saved ? parsePendingPayment(JSON.parse(saved)) : null;
      if (receipt?.userId && receipt.userId !== identity?.userId) receipt = null;
      if (saved && !receipt) sessionStorage.removeItem(pendingKey);
      pendingReceipt.current = receipt;
      setPaymentPending(Boolean(receipt));
      setPaymentDesktopRequest(typeof receipt?.desktopRequest === "string" ? receipt.desktopRequest : "");
    } catch { pendingReceipt.current = null; setPaymentPending(false); setPaymentDesktopRequest(""); }
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

  const storedDesktopRequest = useRef<StoredDesktopRequest | null>(null);
  useEffect(() => {
    if (identity?.loaded === false) return;
    const incoming = new URLSearchParams(window.location.search).get("desktop");
    let saved: unknown = null;
    try { const raw = sessionStorage.getItem("morrow:desktop-request"); saved = raw ? JSON.parse(raw) : null; } catch { /* Ignore legacy or unavailable storage. */ }
    const entry = resolveDesktopRequest(saved, incoming, identity?.userId || null);
    storedDesktopRequest.current = entry;
    desktopRequestRef.current = entry?.requestId || ""; setDesktopRequest(entry?.requestId || "");
    setDesktopDetails(null); setDesktopProblem(""); setCodeReset(value => value + 1); setDesktopConnected(false);
    try {
      if (entry) sessionStorage.setItem("morrow:desktop-request", JSON.stringify(entry));
      else clearDesktopRequest(sessionStorage);
    } catch { /* The URL remains usable without storage. */ }
    if (!entry && incoming) {
      const url = new URL(window.location.href); url.searchParams.delete("desktop");
      window.history.replaceState(null, "", url.pathname + url.search + url.hash);
    }
  }, [identity?.loaded, identity?.userId]);

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
  const checkoutContext = `${couponContext}:${inviteCode}:${businessInvoice}:${JSON.stringify(invoiceDetails)}:${invoiceRecipientName}:${trialEligible}`;
  const prepared = preparedCheckout?.context === checkoutContext ? preparedCheckout.reply : null;
  const trialEndsAt = prepared?.trialEndsAt || (snapshot?.subscriptions || []).find(sub => sub.account_id === selectedAccountId && sub.status === "created")?.trial_ends_at || null;
  const billedSeats = audience === "company" ? seats : 1;
  const monthlyPrice = plans.find((plan) => plan.audience === audience && plan.period === "monthly")?.amountPaise ?? 0;
  const yearlyPrice = plans.find((plan) => plan.audience === audience && plan.period === "yearly")?.amountPaise ?? 0;
  const yearlyDiscount = monthlyPrice > 0 ? Math.max(0, Math.round((1 - yearlyPrice / (monthlyPrice * 12)) * 100)) : 0;
  const monthlyEquivalent = period === "yearly" ? totalCharge / 12 : totalCharge;
  const accounts = snapshot?.accounts || [];
  const selectedAccount: BillingAccount | undefined = accounts.find((account) => account.id === selectedAccountId);
  const invoicePrefilledAccount = useRef("");
  useEffect(() => {
    if (!selectedAccount || invoicePrefilledAccount.current === selectedAccount.id) return;
    invoicePrefilledAccount.current = selectedAccount.id;
    const form = invoiceFormFromProfile(selectedAccount?.invoice_profile);
    setBusinessInvoice(form.businessInvoice); setInvoiceDetails(form.details); setInvoiceRecipientName(invoiceRecipientFromAccount(selectedAccount)); setPreparedCheckout(null);
  }, [selectedAccount]);
  useEffect(() => { if (selectedAccount) setAudience(selectedAccount.kind); }, [selectedAccount?.kind]);
  const subscriptions = useMemo(() => (snapshot?.subscriptions || []).filter((subscription) =>
    subscription.account_id === selectedAccountId), [snapshot, selectedAccountId]);
  const currentSubscription = currentSubscriptionForAccount(snapshot, selectedAccountId);
  const subscriptionNeedsRecovery = Boolean(currentSubscription && ["pending", "halted", "paused"].includes(currentSubscription.status));
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
    try { await task(); } catch (caught) {
      if ((caught as { code?: string })?.code === "reverification_cancelled") setNotice("Verification cancelled. Nothing changed.");
      else setError(errorText(caught));
    }
    finally { setBusy(""); }
  };

  const sensitiveMutation = async (body: object) => {
    const userId = activeUserId.current;
    const mutate = identityRef.current?.sensitiveMutation;
    if (!userId || !mutate) throw new Error("Sign in again to confirm it's you.");
    const result = await mutate(body, userId);
    if (userId !== activeUserId.current) throw new Error("Your account changed. Sign in again before continuing.");
    if (isReverificationHint(result)) throw new Error("Verification wasn't completed. Try again.");
    return result;
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

  const startCheckout = (resume = false) => {
    if (checkoutLock.current || paymentPending || hasPaidAccess || (!resume && pendingReceipt.current)) return;
    checkoutLock.current = true;
    let opened = false;
    void run("checkout", async () => {
    if (!signedIn || !selectedAccount) throw new Error("Your account is still loading. Please try again.");
    const checkoutUser = activeUserId.current;
    const recovery = resume ? pendingReceipt.current : null;
    if (resume && (!recovery?.checkout || recovery.userId !== checkoutUser || trialAuthorizationExpired(recovery.checkout.reply, recovery.checkout.preparedAt))) throw new Error("This checkout can no longer be resumed. Change plan to cancel it before starting again.");
    if (!resume) {
    const invoiceProfile = invoiceProfileForCheckout(businessInvoice, invoiceDetails);
    if (!businessInvoice) {
      const name = invoiceRecipientNameForCheckout(invoiceRecipientName);
      const token = await authToken();
      if (checkoutUser !== activeUserId.current || selectedAccount.id !== selectedAccountRef.current) return;
      await billingRequest("billing-customer", { action: "save_invoice_recipient_name", accountId: selectedAccount.id, name }, token);
      if (checkoutUser !== activeUserId.current || selectedAccount.id !== selectedAccountRef.current) return;
    }
    try {
      await billingRequest("billing-customer", { action: "save_invoice_profile", accountId: selectedAccount.id, invoiceProfile }, await authToken());
    } catch (caught) {
      if (caught instanceof BillingError && caught.code === "BILLING_STATE_REQUIRED") {
        setPreparedCheckout(null); document.getElementById("billing-state")?.focus();
        throw new Error("Choose your state so we can prepare your GST invoice, then try checkout again.");
      }
      throw caught;
    }
    if (checkoutUser !== activeUserId.current || selectedAccount.id !== selectedAccountRef.current) return;
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
    }
    await loadRazorpayCheckout();
    if (checkoutUser !== activeUserId.current) return;
    let result = recovery?.checkout?.reply || prepared;
    let checkoutRequestId = recovery?.requestId || preparedCheckout?.requestId || crypto.randomUUID();
    if (!resume && result && trialEligible && trialAuthorizationExpired(result, preparedCheckout?.preparedAt ?? 0)) {
      result = null; setPreparedCheckout(null);
      setNotice("This checkout expired. Review your new trial date before continuing.");
    }
    if (!result) {
      if (!activePlan) throw new Error("Choose a published plan first.");
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const requestId = crypto.randomUUID(); checkoutRequestId = requestId;
          result = parseCheckoutReply(await billingRequest<unknown>("billing-customer", {
            action: "checkout", accountId: selectedAccount.id, planId: activePlan.id,
            quantity: audience === "company" ? seats : 1, requestId, trial: trialEligible, desktopRequestId: desktopRequest || undefined, couponCode: appliedCoupon?.code, inviteCode,
            ...(appliedCoupon?.duration === "first_cycle" ? {paymentMethod: couponPaymentMethod} : {}),
          }, await authToken()));
          break;
        } catch (caught) {
          if (caught instanceof BillingError && caught.code === "BILLING_STATE_REQUIRED") {
            setPreparedCheckout(null); document.getElementById("billing-state")?.focus();
            throw new Error("Choose your state so we can prepare your GST invoice, then try checkout again.");
          }
          if (caught instanceof BillingError && caught.code === "TRIAL_CHECKOUT_EXPIRED") {
            setPreparedCheckout(null);
            if (attempt === 0) { setNotice("This checkout expired. Preparing a new checkout."); continue; }
            throw new Error("This checkout expired again. Try again in a minute.");
          }
          if (caught instanceof BillingError && caught.code === "TRIAL_NOT_AVAILABLE") {
            setTrialDeclined(true); setPreparedCheckout(null);
            setNotice("This account cannot start another trial. You can subscribe to the plan below.");
            return;
          }
          throw caught;
        }
      }
      if (!result || checkoutUser !== activeUserId.current) return;
      setPreparedCheckout({ reply: result, context: checkoutContext, preparedAt: Date.now(), requestId: checkoutRequestId });
      if (trialEligible) {
        if (!result.trialEndsAt) throw new Error("The trial's first charge date is unavailable. Check your account before trying again.");
        return; // Show the fixed server date before the customer authorizes their bank.
      }
    }
    if (!resume && trialEligible && (!result.trialEndsAt || Date.parse(result.trialEndsAt) <= Date.now())) {
      setPreparedCheckout(null); setNotice("This checkout expired. Review your trial again to get a new date.");
      return;
    }
    if (!window.Razorpay) throw new Error("Razorpay checkout could not be opened.");
    if (checkoutUser !== activeUserId.current) return;
    setCheckoutRecovery(null); setPaymentPending(true); checkoutFailure.current = "";
    let outcome: "open" | "failed" | "confirming" | "closed" = "open";
    const checkout = new window.Razorpay({
      key: result.keyId, subscription_id: result.subscriptionId, name: "Morrow",
      ...(result.paymentMethod ? {config: {display: {blocks: {selected: {name: result.paymentMethod === "upi" ? (trialEligible ? "Set up UPI AutoPay" : `Pay ${rupees(totalCharge)} with UPI`) : "Pay with credit or debit card", instruments: [{method: result.paymentMethod}]}}, sequence: ["block.selected"], preferences: {show_default_blocks: false}}}} : {}),
      description: `${audience === "company" ? `${seats} business seats` : "Personal"} · ${period}`,
      prefill: { email: result.email }, theme: { color: "#F5D33F" },
      handler: (response: unknown) => {
        if (outcome === "confirming") return;
        outcome = "confirming";
        checkoutLock.current = false; setCheckoutOpen(false);
        if (checkoutUser !== activeUserId.current || selectedAccount.id !== selectedAccountRef.current) return;
        setCheckoutRecovery(null);
        const details = response as { razorpay_payment_id?: string; razorpay_subscription_id?: string; razorpay_signature?: string };
        rememberPendingPayment(true, result.subscriptionId);
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
        if (checkoutUser === activeUserId.current && selectedAccount.id === selectedAccountRef.current && outcome !== "confirming") {
          if (outcome === "open") outcome = "closed";
          setNotice("Checking your payment… Closing checkout does not confirm whether a payment went through.");
          void pendingCheck.current();
        }
      } },
    });
    checkout.on("payment.failed", (response: unknown) => {
      if (outcome === "confirming" || checkoutUser !== activeUserId.current || selectedAccount.id !== selectedAccountRef.current) return;
      outcome = "failed";
      const failure = response as { error?: { description?: string } };
      setNotice("");
      checkoutFailure.current = typeof failure?.error?.description === "string"
        ? failure.error.description.slice(0, 240) : "Your bank did not complete this payment.";
      setError(typeof failure?.error?.description === "string"
        ? `Payment failed: ${failure.error.description.slice(0, 240)}`
        : "Razorpay reported a failed attempt. We will check the final payment status before another checkout.");
    });
    rememberPendingPayment(true, result.subscriptionId, {
      requestId: checkoutRequestId, userId: checkoutUser!,
      expiresAt: Date.now() + PAYMENT_CONFIRMATION_TIMEOUT_MS,
      checkout: recovery?.checkout || {reply: result, preparedAt: preparedCheckout?.context === checkoutContext ? preparedCheckout.preparedAt : Date.now()},
    });
    checkout.open();
    opened = true; setCheckoutOpen(outcome === "open");
    }).finally(() => { if (!opened) checkoutLock.current = false; });
  };

  const forgetDesktop = () => {
    desktopRequestRef.current = ""; setDesktopRequest(""); setDesktopDetails(null); setDesktopProblem(""); setCodeReset(value => value + 1); setDesktopConnected(false);
    storedDesktopRequest.current = null;
    try { clearDesktopRequest(sessionStorage); } catch { /* Optional storage. */ }
    const url = new URL(window.location.href); url.searchParams.delete("desktop");
    window.history.replaceState(null, "", url.pathname + url.search + url.hash);
  };

  useEffect(() => {
    if (!signedIn || !desktopRequest) return;
    let cancelled = false;
    const userId = activeUserId.current;
    void (async () => {
      const result = await billingRequest<{ request: DesktopRequest }>("billing-customer", { action: "desktop_request", requestId: desktopRequest }, await authToken());
      if (cancelled || userId !== activeUserId.current) return;
      setDesktopDetails(result.request); setCodeReset(value => value + 1);
      const entry = storedDesktopRequest.current;
      if (entry) {
        entry.expiresAt = Math.min(entry.expiresAt, Date.parse(result.request.expiresAt));
        try { sessionStorage.setItem("morrow:desktop-request", JSON.stringify(entry)); } catch { /* Optional storage. */ }
      }
      setDesktopConnected(result.request.status === "connected");
    })().catch(caught => {
      if (!cancelled && userId === activeUserId.current) {
        setDesktopProblem("This connection request is unavailable."); setError(errorText(caught));
      }
    });
    return () => { cancelled = true; };
  }, [signedIn, desktopRequest, authToken]);

  const desktopStatus = desktopDetails?.status;
  const desktopExpiresAt = desktopDetails?.expiresAt;
  useEffect(() => {
    if (!desktopDetails || desktopStatus !== "approved") return;
    const userId = activeUserId.current;
    return pollDesktopCompletion(desktopDetails, async () => {
      const token = await authToken();
      if (!userId || userId !== activeUserId.current) throw new Error("Your account changed. Start sign-in again.");
      const result = await billingRequest<{ request: DesktopRequest }>("billing-customer", { action: "desktop_request", requestId: desktopRequest }, token);
      return result.request;
    }, request => {
      if (userId !== activeUserId.current) return;
      setDesktopDetails(request); setDesktopConnected(request.status === "connected"); setError("");
      if (request.status === "connected" || request.status === "expired") {
        storedDesktopRequest.current = null;
        try { clearDesktopRequest(sessionStorage); } catch { /* Optional storage. */ }
        const url = new URL(window.location.href); url.searchParams.delete("desktop");
        window.history.replaceState(null, "", url.pathname + url.search + url.hash);
      }
    }, () => { if (userId === activeUserId.current) setError("We couldn't check your Mac. We'll keep checking until this request expires."); });
  }, [desktopStatus, desktopExpiresAt, desktopRequest, identity?.userId, authToken]);

  const approveDesktop = async (seat: BillingSeat, userCode: string, replace = false) => {
    if (!desktopDetails || connectionLock.current) return;
    const userId = activeUserId.current;
    connectionLock.current = true; setDesktopConnecting(true); setDesktopProblem("");
    try {
      await approveDesktopRequest(desktopDetails, seat.id, userCode, async body => {
        const token = await authToken();
        if (!userId || userId !== activeUserId.current) throw new Error("Your account changed. Start sign-in again.");
        if ((body as { action?: string }).action === "revoke_device") return sensitiveMutation(body);
        return billingRequest("billing-customer", body, token);
      }, replace, () => Boolean(userId && userId === activeUserId.current));
      if (userId !== activeUserId.current) return;
      setDesktopDetails(current => current ? { ...current, status: "approved" } : null);
      setNotice("");
    } catch (caught) {
      if (userId !== activeUserId.current) return;
      if (caught instanceof BillingError && caught.code === "DEVICE_CODE_MISMATCH") {
        setCodeReset(value => value + 1); setDesktopProblem("That code doesn't match. Check Morrow on your Mac."); return;
      }
      if (caught instanceof BillingError && caught.code === "DEVICE_LOGIN_EXPIRED") {
        if (Date.parse(desktopDetails.expiresAt) > Date.now()) setDesktopProblem("Too many tries. Start again from Morrow on your Mac.");
        setDesktopDetails(current => current ? { ...current, status: "expired" } : null);
        return;
      }
      if (caught instanceof BillingError && caught.code === "DEVICE_SEAT_IN_USE") {
        const result = await billingRequest<{ request: DesktopRequest }>("billing-customer", { action: "desktop_request", requestId: desktopRequest }, await authToken());
        if (userId === activeUserId.current) { setDesktopDetails(result.request); setCodeReset(value => value + 1); }
      }
      throw caught;
    } finally { connectionLock.current = false; setDesktopConnecting(false); }
  };

  const connectAfterPayment = async (latest: BillingSnapshot, accountId: string, userId: string | null) => {
    if (!desktopRequest || desktopConnected || userId !== activeUserId.current) return;
    if (paidSeatForAccount(latest, accountId, identityRef.current?.email || null)) setNotice("Your access is ready. Enter the code shown in Morrow to connect your Mac.");
  };

  const connectDesktop = (seat: BillingSeat, userCode: string, replace = false) => void run("connect-desktop", () => approveDesktop(seat, userCode, replace));

  const refreshAccess = () => void run("refresh", async () => {
    if (identityRef.current?.loaded === false) { window.location.reload(); return; }
    if (pendingReceipt.current) { await pendingCheck.current(); return; }
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
    const receipt = pendingReceipt.current;
    const accountId = selectedAccountId;
    if (!receipt) return true;
    const recover = () => {
      rememberPendingPayment(false);
      setPreparedCheckout(null); setError(""); setNotice(""); setPaymentRecovery(true);
      return true;
    };
    const uncertain = () => {
      setPaymentPending(false); setCheckoutRecovery("uncertain"); setNotice("");
      return true;
    };
    // Bound confirmation even when every request fails or the browser is offline.
    if (pendingPaymentOutcome(null, accountId, receipt, false) === "failed") return recover();
    let latest: BillingSnapshot | undefined;
    try { latest = await refresh(); }
    catch {
      if (receipt !== pendingReceipt.current || userId !== activeUserId.current || accountId !== selectedAccountRef.current) return true;
      const outcome = pendingPaymentOutcome(null, accountId, receipt, false);
      return outcome === "failed" ? recover() : outcome === "uncertain" ? uncertain() : false;
    }
    if (receipt !== pendingReceipt.current || userId !== activeUserId.current || accountId !== selectedAccountRef.current) return true;
    const outcome = pendingPaymentOutcome(latest, accountId, receipt,
      Boolean(latest && paidSeatForAccount(latest, accountId, identityRef.current?.email || null)));
    if (outcome === "uncertain") return uncertain();
    if (outcome === "closed") {
      setPaymentPending(false); setCheckoutRecovery(checkoutFailure.current ? "failed" : "closed"); setError(""); setNotice("");
      return true;
    }
    if (outcome === "waiting") return false;
    if (outcome === "failed") return recover();
    rememberPendingPayment(false);
    if (latest && paymentDesktopRequest === desktopRequest) await connectAfterPayment(latest, accountId, userId);
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

  const stage = subscriptionStage({ loadFailed: authTimedOut || snapshotFailed, loaded: identity?.loaded !== false, signedIn, snapshotLoaded: snapshot !== null,
    hasPaidAccess, paymentPending: paymentPending && !checkoutRecovery, paymentRecovery, manageAccount, inviteRequired: snapshot?.betaInviteRequired === true, inviteAccepted });

  const changeCheckoutPlan = () => void run("abandon", async () => {
    const receipt = pendingReceipt.current;
    const userId = activeUserId.current;
    const accountId = selectedAccountRef.current;
    if (!receipt || receipt.userId !== userId) return;
    const stillCurrent = () => receipt === pendingReceipt.current && userId === activeUserId.current && accountId === selectedAccountRef.current;
    try {
      await abandonCheckout(async () => billingRequest("billing-customer", {action:"abandon_checkout", subscriptionId:receipt.subscriptionId, requestId:receipt.requestId}, await authToken()), () => {
        rememberPendingPayment(false); setPreparedCheckout(null); setPaymentRecovery(false);
        setNotice("Checkout cancelled. Choose your plan and payment method below.");
      }, stillCurrent);
    } catch (caught) {
      if (!stillCurrent()) return;
      if (caught instanceof BillingError && ["CHECKOUT_PAYMENT_PENDING","BILLING_CHECKOUT_PAID"].includes(caught.code || "")) { await pendingCheck.current(); if (!stillCurrent()) return; }
      throw caught;
    }
  });

  const loadDevices = useCallback(async () => {
    const userId = activeUserId.current;
    setDevicesLoading(true); setDevicesError("");
    try {
      const token = await authToken();
      if (!userId || userId !== activeUserId.current) return;
      const result = await billingRequest<{ devices: ConnectedMac[] }>("billing-customer", { action: "devices" }, token);
      if (userId === activeUserId.current) setDevices(result.devices);
    } catch (caught) { if (userId === activeUserId.current) setDevicesError(errorText(caught)); }
    finally { if (userId === activeUserId.current) setDevicesLoading(false); }
  }, [authToken]);
  useEffect(() => { if (stage === "account" && signedIn) void loadDevices(); }, [stage, signedIn, loadDevices]);

  const deviceMutation = async (body: object) => {
    const userId = activeUserId.current;
    const token = await authToken();
    if (!userId || userId !== activeUserId.current) throw new Error("Sign in again to manage your Macs.");
    return sensitiveMutation(body);
  };
  const revokeMac = (device: ConnectedMac) => void run(`revoke-${device.installationId}`, async () => {
    await revokeConnectedMac(device.installationId, deviceMutation); await loadDevices();
    setNotice("This Mac has been signed out of Morrow.");
  });
  const signOutAll = () => void run("sign-out-everywhere", async () => {
    if (!identity) return;
    await signOutEverywhere(deviceMutation, async () => { forgetDesktop(); await identity.signOut(); });
  });

  const assignSeat = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run("assign", async () => {
      if (!signedIn || !selectedAccount) throw new Error("Select a company account.");
      await sensitiveMutation({ action: "assign_seat", accountId: selectedAccount.id, email: seatEmail });
      setSeatEmail(""); await refresh(); setNotice("Seat assigned. Ask this person to sign in with that email.");
    });
  };

  const removeSeat = (seat: BillingSeat) => void run(`remove-${seat.id}`, async () => {
    if (!signedIn) throw new Error("Sign in first.");
    await sensitiveMutation({ action: "remove_seat", seatId: seat.id });
    await refresh(); setNotice("Seat removed and its access revoked.");
  });

  const changeSubscription = (action: "cancel" | "change_quantity", subscription: BillingSubscription, nextQuantity?: number) =>
    void run(action, async () => {
      if (!signedIn) throw new Error("Sign in first.");
      if (action === "change_quantity" && quantityChangeEligibility(subscription) !== "allowed") throw new Error("Refresh your subscription to check whether seat changes are available.");
      if (action === "cancel") setCancelRetryId(null);
      try {
        await sensitiveMutation({ action, subscriptionId: subscription.id,
          ...(nextQuantity ? { quantity: nextQuantity } : {}) });
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

  const printInvoice = (document: GstDocument) => {
    const userId = activeUserId.current, accountId = selectedAccountId;
    const stillSelected = () => userId === activeUserId.current && accountId === selectedAccountRef.current;
    void run("print-invoice", async () => {
      try {
        await printGstDocument(document, async () => {
          const token = await authToken();
          if (!stillSelected()) throw new Error("Your account changed. Load your documents again.");
          return billingRequest<string>("billing-customer", {action: "invoices", subscriptionId: document.subscriptionId, documentId: document.id, format: "html"}, token);
        }, stillSelected);
      } catch (caught) { if (stillSelected()) throw caught; }
    });
  };

  const loadInvoices = () => void run("invoices", async () => {
    const userId = activeUserId.current;
    const accountId = selectedAccountId;
    const stillSelected = () => userId === activeUserId.current && accountId === selectedAccountRef.current;
    try {
      const token = await authToken();
      if (!stillSelected()) return;
      const results = await Promise.all(subscriptions.map(sub =>
        billingRequest<BillingDocumentsReply>("billing-customer", {action:"invoices",subscriptionId:sub.id}, token)));
      if (!stillSelected()) return;
      setInvoices(results.flatMap(result => result.invoices));
      setReceipts(results.flatMap(result => result.receipts));
      setReceiptsStatus(results.some(result => result.receiptsStatus === "unavailable") ? "unavailable" : "available");
    } catch (caught) { if (stillSelected()) throw caught; }
  });

  const desktopConsent = desktopRequest ? <DesktopConsent problem={desktopProblem} request={desktopDetails} resetCode={codeReset} busy={Boolean(busy) || desktopConnecting} now={clock}
    canConnect={claimableSeats.some(seat => seat.account_id === selectedAccountId)} onForget={forgetDesktop}
    onConnect={(userCode, replace) => { const seat = claimableSeats.find(item => item.account_id === selectedAccountId); if (seat) connectDesktop(seat, userCode, replace); }} /> : undefined;

  return <BillingJourney desktopConsent={desktopConsent} authTitle={authTitle} authContent={authContent} accountControl={accountControl} stage={stage} email={identity?.email || null} desktopRequest={Boolean(desktopRequest)}
    desktopConnected={desktopConnected} busy={Boolean(busy) || desktopConnecting} error={error} notice={notice}
    onRetryPayment={() => { setPaymentRecovery(false); setManageAccount(false); setPreparedCheckout(null); setError(""); setNotice(""); void refreshAccess(); }}
    signInAvailable={Boolean(identity)} onSignIn={signIn} onRefresh={refreshAccess}
    onSignOut={() => { forgetDesktop(); void identity?.signOut(); }} onAccount={() => setManageAccount(true)}
    onBack={() => { setManageAccount(false); setConfirmCancel(false); }}
    canConnect={claimableSeats.some((seat) => seat.account_id === selectedAccountId)}
    onConnect={() => { const seat = claimableSeats.find((item) => item.account_id === selectedAccountId); if (seat) setError("Enter the code shown in Morrow to connect your Mac."); }}>
    {stage === "invite" && <section aria-labelledby="invite-title">
      <h1 id="invite-title">Your invitation to Morrow.</h1>
      <p className={styles.subtitle}>An invitation is required for this account. Enter the code you received.</p>
      <form onSubmit={verifyInvite} className={styles.inviteForm}>
        <label className={styles.field}>Invite code<input value={inviteCode} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={64} required
          onChange={(event) => { setInviteCode(event.target.value); setInviteAccepted(false); }} disabled={Boolean(busy)} placeholder="Enter your invite code" /></label>
        <p className={styles.termNote}>Your invite gives you access to subscribe; it does not waive payment. Review your current plan on the next screen.</p>
        <button className={styles.primary} type="submit" disabled={Boolean(busy) || !inviteCode.trim()}>{busy === "invite" ? "Checking invite…" : <>Continue to plan <ArrowRight /></>}</button>
      </form>
      <p className={styles.supportNote}>No invitation yet? <a href="/contact">Request beta access</a>.</p>
    </section>}
    {stage === "plan" && <section aria-labelledby="plan-title" id="plans">
      {checkoutRecovery && <CheckoutRecovery state={checkoutRecovery} reason={checkoutFailure.current} busy={Boolean(busy)}
        canResume={Boolean(pendingReceipt.current?.checkout && snapshot?.subscriptions.some(item => item.account_id === selectedAccountId && item.razorpay_subscription_id === pendingReceipt.current?.subscriptionId && item.status === "created") && !trialAuthorizationExpired(pendingReceipt.current.checkout.reply, pendingReceipt.current.checkout.preparedAt, clock))}
        onResume={() => startCheckout(true)} onChangePlan={changeCheckoutPlan} onRefresh={refreshAccess} />}
      <h1 id="plan-title">{trialEligible ? `Start your ${snapshot?.trial?.days || trialConfig.days}-day free trial.` : "Subscribe to Morrow."}</h1>
      <p className={styles.subtitle}>{trialEligible ? "Authorize your bank, then Morrow unlocks on your Mac." : "Your voice workspace on your Mac."}</p>
      <fieldset disabled={Boolean(pendingReceipt.current)} className={styles.planFieldset}>
      {monthlyAvailable && yearlyAvailable && <div className={styles.termSwitch} role="group" aria-label="Billing period">
        <button aria-pressed={period === "monthly"} onClick={() => choosePeriod("monthly")} disabled={Boolean(busy) || checkoutOpen}>Monthly</button>
        <button aria-pressed={period === "yearly"} onClick={() => choosePeriod("yearly")} disabled={Boolean(busy) || checkoutOpen}>Yearly {yearlyDiscount > 0 && <span>Save {yearlyDiscount}%</span>}</button>
      </div>}
      <div className={styles.plan} aria-label="Your plan">
        <div className={styles.planHeading}><h2>Morrow {audience === "company" ? "Business" : "Personal"}</h2><span>For {audience === "company" ? "your team" : "you"}</span></div>
        {trialEligible ? <>
          <ol className={styles.trialTimeline} aria-label="Your trial timeline" aria-live="polite">
            <li><div><span className={styles.timelineDate}>Today</span><strong className={styles.timelineAmount}>₹0</strong><p>Set up AutoPay to start your trial.</p></div></li>
            <li><div><span className={styles.timelineDate}>{trialEndsAt ? day(trialEndsAt) : "When your trial ends"}</span><strong className={styles.timelineAmount}>{activePlan || prepared ? `${rupees(prepared?.amountPaise ?? prepared?.chargeAmountPaise ?? totalCharge)} first charge` : "Price unavailable"}</strong><p>{activePlan ? `${rupees(quote)} + GST, then monthly.` : "No published plan is available right now."}</p><p className={styles.timelineCancel}>{trialEndsAt ? `Cancel before ${day(trialEndsAt)} to avoid this charge.` : "Review your trial to see the exact charge date."}</p></div></li>
          </ol>
          <p className={styles.authorizationNote}>Your bank may show a ₹5 check. It is refunded automatically. <a href="https://razorpay.com/docs/payments/subscriptions/faqs/" target="_blank" rel="noopener noreferrer">How authorization works ↗</a></p>
        </> : <>
          <p className={styles.price}>{appliedCoupon?.duration === "fixed" ? "No charge" : (activePlan ? rupees(appliedCoupon?.duration === "first_cycle" ? totalCharge : monthlyEquivalent) : "Price unavailable")}{appliedCoupon?.duration !== "fixed" && <span>{appliedCoupon?.duration === "first_cycle" ? "first payment including GST" : "/ month including GST"}</span>}</p>
          <p className={styles.termNote}>{appliedCoupon?.duration === "fixed" ? `${appliedCoupon.accessDays} days of access. Does not renew.` : appliedCoupon?.duration === "first_cycle" ? `${firstPaymentTerms} Cancel renewal anytime.` : period === "yearly" ? `${rupees(totalCharge)} billed yearly, including GST.` : "Billed monthly. Cancel renewal anytime."}</p>
        </>}
        {!trialEligible && <ul className={styles.benefits}>
          <li><CheckCircle aria-hidden="true" />Voice and text on your Mac</li>
          <li><CheckCircle aria-hidden="true" />Work with files and connected apps</li>
          <li><CheckCircle aria-hidden="true" />{trialEligible ? "Your ChatGPT subscription is separate" : "Manage your subscription from your account"}</li>
        </ul>}
        {audience === "company" && <label className={styles.field}>Seats<input type="number" min={2} max={100} value={seats} disabled={Boolean(busy) || checkoutOpen} onChange={(event) => setSeats(Math.max(2, Math.min(100, Number(event.target.value) || 2)))} /></label>}
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
        {!businessInvoice && <label className={styles.field} htmlFor="invoice-recipient-name">Your name
          <input id="invoice-recipient-name" autoComplete="name" required minLength={2} maxLength={160} value={invoiceRecipientName}
            disabled={Boolean(busy) || checkoutOpen} onChange={event => { setInvoiceRecipientName(event.target.value); setPreparedCheckout(null); }} />
        </label>}
        <label className={styles.field} htmlFor="billing-state">Your state
          <select id="billing-state" aria-label="Your state" required value={invoiceDetails.stateCode} disabled={Boolean(busy) || checkoutOpen}
            onChange={event => setInvoiceDetails({ ...invoiceDetails, stateCode: event.target.value })}>
            <option value="">Choose your state</option>
            {gstStates.map(([code, name]) => <option key={code} value={code}>{name} ({code})</option>)}
          </select>
        </label>
        <p className={styles.finePrint}>We need your state for the GST invoice.</p>
        <button className={styles.primary} onClick={() => startCheckout()} disabled={Boolean(busy) || checkoutOpen || !matchingAccount || !invoiceDetails.stateCode || (!businessInvoice && (invoiceRecipientName.trim().length < 2 || invoiceRecipientName.trim().length > 160)) || (!activePlan && appliedCoupon?.duration !== "fixed")}>
          {busy === "checkout" ? <><SpinnerGap className={styles.spin} /> Opening checkout…</> : checkoutOpen ? "Complete payment in Razorpay" : appliedCoupon?.duration === "fixed" ? "Redeem access" : <>{trialEligible ? (prepared?.trialEndsAt ? "Set up UPI AutoPay" : "Review free trial") : "Subscribe"} <ArrowRight /></>}
        </button>
        <p className={styles.finePrint}>{!activePlan && !appliedCoupon ? "Pricing is unavailable. Refresh your account." : trialEligible ? "Your trial starts after bank confirmation." : appliedCoupon?.duration === "fixed" ? "No payment or automatic renewal." : appliedCoupon?.duration === "first_cycle" ? `${rupees(totalCharge)} first payment, then ${rupees(appliedCoupon.renewalAmountPaise!)} per ${renewalPeriod}.` : `${rupees(totalCharge)} including GST ${period === "yearly" ? "per year" : "per month"}. Cancel renewal anytime.`}</p>
        <p className={styles.finePrint}>By continuing, you agree to the <a href="/terms">Terms</a>.</p>
        <div className={styles.planOptions}>
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
          <label>GSTIN<input value={invoiceDetails.gstin} maxLength={15} autoCapitalize="characters" onChange={e=>{const gstin=e.target.value.toUpperCase();setInvoiceDetails({...invoiceDetails,gstin});}}/></label>
          <label>Registered billing address<textarea value={invoiceDetails.address} maxLength={500} onChange={e=>setInvoiceDetails({...invoiceDetails,address:e.target.value})}/></label>
          <label>PIN code<input value={invoiceDetails.postalCode} inputMode="numeric" maxLength={6} onChange={e=>setInvoiceDetails({...invoiceDetails,postalCode:e.target.value})}/></label>
          <p>{activePlan?.gstDiscountAvailable ? `With valid GSTIN details, Morrow funds a discount equal to the standard GST charge. Your total is ${rupees(activePlan.amountPaise)} per ${renewalPeriod}, including applicable GST. Coupons cannot be combined with this discount.` : "GST is included in the checkout total."} These details are used for your GST invoice. A GSTIN does not guarantee input tax credit.</p>
        </div>}
      </details>
        </div>
      </div>
      <p className={styles.supportNote}>Your ChatGPT subscription is separate.</p>
      {snapshot?.betaInviteRequired && <button className={styles.textButton} onClick={() => { setInviteAccepted(false); setError(""); }} disabled={Boolean(busy) || checkoutOpen}>Use a different invite code</button>}
      {bulkEmail && <p className={styles.supportNote}>Buying for a team? <a href={`mailto:${bulkEmail}?subject=Morrow%20bulk%20package`}>Contact us</a></p>}
      </fieldset>
    </section>}
    {stage === "account" && <section aria-labelledby="account-title" id="account">
      <h1 id="account-title">Your subscription</h1>
      <p className={styles.subtitle}>{identity?.email}</p>
      {accounts.length > 1 && <label className={styles.field}>Account<select value={selectedAccountId} onChange={(event) => { const account = accounts.find((item) => item.id === event.target.value); if (account) { setSelectedAccountId(account.id); setAudience(account.kind); } }}>
        {accounts.map((account) => <option key={account.id} value={account.id}>{account.name}</option>)}
      </select></label>}
      <div className={styles.accountSummary}>
        <div className={styles.planHeading}><h2>{currentSubscription?.plan.name || "Morrow Personal"}</h2><div className={styles.planControls}><span className={styles.statusPill}>{currentSubscription?.status === "trialing" ? "Trial" : currentSubscription?.status === "trial_canceled" || currentSubscription?.cancel_at_period_end || currentSubscription?.status === "cancelled" ? "Canceled" : currentSubscription && ["halted", "pending", "paused"].includes(currentSubscription.status) ? currentSubscription.status === "pending" ? "Retrying payment" : currentSubscription.status === "halted" ? "Payments stopped" : "Paused" : hasPaidAccess ? "Active" : currentSubscription ? "Expired" : "Not subscribed"}</span><button className={styles.iconButton} aria-label="Refresh subscription" title="Refresh subscription" onClick={refreshAccess} disabled={Boolean(busy)}><ArrowClockwise className={busy === "refresh" ? styles.spin : undefined} size={18} /></button></div></div>
        {subscriptionNeedsRecovery && currentSubscription && <SubscriptionRecoveryGuidance status={currentSubscription.status} hasPaidAccess={hasPaidAccess} />}
        {hasPaidAccess && currentSubscription ? <>
          <p>{currentSubscription.status === "trial_canceled" ? `Trial canceled. Access until ${day(currentSubscription.trial_ends_at || currentSubscription.paid_until)}. You won't be charged.` : currentSubscription.status === "trialing" ? `${Math.max(0, Math.ceil((Date.parse(currentSubscription.trial_ends_at || currentSubscription.paid_until!) - clock) / 86400000))} days left · first charge ${rupees((currentSubscription.plan.charge_amount_paise ?? billingQuote(currentSubscription.plan.amount_paise).total) * currentSubscription.quantity)} on ${day(currentSubscription.trial_ends_at || currentSubscription.paid_until)}.` : currentSubscription.access_source === "admin_coupon" ? "Complimentary access" : `${rupees((currentSubscription.plan.charge_amount_paise ?? billingQuote(currentSubscription.plan.amount_paise).total) * currentSubscription.quantity)} including GST, billed ${currentSubscription.plan.period}`}</p>
          {currentSubscription.status !== "trialing" && <dl className={styles.total}><div><dt>{currentSubscription.status === "trial_canceled" || currentSubscription.cancel_at_period_end || currentSubscription.access_source === "admin_coupon" || subscriptionNeedsRecovery ? "Access until" : "Next charge"}</dt><dd>{day(currentSubscription.paid_until)}</dd></div></dl>}
          {currentSubscription.cancel_at_period_end && <p className={styles.notice}>{currentSubscription.access_source === "admin_coupon" ? "This access does not renew." : "Renewal is cancelled. You can keep using Morrow until this date."}</p>}
          {currentSubscription.razorpay_subscription_id && !currentSubscription.cancel_at_period_end && currentSubscription.status !== "trial_canceled" && <>
            {!confirmCancel ? <button className={styles.quietButton} onClick={() => setConfirmCancel(true)}>{currentSubscription.status === "trialing" ? "Cancel trial" : "Cancel subscription"}</button> : <div className={styles.cancelConfirmation}>
              <h3>{currentSubscription.status === "trialing" ? "Cancel your trial?" : "Cancel renewal?"}</h3><p>You can keep using Morrow until {day(currentSubscription.paid_until)}. {currentSubscription.status === "trialing" ? "If confirmed, your first charge will be canceled." : "If confirmed, there will be no further renewals."}</p>
              <div className={styles.inputRow}><button onClick={() => { setConfirmCancel(false); setCancelRetryId(null); setError(""); }} disabled={Boolean(busy)}>Keep subscription</button><button onClick={() => changeSubscription("cancel", currentSubscription)} disabled={Boolean(busy)}>{busy === "cancel" ? "Cancelling…" : cancelRetryId === currentSubscription.id ? "Retry cancellation" : currentSubscription.status === "trialing" ? "Cancel trial" : "Cancel renewal"}</button></div>
            </div>}
          </>}
        </> : <>{currentSubscription?.paid_until && <p role="status">{currentSubscription.trial_ends_at ? "Your trial has ended" : "Your paid access ended"} on {day(currentSubscription.paid_until)}. {subscriptionNeedsRecovery ? "Recover your existing subscription to use Morrow." : "Renew to use Morrow."} Your files and payment history remain available.</p>}{currentSubscription?.razorpay_subscription_id && !currentSubscription.cancel_at_period_end && !["trial_canceled","cancelled","expired","completed"].includes(currentSubscription.status) && <button className={styles.quietButton} disabled={Boolean(busy)} onClick={() => changeSubscription("cancel", currentSubscription)}>{cancelRetryId === currentSubscription.id ? "Retry cancellation" : "Cancel existing renewal"}</button>}{!subscriptionNeedsRecovery && <><p>{snapshot?.betaInviteRequired ? "Enter your invitation to choose a plan." : "Choose a plan to start using Morrow."}</p><button className={styles.primary} onClick={() => setManageAccount(false)}>{snapshot?.betaInviteRequired ? "Enter invite code" : "Choose a plan"} <ArrowRight /></button></>}</>}
      </div>
      {selectedAccount?.kind === "company" && <details className={styles.management}><summary>Manage team seats</summary>
        <form onSubmit={assignSeat}><label className={styles.field}>Email<input type="email" value={seatEmail} onChange={(event) => setSeatEmail(event.target.value)} placeholder="name@company.com" required /></label><button disabled={Boolean(busy) || !hasPaidAccess}>Assign seat</button></form>
        {accountSeats.map((seat) => <div className={styles.paymentRow} key={seat.id}><span>{seat.email}</span><button onClick={() => removeSeat(seat)} disabled={Boolean(busy)}>Remove</button></div>)}
        {currentSubscription && quantityChangeEligibility(currentSubscription) === "allowed" && <><label className={styles.field}>Seats for next billing period<input type="number" min={2} max={100} value={seats} onChange={(event) => setSeats(Math.max(2, Math.min(100, Number(event.target.value) || 2)))} /></label>
        {currentSubscription && <button onClick={() => changeSubscription("change_quantity", currentSubscription, seats)} disabled={Boolean(busy) || !hasPaidAccess || seats === currentSubscription.quantity}>Update seats</button>}</>}
        {currentSubscription && quantityChangeEligibility(currentSubscription) === "unknown" && <p>Your payment method has not been confirmed. <button onClick={refreshAccess} disabled={Boolean(busy)}>Refresh subscription</button></p>}
        {currentSubscription && quantityChangeEligibility(currentSubscription) === "unsupported" && <p>UPI, eNACH and netbanking subscriptions cannot change their seat count. Contact support if your team needs a different plan.</p>}
        {currentSubscription && quantityChangeEligibility(currentSubscription) === "state" && <p>Seat changes are available when a card subscription is authenticated or active.</p>}
      </details>}
      <section className={styles.management} aria-labelledby="connected-macs-title">
        <h2 id="connected-macs-title">Connected Macs</h2>
        {devicesLoading && <p role="status">Loading your Macs…</p>}
        {devicesError && <p role="alert">{devicesError} <button onClick={() => void loadDevices()} disabled={Boolean(busy)}>Try again</button></p>}
        {!devicesLoading && !devicesError && devices.length === 0 && <p>No Macs are connected to this account.</p>}
        {devices.map(device => <div className={styles.paymentRow} key={device.installationId}>
          <div><strong>{device.deviceName || "Mac"}</strong><p>{device.accountName} · App version {device.appVersion || "unavailable"}</p><p>Last seen {device.lastSeenAt ? day(device.lastSeenAt) : "unavailable"}</p></div>
          <button onClick={() => revokeMac(device)} disabled={Boolean(busy)} aria-label={`Revoke ${device.deviceName || "Mac"}`}>Revoke</button>
        </div>)}
        <p>Sign out everywhere disconnects all your Macs and signs you out of this account in every browser.</p>
        <button className={styles.quietButton} onClick={signOutAll} disabled={Boolean(busy)}>Sign out everywhere</button>
      </section>
      <p className={styles.paymentMethod}><strong>Payment method</strong>Morrow does not store your card or UPI details. Razorpay manages your AutoPay authorization.</p>
      <details className={styles.management} key={selectedAccountId} onToggle={event => { if (event.currentTarget.open && !busy) loadInvoices(); }}><summary>Payments and invoices</summary>
        <BillingDocuments invoices={invoices} receipts={receipts} receiptsStatus={receiptsStatus} loading={busy === "invoices"} busy={Boolean(busy)} onPrint={printInvoice} onReload={loadInvoices} />
        {(snapshot?.payments || []).filter((payment) => subscriptions.some((sub) => sub.id === payment.subscription_id)).length === 0 ? receiptsStatus !== null && invoices.length === 0 && receipts.length === 0 && busy !== "invoices" && <p>No payments yet.{currentSubscription?.status === "trialing" && (currentSubscription.trial_ends_at || currentSubscription.paid_until) ? ` Your first invoice appears after ${day(currentSubscription.trial_ends_at || currentSubscription.paid_until)}.` : ""}</p> :
          <div className={styles.tableScroll}><table className={styles.invoiceTable}><caption className={styles.srOnly}>Morrow payment history</caption><thead><tr><th scope="col">Date</th><th scope="col">Amount</th><th scope="col">Status</th></tr></thead><tbody>{(snapshot?.payments || []).filter((payment) => subscriptions.some((sub) => sub.id === payment.subscription_id)).map((payment) => <tr key={payment.id}><td>{day(payment.paid_at)}<small>Payment ID: {payment.razorpay_payment_id}</small></td><td>{rupees(payment.amount_paise)}</td><td>{payment.status}</td></tr>)}</tbody></table></div>}
      </details>
      <p className={styles.refundNote}>Need a refund? <a href={`mailto:${siteConfig.supportEmail}?subject=Morrow%20refund%20request`}>Contact support</a> within 7 days of your first payment. <a href="/refunds">See the policy</a>.</p>
    </section>}
  </BillingJourney>;
}
