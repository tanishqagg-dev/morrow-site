export async function abandonCheckout(request:()=>Promise<unknown>, clear:()=>void, isCurrent:()=>boolean) {
  const result=await request();
  if (!isCurrent()) return;
  if ((result as {abandoned?:boolean}|null)?.abandoned !== true) throw new Error("We could not confirm checkout was cancelled. Check payment status before changing your plan.");
  clear();
}
export type CheckoutRecoveryState = 'closed'|'failed'|'uncertain';
