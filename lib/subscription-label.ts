import type {BillingSubscription} from './billing';
export function subscriptionStatusLabel(subscription:Pick<BillingSubscription,'status'|'cancel_at_period_end'>|undefined,hasAccess:boolean) {
 if(subscription?.status==='superseded')return 'Closed';
 if(subscription?.status==='trialing')return 'Trial';
 if(subscription?.status==='trial_canceled' || subscription?.cancel_at_period_end || subscription?.status==='cancelled')return 'Canceled';
 if(subscription?.status==='pending')return 'Retrying payment';
 if(subscription?.status==='halted')return 'Payments stopped';
 if(subscription?.status==='paused')return 'Paused';
 return hasAccess?'Active':subscription?'Expired':'Not subscribed';
}
