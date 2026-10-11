import {readFileSync} from 'node:fs';
import {describe, expect, it} from 'vitest';
import {parsePendingPayment, clearPendingAuthorizations} from '../lib/billing';
import {pendingPaymentOutcome} from '../lib/subscription-flow';
import type {BillingSnapshot} from '../lib/billing';
const now = Date.now();
const receipt = {desktopRequest: '', subscriptionId: 'sub-test', requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', userId: 'user-test', startedAt: now, expiresAt: now + 600_000};
describe('RZP-12 pending authorization', () => {
 it('preserves reservation identity, user binding and expiry', () => expect(parsePendingPayment(receipt)).toEqual(receipt));
 it('retains uncertain outcomes after expiry rather than allowing another checkout', () => expect(pendingPaymentOutcome(null, 'account', receipt, false, now + 600_001)).toBe('uncertain'));
 it.each(['pending','halted','paused'])('does not clear a potentially charged %s authorization', status => {
  const snapshot = {subscriptions: [{account_id:'account', razorpay_subscription_id:'sub-test', status}]} as BillingSnapshot;
  expect(pendingPaymentOutcome(snapshot, 'account', receipt, false, now)).toBe('waiting');
 });
 it('does not resolve an unrelated paid subscription', () => expect(pendingPaymentOutcome({subscriptions: []} as unknown as BillingSnapshot, 'account', receipt, true, now)).toBe('waiting'));
 it('clears only the signed-out user markers', () => {
  const values = new Map([['morrow:payment-pending:user-test:account','receipt'],['morrow:payment-pending:other:account','other']]);
  clearPendingAuthorizations({get length(){return values.size}, key: (i:number) => [...values.keys()][i], removeItem:(key:string)=>values.delete(key)}, 'user-test');
  expect([...values.keys()]).toEqual(['morrow:payment-pending:other:account']);
 });
 it('persists before opening checkout and keeps dismissal in reconciliation', () => {
  const source = readFileSync(new URL('../components/BillingPortal.tsx', import.meta.url),'utf8');
  const start = source.indexOf('    checkout.open();');
  expect(source.slice(start - 400, start)).toContain('rememberPendingPayment(true');
  expect(source).not.toContain('Checkout closed. You can retry.');
  expect(source).toContain('receipt.userId !== identity?.userId');
 });
});
