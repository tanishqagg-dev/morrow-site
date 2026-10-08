import type { BillingSnapshot } from "./billing";

export type SubscriptionStage = "loading" | "sign-in" | "invite" | "plan" | "confirming" | "ready" | "account";

export function paymentPollDelay(attempt: number) {
  return Math.min(60_000, 5_000 * 2 ** Math.min(attempt, 4));
}

export function subscriptionStage(input: {
  loaded: boolean; signedIn: boolean; snapshotLoaded: boolean;
  hasPaidAccess: boolean; paymentPending: boolean; manageAccount: boolean;
  inviteRequired?: boolean; inviteAccepted?: boolean;
}): SubscriptionStage {
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
  return subscriptions.filter((item) => item.paid_until && Date.parse(item.paid_until) > now)
    .sort((a, b) => Date.parse(b.paid_until!) - Date.parse(a.paid_until!))[0]
    || subscriptions.find((item) => !["cancelled", "expired", "completed"].includes(item.status))
    || subscriptions[0];
}
