import { describe, expect, it } from 'vitest';
import { parseBillingCatalog, parseBillingSnapshot, parseCheckoutReply, paidSeatForAccount } from '../lib/billing';
import { currentSubscriptionForAccount } from '../lib/subscription-flow';
const empty = { accounts: [], seats: [], subscriptions: [], payments: [] };
describe('trial backend compatibility', () => {
  it('keeps the rollout dark for missing or incomplete trial fields', () => {
    for (const trial of [undefined, null, {}, { enabled: true }, { enabled: true, days: 31 }]) {
      expect(parseBillingCatalog({ mode: 'live', plans: [], trial }).trial.enabled).toBe(false);
      expect(parseBillingSnapshot({ ...empty, trial }).trial?.enabled).toBe(false);
    }
  });
  it('preserves eligibility, server invitation and the fixed first-charge timestamp', () => {
    const subscription = { id: 'trial', account_id: 'mine', status: 'trial_canceled', access_source: 'trial', trial_ends_at: '2026-10-18T10:00:00Z', paid_until: '2026-10-18T10:00:00Z' };
    const snapshot = parseBillingSnapshot({ ...empty, betaInviteRequired: true, trial: { enabled: true, days: 7, eligible: false, reason: 'used' }, subscriptions: [subscription], seats: [{ account_id: 'mine', email: 'me@example.test', licenseStatus: 'active' }] });
    expect(snapshot.trial?.reason).toBe('used');
    expect(snapshot.betaInviteRequired).toBe(true);
    expect(currentSubscriptionForAccount(snapshot, 'mine', Date.parse('2026-10-12'))?.trial_ends_at).toBe(subscription.trial_ends_at);
    expect(paidSeatForAccount(snapshot, 'mine', 'me@example.test', Date.parse('2026-10-12'))).toBeDefined();
    expect(paidSeatForAccount(snapshot, 'mine', 'me@example.test', Date.parse('2026-10-19'))).toBeUndefined();
  });
  it('uses the checkout date and amount without inventing a date for older servers', () => {
    const reply = { subscriptionId: 'sub_a', keyId: 'rzp_test', email: 'me@example.test', name: 'Me' };
    expect(parseCheckoutReply(reply).trialEndsAt).toBeNull();
    expect(parseCheckoutReply({ ...reply, trialEndsAt: '2026-10-18T10:00:00Z', amountPaise: 353882 }).amountPaise).toBe(353882);
    expect(() => parseCheckoutReply({ ...reply, trialEndsAt: 'next week' })).toThrow('unreadable');
  });
});
