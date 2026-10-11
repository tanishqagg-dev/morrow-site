import {afterEach,expect,it,vi} from 'vitest';
import {parseBillingSnapshot,type BillingSnapshot} from '../lib/billing';
import {pendingPaymentOutcome} from '../lib/subscription-flow';
import {pollConfirmation,selectConfirmingCheckout,listenForReturn} from '../lib/checkout-confirmation';
import {selectOpenCheckout} from '../lib/open-checkout';
import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';import {BillingJourney} from '../components/BillingJourney';
afterEach(()=>vi.useRealTimers());
const now=Date.now();const receipt={desktopRequest:'',subscriptionId:'sub_trial',userId:'user',phase:'confirming' as const,confirmationStartedAt:now};
const open={id:'local',subscriptionId:'sub_trial',requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',accountId:'account',planId:'personal',planName:'Personal',period:'monthly' as const,quantity:1,couponCode:null,paymentMethod:'upi' as const,trial:true,amountPaise:11800,currency:'INR' as const,keyId:'rzp_test_fixture',expiresAt:null,resumable:false,confirming:true as const,confirmedAt:new Date(now).toISOString()};
const snapshot=(status:string)=>({accounts:[],seats:[],payments:[],subscriptions:[{id:'local',account_id:'account',razorpay_subscription_id:'sub_trial',status,paid_until:null}],confirmingCheckouts:status==='created'?[open]:[]}) as unknown as BillingSnapshot;
it('SITE-TRIAL-CLOSED-RACE delayed trialing succeeds after three created polls without closing',async()=>{
 vi.useFakeTimers();const outcomes:string[]=[];let attempt=0;const check=vi.fn(async()=>{const outcome=pendingPaymentOutcome(snapshot(++attempt<=3?'created':'trialing'),'account',receipt,false);outcomes.push(outcome);return outcome==='ready';});const timeout=vi.fn();const stop=pollConfirmation(check,()=>true,now+180000,timeout);await vi.advanceTimersByTimeAsync(20000);expect(outcomes).toEqual(['waiting','waiting','waiting','ready']);expect(timeout).not.toHaveBeenCalled();stop();expect(vi.getTimerCount()).toBe(0);
});
it.each(['cancelled','expired','superseded'])('SITE-TRIAL-CLOSED-RACE confirmed %s closes',status=>{expect(pendingPaymentOutcome(snapshot(status),'account',receipt,false)).toBe('closed');});
it('SITE-TRIAL-CLOSED-RACE a dismissed checkout without payment closes',()=>{expect(pendingPaymentOutcome({...snapshot('created'),confirmingCheckouts:[]},'account',{...receipt,phase:'dismissed'},false)).toBe('closed');});
it('SITE-TRIAL-CLOSED-RACE three minutes stops polling and renders Check again',async()=>{
 vi.useFakeTimers();const check=vi.fn(async()=>false),timeout=vi.fn();pollConfirmation(check,()=>true,now+180000,timeout);await vi.advanceTimersByTimeAsync(180000);expect(timeout).toHaveBeenCalledOnce();const count=check.mock.calls.length;await vi.advanceTimersByTimeAsync(60000);expect(check).toHaveBeenCalledTimes(count);const html=renderToStaticMarkup(createElement(BillingJourney,{stage:'confirming',confirmationTimedOut:true,email:'buyer@example.test',desktopRequest:false,desktopConnected:false,busy:false,error:'',notice:'',signInAvailable:true,canConnect:false,onSignIn(){},onSignOut(){},onRefresh(){},onAccount(){},onBack(){},onConnect(){}}));expect(html).toContain('Still confirming with your bank');expect(html).toContain('Check again');expect(vi.getTimerCount()).toBe(0);
});
it('SITE-TRIAL-CLOSED-RACE reload and OPEN_CHECKOUT retain server confirming details and hide unfinished checkout',()=>{
 const server=parseBillingSnapshot(snapshot('created'));expect(selectConfirmingCheckout(server,null,'account')).toEqual(open);expect(selectConfirmingCheckout({confirmingCheckouts:[]},open,'account')).toEqual(open);expect(selectOpenCheckout({openCheckouts:[open]},open,'account')).toBeNull();
});
it('SITE-TRIAL-CLOSED-RACE refreshes on focus and visible return, with cleanup',()=>{
 const windowTarget=new EventTarget(),documentTarget=Object.assign(new EventTarget(),{visibilityState:'hidden'});const refresh=vi.fn();const stop=listenForReturn(windowTarget,documentTarget,refresh);windowTarget.dispatchEvent(new Event('focus'));documentTarget.dispatchEvent(new Event('visibilitychange'));expect(refresh).toHaveBeenCalledOnce();documentTarget.visibilityState='visible';documentTarget.dispatchEvent(new Event('visibilitychange'));expect(refresh).toHaveBeenCalledTimes(2);stop();windowTarget.dispatchEvent(new Event('focus'));expect(refresh).toHaveBeenCalledTimes(2);
});

it('SITE-TRIAL-CLOSED-RACE Check again starts a fresh three-minute window without checkout',async()=>{
 vi.useFakeTimers();const check=vi.fn(async()=>false),timeout=vi.fn();pollConfirmation(check,()=>true,Date.now()+180000,timeout);await vi.advanceTimersByTimeAsync(180000);expect(timeout).toHaveBeenCalledOnce();pollConfirmation(check,()=>true,Date.now()+180000,timeout);await vi.advanceTimersByTimeAsync(179999);expect(timeout).toHaveBeenCalledOnce();await vi.advanceTimersByTimeAsync(1);expect(timeout).toHaveBeenCalledTimes(2);expect(vi.getTimerCount()).toBe(0);
});
it('SITE-TRIAL-CLOSED-RACE accepts non-confirming null timestamps and missing confirmingCheckouts',()=>{
 const parsed=parseBillingSnapshot({...snapshot('trialing'),confirmingCheckouts:undefined,openCheckouts:[{...open,confirming:false,confirmedAt:null,resumable:true}]});expect(parsed.confirmingCheckouts).toEqual([]);expect(parsed.openCheckouts?.[0].confirmedAt).toBeNull();
});
