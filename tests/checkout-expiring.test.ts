import {afterEach,expect,it,vi} from 'vitest';
import {BillingError,parseBillingSnapshot,paidSeatForAccount} from '../lib/billing';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
import {CheckoutExpiring} from '../components/CheckoutExpiring';
import {requestCheckoutOnce} from '../lib/checkout-expiring';
import {pendingPaymentOutcome,currentSubscriptionForAccount} from '../lib/subscription-flow';
import {subscriptionStatusLabel} from '../lib/subscription-label';
afterEach(()=>vi.useRealTimers());
it('RACE-03b follow-up CHECKOUT_EXPIRING makes one request and schedules no retries or polling timers',async()=>{
 vi.useFakeTimers();const send=vi.fn().mockRejectedValue(new BillingError('Expiring','CHECKOUT_EXPIRING',5)),state=vi.fn();expect(await requestCheckoutOnce(send,()=>true,state)).toBeNull();expect(send).toHaveBeenCalledOnce();expect(state).toHaveBeenCalledWith('retry');expect(vi.getTimerCount()).toBe(0);await vi.advanceTimersByTimeAsync(3600000);expect(send).toHaveBeenCalledOnce();
});
it('RACE-03b follow-up manual Retry calls checkout once and normal responses proceed',async()=>{
 vi.useFakeTimers();const send=vi.fn().mockResolvedValue({subscriptionId:'fresh'});expect(await requestCheckoutOnce(send,()=>true,vi.fn())).toEqual({subscriptionId:'fresh'});expect(send).toHaveBeenCalledOnce();expect(vi.getTimerCount()).toBe(0);
});
it('RACE-03b follow-up fallback shows a single Retry button',()=>{
 const html=renderToStaticMarkup(createElement(CheckoutExpiring,{state:'retry',busy:false,onRetry(){}}));expect(html).toContain('Finishing up your last checkout…');expect(html).toMatch(/<button[^>]*>Retry<\/button>/);expect((html.match(/<button/g)||[])).toHaveLength(1);
});
it('RACE-03b follow-up superseded subscriptions parse and render as closed without access or recovery controls',()=>{
 const snapshot=parseBillingSnapshot({accounts:[],seats:[{account_id:'account',email:'buyer@example.test',licenseStatus:'active'}],payments:[],subscriptions:[{id:'old',account_id:'account',razorpay_subscription_id:'sub_old',status:'superseded',paid_until:new Date(Date.now()+86400000).toISOString(),cancel_at_period_end:false}]});expect(snapshot.subscriptions[0].status).toBe('superseded');expect(subscriptionStatusLabel(currentSubscriptionForAccount(snapshot,'account'),true)).toBe('Closed');expect(paidSeatForAccount(snapshot,'account','buyer@example.test')).toBeUndefined();expect(pendingPaymentOutcome(snapshot,'account',{desktopRequest:'',subscriptionId:'sub_old',userId:'user'},true)).toBe('failed');expect(pendingPaymentOutcome(snapshot,'account',{desktopRequest:'',subscriptionId:'sub_old'},true)).toBe('failed');
});
