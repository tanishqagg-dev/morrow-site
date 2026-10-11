// The checkout preference is not evidence of the method used for a captured payment.
export function quantityChangeEligibility(subscription: {payment_method?: string | null; status: string}): 'allowed'|'unknown'|'unsupported'|'state' {
  if (!subscription.payment_method || subscription.payment_method === 'unknown') return 'unknown';
  if (subscription.payment_method !== 'card') return 'unsupported';
  return ['authenticated','active'].includes(subscription.status) ? 'allowed' : 'state';
}
