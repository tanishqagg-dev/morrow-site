import type {BillingSnapshot,OpenCheckout,PendingPayment} from './billing';
import {abandonCheckout} from './checkout-recovery';
export function selectOpenCheckout(snapshot:{openCheckouts?:OpenCheckout[]}|null,conflict:OpenCheckout|null,accountId:string):OpenCheckout|null {
 return snapshot?.openCheckouts?.find(item=>item.accountId===accountId) || (conflict?.accountId===accountId?conflict:null);
}
export function openCheckoutReceipt(checkout:OpenCheckout,account:{billing_email:string;name:string;invoice_recipient_name?:string|null},userId:string,desktopRequest:string):PendingPayment {
 if(!checkout.resumable || !checkout.keyId || (checkout.expiresAt && Date.parse(checkout.expiresAt)<=Date.now()+60_000))throw new Error('This checkout expired at Razorpay. Change plan to start again.');
 return {subscriptionId:checkout.subscriptionId,requestId:checkout.requestId,userId,desktopRequest,startedAt:Date.now(),expiresAt:Date.now()+600_000,checkout:{priceConfirmed:true,preparedAt:Date.now(),reply:{subscriptionId:checkout.subscriptionId,keyId:checkout.keyId,amountPaise:checkout.amountPaise,email:account.billing_email,name:account.invoice_recipient_name || account.name,paymentMethod:checkout.paymentMethod || undefined,trialEndsAt:null,trialAuthorizationExpiresAt:checkout.expiresAt}}};
}
export async function changeOpenCheckout(checkout:OpenCheckout,send:(body:object)=>Promise<unknown>,clear:()=>void,refresh:()=>Promise<{openCheckouts?:OpenCheckout[];subscriptions?:BillingSnapshot['subscriptions']}|undefined>,retry:()=>unknown,current:()=>boolean) {
 await abandonCheckout(()=>send({action:'abandon_checkout',subscriptionId:checkout.subscriptionId}),clear,current);
 if(!current())return;
 const latest=await refresh();
 if(!current() || !latest)return;
 if(latest.openCheckouts?.some(item=>item.accountId===checkout.accountId))throw new Error('Your previous checkout is still being checked. Refresh its status before starting again.');
 if(latest.subscriptions?.some(item=>item.account_id===checkout.accountId && ['authenticated','active','trialing'].includes(item.status)))return;
 await retry();
}
