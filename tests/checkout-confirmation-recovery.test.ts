import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BillingJourney } from '../components/BillingJourney';
import {waitForCheckout} from '../lib/checkout-expiring';
import {assertCheckoutPrice} from '../lib/checkout-quote';
import {checkoutMethods,checkoutMethodConfig} from '../lib/checkout-method';
import { invoiceProfileForCheckout, invoiceRecipientNameForCheckout } from '../lib/invoice-profile';
import { BillingError, parseCheckoutReply, parsePendingPayment, type BillingSnapshot } from '../lib/billing';
import { trialAuthorizationExpired, pendingPaymentOutcome, PAYMENT_CONFIRMATION_TIMEOUT_MS, subscriptionStage } from '../lib/subscription-flow';
const source = readFileSync(new URL('../components/BillingPortal.tsx', import.meta.url), 'utf8');
const now = Date.now();
const reply = () => parseCheckoutReply({ subscriptionId: 'sub-new', keyId: 'key', amountPaise:11800, paymentMethod:'upi', email: 'me@example.com', name: 'Me', trialEndsAt: new Date(now + 7 * 86400_000).toISOString() });
function execute(start: string, end: string, suffix: string, bindings: Record<string, unknown>) {
  const begin = source.indexOf(start);
  const code = ts.transpileModule(source.slice(begin, source.indexOf(end, begin)) + suffix, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return new Function(...Object.keys(bindings), code)(...Object.values(bindings));
}
function checkoutFlow(prepared = reply(), preparedAt = now, overrides: Record<string, unknown> = {}) {
  let pending: Promise<void>;
  const open = vi.fn();
  const bindings = {
    waitForCheckout, expiringRequest:{current:null}, setCheckoutExpiry:vi.fn(), refresh:vi.fn(async()=>snapshot('active')),
    pendingReceipt: {current:null}, pendingCheck: {current:vi.fn()}, checkoutFailure:{current:""}, setCheckoutRecovery:vi.fn(), setPaymentPending:vi.fn(),
    checkoutLock: { current: false }, paymentPending: false, hasPaidAccess: false, signedIn: true,
    selectedAccount: { id: 'account', kind: 'personal' }, activeUserId: { current: 'user' },
    invoiceRecipientName: "QA Buyer", invoiceRecipientNameForCheckout, businessInvoice: false, invoiceDetails: { stateCode: "07" }, invoiceProfileForCheckout, selectedAccountRef: { current: "account" }, appliedCoupon: null, snapshot: { betaInviteRequired: false },
    inviteAccepted: true, activePlan: { id: 'plan' }, audience: 'personal', seats: 1, period: 'monthly',
    assertCheckoutPrice, serverQuote:{amountPaise:11800,quantity:1}, billedSeats:1, checkoutMethodConfig, availablePaymentMethods:checkoutMethods(null), couponCode: '', inviteCode: '', couponPaymentMethod: 'upi', trialEligible: true, desktopRequest: '', checkoutContext: 'context',
    prepared, preparedCheckout: { preparedAt, requestId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, trialAuthorizationExpired, PAYMENT_CONFIRMATION_TIMEOUT_MS, parseCheckoutReply, BillingError,
    crypto: { randomUUID: vi.fn(() => `request-${Math.random()}`) }, authToken: async () => 'token',
    billingRequest: vi.fn(async (_endpoint, payload) => payload.action === 'checkout' ? reply() : {}),
    rememberPendingPayment: vi.fn(), loadRazorpayCheckout: async () => {}, setPreparedCheckout: vi.fn(), setNotice: vi.fn(), setCheckoutOpen: vi.fn(), setError: vi.fn(),
    setTrialDeclined: vi.fn(), window: { Razorpay: class { open = open; on() {} } },
    ...overrides,
    run: (_name: string, work: () => Promise<void>) => { pending = work(); return pending.catch(() => {}); },
  };
  const start = execute('  const startCheckout = (resume = false) => {', '  const forgetDesktop =', '\nreturn startCheckout;', bindings);
  return { ...bindings, open, start: (resume = false) => { start(resume); return pending!; } };
}
const receipt = { desktopRequest: '', subscriptionId: 'sub-provider', startedAt: now };
const snapshot = (status: string, accountId = 'account') => ({ subscriptions: [{ id: 'local', razorpay_subscription_id: 'sub-provider', account_id: accountId, status }] }) as BillingSnapshot;
function confirmationFlow(status = 'expired', startedAt = now) {
  const saved = { ...receipt, startedAt };
  const bindings = {
    pendingCheck: { current: async () => false }, activeUserId: { current: 'user' }, selectedAccountId: 'account',
    selectedAccountRef: { current: 'account' }, identityRef: { current: { email: 'me@example.com' } },
    pendingReceipt: { current: saved as typeof saved | null }, pendingPaymentOutcome,
    refresh: vi.fn(async () => snapshot(status)), paidSeatForAccount: vi.fn(() => undefined as object | undefined),
    rememberPendingPayment: vi.fn(), setPreparedCheckout: vi.fn(), setError: vi.fn(), setNotice: vi.fn(), setPaymentRecovery: vi.fn(), setPaymentPending:vi.fn(), setCheckoutRecovery:vi.fn(), checkoutFailure:{current:""},
    paymentDesktopRequest: '', desktopRequest: '', connectAfterPayment: vi.fn(),
  };
  execute('  pendingCheck.current = async () => {', '  useEffect(() => {', '', bindings);
  return bindings;
}
describe('trial authorization deadline', () => {
  it('keeps checkout unlocked when the provider confirms during open', async () => {
    const flow = checkoutFlow();
    flow.window.Razorpay = class {
      constructor(private options: { handler: (response: unknown) => void }) {}
      open() { this.options.handler({ razorpay_subscription_id: 'sub-new' }); }
      on() {}
    } as unknown as typeof flow.window.Razorpay;
    await flow.start();
    expect(flow.rememberPendingPayment).toHaveBeenCalledWith(true, 'sub-new');
    expect(flow.setCheckoutOpen).toHaveBeenLastCalledWith(false);
  });

  it('saves authorization before open and reconciles dismissal without the success handler', async () => {
    const flow = checkoutFlow();
    flow.window.Razorpay = class {
      constructor(private options: { modal: {ondismiss: () => void} }) {}
      open() {
        expect(flow.rememberPendingPayment).toHaveBeenCalledWith(true, 'sub-new', expect.objectContaining({userId: 'user', requestId: expect.any(String), expiresAt: expect.any(Number)}));
        this.options.modal.ondismiss();
      }
      on() {}
    } as unknown as typeof flow.window.Razorpay;
    await flow.start();
    expect(flow.setNotice).toHaveBeenCalledWith(expect.stringContaining('Checking your payment'));
    expect(flow.rememberPendingPayment).not.toHaveBeenCalledWith(false);
    expect(flow.billingRequest.mock.calls.some(([, body]) => body.action === 'confirm_checkout')).toBe(false);
  });

  it('uses the server deadline rather than the seven-day first-charge date', () => {
    const checkout = { ...reply(), trialAuthorizationExpiresAt: new Date(now + 1000).toISOString() };
    expect(trialAuthorizationExpired(checkout, now - 31 * 60_000, now)).toBe(false);
    expect(trialAuthorizationExpired(checkout, now, now + 1000)).toBe(true);
  });
  it('falls back to 25 minutes when older servers omit the deadline', () => {
    expect(trialAuthorizationExpired(reply(), now, now + 25 * 60_000 - 1)).toBe(false);
    expect(trialAuthorizationExpired(reply(), now, now + 25 * 60_000)).toBe(true);
  });
  it('drops an expired prepared checkout and fetches a new date without opening the old mandate', async () => {
    const flow = checkoutFlow(reply(), now - 31 * 60_000);
    await flow.start();
    expect(flow.open).not.toHaveBeenCalled();
    expect(flow.billingRequest.mock.calls.filter(([, body]) => body.action === 'checkout')).toHaveLength(1);
    expect(flow.setPreparedCheckout).toHaveBeenCalledWith(null);
    expect(flow.setPreparedCheckout.mock.lastCall?.[0]).toMatchObject({ reply: { subscriptionId: 'sub-new' }, preparedAt: expect.any(Number) });
  });
  it('refreshes a cached checkout at its explicit authorization deadline', async () => {
    const flow = checkoutFlow({ ...reply(), trialAuthorizationExpiresAt: new Date(now - 1).toISOString() });
    await flow.start();
    expect(flow.open).not.toHaveBeenCalled();
    expect(flow.billingRequest.mock.calls.filter(([, body]) => body.action === 'checkout')).toHaveLength(1);
  });
  it('opens a prepared authorization while its deadline remains valid', async () => {
    const flow = checkoutFlow(); await flow.start();
    expect(flow.open).toHaveBeenCalledOnce();
    expect(flow.billingRequest.mock.calls.filter(([, body]) => body.action === 'checkout')).toHaveLength(0);
  });
  it('retries TRIAL_CHECKOUT_EXPIRED once with a fresh request id', async () => {
    const flow = checkoutFlow(reply(), 0);
    flow.billingRequest.mockImplementation(async (_endpoint, body) => {
      if (body.action !== 'checkout') return {};
      if (flow.billingRequest.mock.calls.filter(([, item]) => item.action === 'checkout').length === 1) throw new BillingError('Expired', 'TRIAL_CHECKOUT_EXPIRED');
      return reply();
    });
    await flow.start();
    const requests = flow.billingRequest.mock.calls.filter(([, body]) => body.action === 'checkout');
    expect(requests).toHaveLength(2);
    expect(requests[0][1].requestId).not.toEqual(requests[1][1].requestId);
    expect(flow.open).not.toHaveBeenCalled();
  });
  it('does not retry indefinitely or replay ambiguous failures', async () => {
    for (const error of [new BillingError('Expired', 'TRIAL_CHECKOUT_EXPIRED'), new Error('Offline')]) {
      const flow = checkoutFlow(reply(), 0);
      flow.billingRequest.mockImplementation(async (_endpoint, body) => { if (body.action === 'checkout') throw error; return {}; });
      await expect(flow.start()).rejects.toThrow(error instanceof BillingError ? 'expired again' : 'Offline');
      expect(flow.billingRequest.mock.calls.filter(([, body]) => body.action === 'checkout')).toHaveLength(error instanceof BillingError ? 2 : 1);
      expect(flow.open).not.toHaveBeenCalled();
    }
  });
});
describe('bounded payment confirmation', () => {
  it('persists the subscription id and original confirmation time', () => {
    expect(parsePendingPayment(receipt)).toEqual(receipt);
    let stored = '';
    const bindings = { setPaymentPending: vi.fn(), setPaymentDesktopRequest: vi.fn(), setCheckoutRecovery:vi.fn(), checkoutFailure:{current:""}, desktopRequest: '', pendingReceipt: { current: null },
      pendingKey: 'pending', sessionStorage: { setItem: (_key: string, value: string) => { stored = value; }, removeItem: vi.fn() } };
    const remember = execute('  const rememberPendingPayment =', '  useEffect(() => {', '\nreturn rememberPendingPayment;', bindings);
    remember(true, 'sub-provider');
    expect(JSON.parse(stored)).toMatchObject({ subscriptionId: 'sub-provider', startedAt: expect.any(Number) });
    remember(false);
    expect(bindings.sessionStorage.removeItem).toHaveBeenCalledWith('pending');
    expect(bindings.pendingReceipt.current).toBeNull();
    expect(bindings.setPaymentPending).toHaveBeenLastCalledWith(false);
  });
  it('blocks checkout when its authorization marker cannot be stored', () => {
    const bindings = {setPaymentPending: vi.fn(), setPaymentDesktopRequest: vi.fn(), setCheckoutRecovery:vi.fn(), checkoutFailure:{current:""}, desktopRequest: '', pendingReceipt: {current: null}, pendingKey: 'pending',
      sessionStorage: {setItem: () => {throw new Error('Storage unavailable');}, removeItem: vi.fn()}};
    const remember = execute('  const rememberPendingPayment =', '  useEffect(() => {', '\nreturn rememberPendingPayment;', bindings);
    expect(() => remember(true, 'sub-provider', {requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',userId:'user',expiresAt:now+600_000})).toThrow('save this payment');
    expect(bindings.pendingReceipt.current).toBeNull();
    expect(bindings.setPaymentPending).toHaveBeenLastCalledWith(false);
  });
  it.each(['cancelled','expired','halted','pending','trial_canceled','completed','paused'])('clears pending %s without inventing a successful payment', async status => {
    const flow = confirmationFlow(status);
    expect(await flow.pendingCheck.current()).toBe(true);
    expect(flow.rememberPendingPayment).toHaveBeenCalledWith(false);
    expect(flow.setPaymentRecovery).toHaveBeenCalledWith(true);
    expect(flow.setPreparedCheckout).toHaveBeenCalledWith(null);
    expect(flow.connectAfterPayment).not.toHaveBeenCalled();
  });
  it('preserves entitled access despite cancellation at the end of a period', async () => {
    const flow = confirmationFlow('cancelled'); flow.paidSeatForAccount.mockReturnValue({});
    expect(await flow.pendingCheck.current()).toBe(true);
    expect(flow.setPaymentRecovery).not.toHaveBeenCalled();
    expect(flow.connectAfterPayment).toHaveBeenCalledOnce();
  });
  it('ignores another account and bounds missing subscriptions, unknown states and legacy receipts', () => {
    expect(pendingPaymentOutcome(snapshot('expired', 'other'), 'account', receipt, false, now)).toBe('waiting');
    expect(pendingPaymentOutcome(null, 'account', receipt, false, now + PAYMENT_CONFIRMATION_TIMEOUT_MS)).toBe('failed');
    expect(pendingPaymentOutcome(snapshot('authenticated'), 'account', receipt, false, now + PAYMENT_CONFIRMATION_TIMEOUT_MS)).toBe('failed');
    expect(pendingPaymentOutcome(null, 'account', { desktopRequest: '' }, false, now)).toBe('failed');
  });
  it('ends offline polling at the same deadline', async () => {
    const flow = confirmationFlow('created', now - PAYMENT_CONFIRMATION_TIMEOUT_MS);
    flow.refresh.mockRejectedValue(new Error('Offline'));
    expect(await flow.pendingCheck.current()).toBe(true);
    expect(flow.setPaymentRecovery).toHaveBeenCalledWith(true);
    expect(flow.refresh).not.toHaveBeenCalled();
  });
  it('does not publish recovery from an old account poll', async () => {
    const flow = confirmationFlow();
    flow.refresh.mockImplementation(async () => { flow.selectedAccountRef.current = 'other'; return snapshot('expired'); });
    expect(await flow.pendingCheck.current()).toBe(true);
    expect(flow.rememberPendingPayment).not.toHaveBeenCalled();
  });
  it('offers retry and support, even when account refresh failed, without claiming no charge', () => {
    expect(subscriptionStage({ loaded: true, signedIn: true, snapshotLoaded: false, hasPaidAccess: false, paymentPending: false,
      manageAccount: true, paymentRecovery: true, loadFailed: true })).toBe('payment-recovery');
    const html = renderToStaticMarkup(createElement(BillingJourney, { stage: 'payment-recovery', email: null, desktopRequest: false,
      desktopConnected: false, busy: false, error: '', notice: '', signInAvailable: true, canConnect: false,
      onSignIn() {}, onSignOut() {}, onRefresh() {}, onAccount() {}, onBack() {}, onConnect() {}, onRetryPayment() {} }));
    expect(html).toContain('Try again'); expect(html).toContain('Contact support');
    expect(html).toContain('A charge may still have gone through'); expect(html).not.toContain('Nothing was charged');
  });
});

describe('DOC-4b invoice recipient before checkout', () => {
  it('saves the consumer name before profile and checkout or gateway opening', async () => {
    const flow = checkoutFlow(reply(), 0, {invoiceRecipientName: '  अनन्या शर्मा  '}); await flow.start();
    expect(flow.billingRequest.mock.calls.map(([,body]) => body.action)).toEqual(['save_invoice_recipient_name','save_invoice_profile','checkout']);
    expect(flow.billingRequest.mock.calls[0][1]).toEqual({action:'save_invoice_recipient_name',accountId:'account',name:'अनन्या शर्मा'});
  });
  it('rejects an empty name before any billing mutation', async () => {
    const flow = checkoutFlow(reply(), now, {invoiceRecipientName: ' '});
    await expect(flow.start()).rejects.toThrow('name'); expect(flow.billingRequest).not.toHaveBeenCalled();expect(flow.open).not.toHaveBeenCalled();
  });
  it('does not open checkout or reserve it when saving the name fails', async () => {
    const flow = checkoutFlow();flow.billingRequest.mockImplementation(async (_endpoint,body) => {if(body.action === 'save_invoice_recipient_name')throw new Error('Name save failed');return {};});
    await expect(flow.start()).rejects.toThrow('Name save failed'); expect(flow.open).not.toHaveBeenCalled();expect(flow.billingRequest.mock.calls).toHaveLength(1);
  });
  it('keeps the business name and omits the consumer-name action for business invoices', async () => {
    const flow = checkoutFlow(reply(),now,{businessInvoice:true,invoiceRecipientName:'',invoiceDetails:{businessName:'QA Business',stateCode:'07',gstin:'07AAACM1234A1Z5',address:'Test address',postalCode:'110001'}});
    await flow.start();expect(flow.billingRequest.mock.calls.map(([,body])=>body.action)).toEqual(['save_invoice_profile']);
    expect(flow.billingRequest.mock.calls[0][1].invoiceProfile.businessName).toBe('QA Business');expect(flow.open).toHaveBeenCalledOnce();
  });
  it('stops checkout if the account changes while saving the consumer name', async () => {
    const flow=checkoutFlow();flow.billingRequest.mockImplementation(async(_endpoint,body)=>{if(body.action==='save_invoice_recipient_name')flow.activeUserId.current='other-user';return {};});
    await flow.start();expect(flow.billingRequest.mock.calls).toHaveLength(1);expect(flow.open).not.toHaveBeenCalled();
  });
});

it('BROWSER-03 Resume reopens the saved subscription without a fresh checkout or profile mutation', async () => {
 const saved = {...reply(), trialEndsAt:null};
 const flow = checkoutFlow(saved, now, {trialEligible:false, pendingReceipt:{current:{userId:'user',requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',subscriptionId:'sub-new',checkout:{reply:saved,preparedAt:now}}}});
 await flow.start(true);
 expect(flow.open).toHaveBeenCalledOnce(); expect(flow.billingRequest).not.toHaveBeenCalled();
 expect(flow.rememberPendingPayment).toHaveBeenCalledWith(true,'sub-new',expect.objectContaining({requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',checkout:{reply:saved,preparedAt:now}}));
});
it('RZP-10 sends the selected method on ordinary checkout and restricts the provider UI', async()=>{
 let options: {config:ReturnType<typeof checkoutMethodConfig>} | undefined;
 const flow=checkoutFlow(null as unknown as ReturnType<typeof reply>,now,{trialEligible:false,couponPaymentMethod:'card',window:{Razorpay:class {constructor(value:typeof options){options=value;}open(){}on(){}}},billingRequest:vi.fn(async(_endpoint,body)=>body.action==='checkout'?{...reply(),paymentMethod:'card'}:{})});
 await flow.start();
 expect(flow.billingRequest.mock.calls.find(([,body])=>body.action==='checkout')?.[1]).toMatchObject({paymentMethod:'card'});
 expect(options?.config.display.blocks.selected.instruments).toEqual([{method:'card'}]);
});
it('RZP-14 never lets Resume bypass a changed final checkout price',async()=>{
 const changed={...reply(),amountPaise:11900};
 const flow=checkoutFlow(changed,now,{trialEligible:false});
 await expect(flow.start()).rejects.toThrow('price changed');
 expect(flow.open).not.toHaveBeenCalled();
 expect(flow.rememberPendingPayment).toHaveBeenCalledWith(true,'sub-new',expect.objectContaining({checkout:expect.objectContaining({priceConfirmed:false})}));
 const blocked=parsePendingPayment({desktopRequest:'',userId:'user',requestId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',subscriptionId:'sub-new',checkout:{reply:changed,preparedAt:now,priceConfirmed:false}});
 expect(blocked?.checkout?.priceConfirmed).toBe(false);
 const retry=checkoutFlow(changed,now,{trialEligible:false,pendingReceipt:{current:blocked}});
 await expect(retry.start(true)).rejects.toThrow(/cancel/i);expect(retry.open).not.toHaveBeenCalled();
});

it('RACE-03b refreshes the snapshot instead of opening or cancelling an already authorized trial',async()=>{
 const billingRequest=vi.fn(async(_endpoint,body)=>{if(body.action==='checkout')throw new BillingError('Active','TRIAL_ALREADY_ACTIVE');return {};});
 const flow=checkoutFlow(null as unknown as ReturnType<typeof reply>,now,{billingRequest});await flow.start();expect(flow.refresh).toHaveBeenCalledOnce();expect(flow.open).not.toHaveBeenCalled();expect(billingRequest.mock.calls.some(([,body])=>body.action==='abandon_checkout')).toBe(false);
});

it('RACE-03b keeps the request identity through 90 seconds and a manual Retry',async()=>{
 vi.useFakeTimers();
 try {
  const requests:object[]=[];const billingRequest=vi.fn(async(_endpoint,body)=>{if(body.action==='checkout'){requests.push(body);throw new BillingError('Expiring','CHECKOUT_EXPIRING',5);}return {};});
  const flow=checkoutFlow(null as unknown as ReturnType<typeof reply>,now,{billingRequest});const first=flow.start();await vi.advanceTimersByTimeAsync(90000);await first;expect(flow.setCheckoutExpiry).toHaveBeenLastCalledWith('timeout');expect(flow.open).not.toHaveBeenCalled();
  billingRequest.mockImplementation(async(_endpoint,body)=>{if(body.action==='checkout'){requests.push(body);return reply();}return {};});await flow.start();expect(requests).toHaveLength(19);expect(requests.every(body=>JSON.stringify(body)===JSON.stringify(requests[0]))).toBe(true);expect(flow.setPreparedCheckout.mock.lastCall?.[0]).toMatchObject({reply:{subscriptionId:'sub-new'}});expect(flow.open).not.toHaveBeenCalled();
 } finally {vi.useRealTimers();}
});
