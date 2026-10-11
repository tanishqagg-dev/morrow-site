export type CheckoutMethod = 'upi'|'card';
export function checkoutMethods(coupon:{duration?:string;paymentMethods?:CheckoutMethod[]}|null):CheckoutMethod[] {
  return coupon?.duration==='first_cycle' ? [...new Set(coupon.paymentMethods || [])].filter(method=>method==='upi'||method==='card') : ['upi','card'];
}
export function checkoutMethodConfig(method?:CheckoutMethod, selected?:CheckoutMethod) {
  if (!method || (selected && method!==selected)) throw new Error("Razorpay's payment method could not be confirmed. Check payment status or cancel this checkout before changing methods.");
  return {display:{blocks:{selected:{name:method==='upi'?'Pay with UPI':'Pay with credit or debit card',instruments:[{method}]}},sequence:['block.selected'],preferences:{show_default_blocks:false}}};
}
