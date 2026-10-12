import {describe, expect, it} from 'vitest';
import {subscriptionStatusLabel} from '../lib/subscription-label';
const deadline = '2026-10-12T12:00:00Z';
const end = Date.parse(deadline);
const trial = {status: 'trialing' as const, cancel_at_period_end: false, paid_until: deadline, trial_ends_at: deadline};
describe('subscription deadline labels', () => {
 it('ends the trial at the exact access deadline', () => {
  expect(subscriptionStatusLabel(trial, true, end - 1)).toBe('Trial');
  expect(subscriptionStatusLabel(trial, false, end)).toBe('Expired');
  expect(subscriptionStatusLabel(trial, false, end + 1)).toBe('Expired');
 });
 it('uses paid access after the trial deadline when a charge extends the term', () => {
  expect(subscriptionStatusLabel({...trial, paid_until: '2026-11-12T12:00:00Z'}, true, end)).toBe('Active');
 });
 it('does not show Trial when paid access ended before the trial deadline', () => {
  expect(subscriptionStatusLabel({...trial, paid_until: '2026-10-11T12:00:00Z'}, false, end - 1)).toBe('Expired');
 });
 it('uses paid_until for older trials without a separate trial deadline', () => {
  expect(subscriptionStatusLabel({...trial, trial_ends_at: null}, true, end - 1)).toBe('Trial');
  expect(subscriptionStatusLabel({...trial, trial_ends_at: null}, false, end)).toBe('Expired');
 });
 it('keeps cancellation and superseded labels', () => {
  expect(subscriptionStatusLabel({...trial,status:'trial_canceled'}, true, end - 1)).toBe('Canceled');
  expect(subscriptionStatusLabel({...trial,status:'superseded'}, false, end)).toBe('Closed');
 });
});
