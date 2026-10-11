import {BillingError} from './billing';
export type CheckoutExpiryState = 'waiting' | 'timeout';
// The server owns expiration. Retrying never cancels a provider subscription.
export async function waitForCheckout<T>(send:()=>Promise<T>,current:()=>boolean,state:(value:CheckoutExpiryState)=>void):Promise<T|null> {
 const deadline=Date.now()+90_000;
 while(current() && Date.now()<deadline) {
  let timer:ReturnType<typeof setTimeout>|undefined;
  try {
   const result=await Promise.race([send(),new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),Math.max(0,deadline-Date.now()));})]);
   if(!current())return null;
   if(result===null){state('timeout');return null;}
   return result;
  } catch(error) {
   if(!current())return null;
   if(!(error instanceof BillingError) || error.code!=='CHECKOUT_EXPIRING')throw error;
   state('waiting');
   const seconds=typeof error.retryAfter==='number' && Number.isFinite(error.retryAfter) && error.retryAfter>0 ? error.retryAfter : 5;
   await new Promise(resolve=>setTimeout(resolve,Math.min(seconds*1000,Math.max(0,deadline-Date.now()))));
  } finally {if(timer!==undefined)clearTimeout(timer);}
 }
 if(current())state('timeout');
 return null;
}
