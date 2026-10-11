import {afterEach,expect,it,vi} from 'vitest';
import {BillingError} from '../lib/billing';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {CheckoutExpiring} from '../components/CheckoutExpiring';
import {waitForCheckout} from '../lib/checkout-expiring';
afterEach(()=>vi.useRealTimers());
it('RACE-03b retries the same request after the server delay and returns a fresh checkout',async()=>{
 vi.useFakeTimers();const body={action:'checkout',requestId:'same'};const send=vi.fn().mockRejectedValueOnce(new BillingError('Expiring','CHECKOUT_EXPIRING',2)).mockResolvedValue({subscriptionId:'fresh'});const state=vi.fn();
 const pending=waitForCheckout(()=>send(body),()=>true,state);await vi.advanceTimersByTimeAsync(1999);expect(send).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(1);expect(await pending).toEqual({subscriptionId:'fresh'});expect(send.mock.calls.every(([request])=>request===body)).toBe(true);expect(state).toHaveBeenCalledWith('waiting');
});
it('RACE-03b defaults to five seconds and stops at 90 seconds without cancellation',async()=>{
 vi.useFakeTimers();const send=vi.fn().mockRejectedValue(new BillingError('Expiring','CHECKOUT_EXPIRING'));const state=vi.fn();const pending=waitForCheckout(send,()=>true,state);await vi.advanceTimersByTimeAsync(4999);expect(send).toHaveBeenCalledTimes(1);await vi.advanceTimersByTimeAsync(85001);expect(await pending).toBeNull();expect(send).toHaveBeenCalledTimes(18);expect(state).toHaveBeenLastCalledWith('timeout');expect(vi.getTimerCount()).toBe(0);
});
it('RACE-03b surfaces an authorized trial for snapshot reconciliation',async()=>{
 const send=vi.fn().mockRejectedValue(new BillingError('Active','TRIAL_ALREADY_ACTIVE'));await expect(waitForCheckout(send,()=>true,vi.fn())).rejects.toMatchObject({code:'TRIAL_ALREADY_ACTIVE'});expect(send).toHaveBeenCalledOnce();
});
it('RACE-03b stops retries after an account change',async()=>{
 vi.useFakeTimers();let current=true;const send=vi.fn().mockRejectedValue(new BillingError('Expiring','CHECKOUT_EXPIRING'));const pending=waitForCheckout(send,()=>current,vi.fn());await vi.advanceTimersByTimeAsync(0);current=false;await vi.advanceTimersByTimeAsync(5000);expect(await pending).toBeNull();expect(send).toHaveBeenCalledOnce();
});

it('RACE-03b shows a calm waiting state and one Retry after the deadline',()=>{
 const waiting=renderToStaticMarkup(createElement(CheckoutExpiring,{state:'waiting',busy:true,onRetry(){}}));expect(waiting).toContain('Finishing up your last checkout…');expect(waiting).not.toContain('<button');
 const timeout=renderToStaticMarkup(createElement(CheckoutExpiring,{state:'timeout',busy:false,onRetry(){}}));expect(timeout).toContain('Your last checkout is still being checked');expect(timeout).toMatch(/<button[^>]*>Retry<\/button>/);
});
it('RACE-03b bounds a stalled retry response at the same 90-second deadline',async()=>{
 vi.useFakeTimers();const send=vi.fn().mockRejectedValueOnce(new BillingError('Expiring','CHECKOUT_EXPIRING')).mockImplementation(()=>new Promise(()=>{}));const state=vi.fn();const pending=waitForCheckout(send,()=>true,state);await vi.advanceTimersByTimeAsync(90000);expect(await pending).toBeNull();expect(send).toHaveBeenCalledTimes(2);expect(state).toHaveBeenLastCalledWith('timeout');expect(vi.getTimerCount()).toBe(0);
});
