import {readFileSync} from 'node:fs';
import {describe,it,expect,vi} from 'vitest';
import {loadCheckoutQuote,parseCheckoutQuote,assertCheckoutPrice} from '../lib/checkout-quote';
const quote={amountPaise:11801,chargeAmountPaise:11801,renewalAmountPaise:23603,baseAmountPaise:10001,gstAmountPaise:1800,currency:'INR',quantity:2,period:'yearly',duration:'first_cycle',merchantPromotion:true,maximumQuantity:100};
describe('RZP-14 server checkout quote',()=>{
 it('preserves exact first, renewal, base and GST values instead of deriving them',()=>expect(parseCheckoutQuote(quote)).toMatchObject(quote));
 it('requires the final checkout price to match the reviewed server quote',()=>{
  const reply={subscriptionId:'sub',keyId:'rzp_test_fixture',email:'qa@example.test',name:'QA',trialEndsAt:null,trialAuthorizationExpiresAt:null,amountPaise:quote.amountPaise};
  expect(()=>assertCheckoutPrice(reply,parseCheckoutQuote(quote))).not.toThrow();
  expect(()=>assertCheckoutPrice({...reply,amountPaise:quote.amountPaise+1},parseCheckoutQuote(quote))).toThrow('price changed');
 });
 it('saves the selected invoice profile before quoting the public plan and quantity',async()=>{
  const calls:object[]=[];const request=vi.fn(async(body:object)=>{calls.push(body);return (body as {action:string}).action==='quote_checkout'?quote:{saved:true};});
  expect(await loadCheckoutQuote(request,{accountId:'account',planId:'public-plan',quantity:2,couponCode:'INTRO'},{kind:'consumer',stateCode:'07'},()=>true)).toMatchObject(quote);
  expect(calls).toEqual([{action:'save_invoice_profile',accountId:'account',invoiceProfile:{kind:'consumer',stateCode:'07'}},{action:'quote_checkout',accountId:'account',planId:'public-plan',quantity:2,couponCode:'INTRO'}]);
 });
 it('does not quote a stale account after saving its profile',async()=>{
  let current=true;const request=vi.fn(async()=>{current=false;return {saved:true};});
  expect(await loadCheckoutQuote(request,{accountId:'old',planId:'plan',quantity:1},{kind:'consumer',stateCode:'07'},()=>current)).toBeNull();expect(request).toHaveBeenCalledOnce();
 });
 it('rejects unreadable amounts and prevents checkout from using client price math',()=>{
  expect(()=>parseCheckoutQuote({...quote,amountPaise:1.5})).toThrow();
  const source=readFileSync(new URL('../components/BillingPortal.tsx',import.meta.url),'utf8');
  const plan=source.slice(source.indexOf('  const couponContext'),source.indexOf('  const accounts ='));
  expect(plan).not.toContain('billingQuote(');expect(plan).not.toContain('firstPaymentQuote(');expect(plan).not.toContain('18 / 118');expect(source).not.toContain('monthlyEquivalent');
 });
});
