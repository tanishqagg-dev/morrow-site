import {BillingError} from './billing';
export type CheckoutExpiryState = 'retry';
// Expiration is handled by the server. Each user action sends exactly one checkout.
export async function requestCheckoutOnce<T>(send:()=>Promise<T>,current:()=>boolean,state:(value:CheckoutExpiryState)=>void):Promise<T|null> {
 if(!current())return null;
 try {const result=await send();return current()?result:null;}
 catch(error){
  if(!current())return null;
  if(!(error instanceof BillingError) || error.code!=='CHECKOUT_EXPIRING')throw error;
  state('retry');return null;
 }
}
