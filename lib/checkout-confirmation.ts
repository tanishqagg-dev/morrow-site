import type {BillingSnapshot,OpenCheckout} from './billing';
export function selectConfirmingCheckout(snapshot:Pick<BillingSnapshot,'confirmingCheckouts'>|null,conflict:OpenCheckout|null,accountId:string) {
 return snapshot?.confirmingCheckouts?.find(item=>item.accountId===accountId) || (conflict?.confirming && conflict.accountId===accountId?conflict:null);
}
export function pollConfirmation(check:()=>Promise<boolean>,current:()=>boolean,deadline:number,onTimeout:()=>void) {
 let stopped=false,attempt=0,timer:ReturnType<typeof setTimeout>;
 const stop=()=>{stopped=true;clearTimeout(timer);clearTimeout(limit);};
 const limit=setTimeout(()=>{if(!stopped && current())onTimeout();stop();},Math.max(0,deadline-Date.now()));
 const tick=async()=>{
  if(stopped || !current()){stop();return;}
  try {if(await check()){stop();return;}}catch{/* Retry snapshots without replaying payment. */}
  if(!stopped && current())timer=setTimeout(tick,Math.min(5000,1500*2**++attempt));
  else stop();
 };
 timer=setTimeout(tick,1500);return stop;
}
export function listenForReturn(windowTarget:EventTarget,documentTarget:EventTarget & {visibilityState:string},refresh:()=>void) {
 const visible=()=>{if(documentTarget.visibilityState==='visible')refresh();};
 windowTarget.addEventListener('focus',refresh);documentTarget.addEventListener('visibilitychange',visible);
 return ()=>{windowTarget.removeEventListener('focus',refresh);documentTarget.removeEventListener('visibilitychange',visible);};
}
