import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe,it,expect,vi} from 'vitest';
import {pendingPaymentOutcome} from '../lib/subscription-flow';
import {abandonCheckout} from '../lib/checkout-recovery';
import {CheckoutRecovery} from '../components/CheckoutRecovery';
import {parsePendingPayment,type BillingSnapshot} from '../lib/billing';
const now=Date.now();const receipt={desktopRequest:'',subscriptionId:'sub-test',userId:'user',expiresAt:now-1};
function snapshot(status:string,payments:unknown[]=[]) {return {subscriptions:[{id:'local',account_id:'account',razorpay_subscription_id:'sub-test',status}],payments} as BillingSnapshot;}
describe('BROWSER-03 closed checkout recovery',()=>{
 it('resolves an expired marker through a reconciled created subscription without payment',()=>expect(pendingPaymentOutcome(snapshot('created'),'account',receipt,false,now)).toBe('closed'));
 it('persists the original checkout reply for same-subscription Resume after reload',()=>{
  const saved={...receipt,requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',checkout:{preparedAt:now,reply:{subscriptionId:'sub-test',keyId:'rzp_test_fixture',email:'qa@example.test',name:'QA',paymentMethod:'upi',trialEndsAt:null,trialAuthorizationExpiresAt:null}}};
  expect(parsePendingPayment(saved)?.checkout).toEqual(saved.checkout);
  expect(parsePendingPayment({...saved,subscriptionId:'different'})).toBeNull();
 });
 it('retains uncertainty when payment evidence exists or the snapshot is unavailable',()=>{
  expect(pendingPaymentOutcome(snapshot('created',[{subscription_id:'local',status:'captured'}]),'account',receipt,false,now)).toBe('uncertain');
  expect(pendingPaymentOutcome(null,'account',receipt,false,now)).toBe('uncertain');
 });
 it('never grants access from authenticated or active state alone',()=>{
  for(const status of ['authenticated','active']) expect(pendingPaymentOutcome(snapshot(status),'account',receipt,false,now)).toBe('uncertain');
 });
 it('clears checkout identity only after verified abandonment',async()=>{
  const clear=vi.fn(); const request=vi.fn(async()=>({abandoned:true}));
  await abandonCheckout(request,clear,()=>true);expect(clear).toHaveBeenCalledOnce();
  for(const response of [{abandoned:false},{}]){clear.mockClear();await expect(abandonCheckout(async()=>response,clear,()=>true)).rejects.toThrow();expect(clear).not.toHaveBeenCalled();}
  clear.mockClear();await expect(abandonCheckout(async()=>{throw new Error('CHECKOUT_PAYMENT_PENDING')},clear,()=>true)).rejects.toThrow();expect(clear).not.toHaveBeenCalled();
 });
 it('does not clear a different account after abandonment resolves',async()=>{
  const clear=vi.fn();await abandonCheckout(async()=>({abandoned:true}),clear,()=>false);expect(clear).not.toHaveBeenCalled();
 });
 it('offers Resume and Change plan after verified closure, and retry/method actions after failure',()=>{
  const props={busy:false,canResume:true,onResume(){},onChangePlan(){},onRefresh(){}};
  const closed=renderToStaticMarkup(createElement(CheckoutRecovery,{...props,state:'closed'}));expect(closed).toContain('Checkout closed. Nothing was charged.');expect(closed).toContain('Resume');expect(closed).toContain('Change plan');
  const failed=renderToStaticMarkup(createElement(CheckoutRecovery,{...props,state:'failed',reason:'Bank declined this payment'}));expect(failed).toContain('Bank declined');expect(failed).toContain('Try again');expect(failed).toContain('Use another method');
  const uncertain=renderToStaticMarkup(createElement(CheckoutRecovery,{...props,state:'uncertain'}));expect(uncertain).not.toContain('Nothing was charged');expect(uncertain).toContain('Check payment status');expect(uncertain).not.toContain('Checking your payment…');
 });
});
