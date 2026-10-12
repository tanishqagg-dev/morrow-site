import type {BillingSubscription} from './billing';
export function subscriptionStatusLabel(subscription:Pick<BillingSubscription,'status'|'cancel_at_period_end'|'paid_until'|'trial_ends_at'>|undefined,hasAccess:boolean,now=Date.now()) {
 if(subscription?.status==='superseded')return 'Closed';
 if(subscription?.status==='trialing') {
  if(!hasAccess || !subscription.paid_until || Date.parse(subscription.paid_until)<=now)return 'Expired';
  const trialDeadline=Date.parse(subscription.trial_ends_at || subscription.paid_until);
  return trialDeadline>now?'Trial':'Active';
 }
 if(subscription?.status==='trial_canceled' || subscription?.cancel_at_period_end || subscription?.status==='cancelled')return 'Canceled';
 if(subscription?.status==='pending')return 'Retrying payment';
 if(subscription?.status==='halted')return 'Payments stopped';
 if(subscription?.status==='paused')return 'Paused';
 return hasAccess?'Active':subscription?'Expired':'Not subscribed';
}
