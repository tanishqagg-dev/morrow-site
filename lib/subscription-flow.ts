import type { BillingSnapshot, CheckoutReply, PendingPayment } from "./billing";

export type SubscriptionStage = "loading" | "unavailable" | "sign-in" | "invite" | "plan" | "confirming" | "payment-recovery" | "ready" | "account";

export function paymentPollDelay(attempt: number) {
  return Math.min(60_000, 5_000 * 2 ** Math.min(attempt, 4));
}

export function subscriptionStage(input: {
  loaded: boolean; signedIn: boolean; snapshotLoaded: boolean;
  hasPaidAccess: boolean; paymentPending: boolean; manageAccount: boolean;
  inviteRequired?: boolean; inviteAccepted?: boolean;
  loadFailed?: boolean; paymentRecovery?: boolean;
}): SubscriptionStage {
  if (input.loaded && input.signedIn && input.paymentRecovery && !input.hasPaidAccess) return "payment-recovery";
  if (input.loadFailed && (!input.loaded || (input.signedIn && !input.snapshotLoaded))) return "unavailable";
  if (!input.loaded) return "loading";
  if (!input.signedIn) return "sign-in";
  if (!input.snapshotLoaded) return "loading";
  if (input.manageAccount) return "account";
  if (input.hasPaidAccess) return "ready";
  if (input.paymentPending) return "confirming";
  if (input.inviteRequired && !input.inviteAccepted) return "invite";
  return "plan";
}

export function currentSubscriptionForAccount(snapshot: BillingSnapshot | null, accountId: string, now = Date.now()) {
  const subscriptions = (snapshot?.subscriptions || []).filter((item) => item.account_id === accountId);
  // A later, abandoned checkout must not hide an already paid subscription.
  return subscriptions.filter((item) => item.status !== "superseded" && item.paid_until && Date.parse(item.paid_until) > now)
    .sort((a, b) => Date.parse(b.paid_until!) - Date.parse(a.paid_until!))[0]
    || subscriptions.find((item) => !["cancelled", "expired", "completed", "superseded"].includes(item.status))
    || subscriptions[0];
}

// Older servers do not expose Razorpay's 30-minute mandate authorization deadline.
export function trialAuthorizationExpired(reply: CheckoutReply, preparedAt: number, now = Date.now()) {
  const expiresAt = reply.trialAuthorizationExpiresAt
    ? Date.parse(reply.trialAuthorizationExpiresAt) : preparedAt + 25 * 60_000;
  return !Number.isFinite(expiresAt) || now >= expiresAt;
}

export const PAYMENT_CONFIRMATION_TIMEOUT_MS = 10 * 60_000;
export function pendingPaymentOutcome(snapshot: BillingSnapshot | null | undefined, accountId: string, receipt: PendingPayment, hasAccess: boolean, now = Date.now()): "ready" | "waiting" | "failed" | "uncertain" | "closed" {
  const subscription = snapshot?.subscriptions.find(item => item.account_id === accountId &&
    (item.razorpay_subscription_id === receipt.subscriptionId || item.id === receipt.subscriptionId));
  if (subscription?.status === "superseded") return "failed";
  if (hasAccess && !receipt.userId) return "ready";
  if (receipt.userId) {
    // Access from another subscription is not evidence about this checkout.
    if (subscription && hasAccess && subscription.paid_until && Date.parse(subscription.paid_until) > now) return "ready";
    const hasPayment = subscription && snapshot?.payments?.some(payment => payment.subscription_id === subscription.id && payment.status !== "failed");
    if (subscription && !hasPayment && !subscription.paid_until && ["created", "cancelled", "expired"].includes(subscription.status)) return "closed";
    // A user-bound checkout is retained until abandon_checkout verifies its cancellation.
    if (!receipt.expiresAt || now >= receipt.expiresAt) return "uncertain";
    return "waiting";
  }
  if (subscription && ["cancelled", "trial_canceled", "expired", "halted", "pending", "completed", "paused"].includes(subscription.status)) return "failed";
  // Legacy receipts without a timestamp cannot safely hold a customer in confirmation.
  if (!receipt.startedAt || now - receipt.startedAt >= PAYMENT_CONFIRMATION_TIMEOUT_MS) return "failed";
  return "waiting";
}
