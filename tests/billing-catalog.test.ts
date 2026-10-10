import { describe, expect, it } from 'vitest';
import { parseBillingCatalog } from '../lib/billing';

const plan = {
  id: 'qa-plan', code: 'PERSONAL_MONTHLY', name: 'Morrow Personal', audience: 'personal',
  period: 'monthly', amountPaise: 299900, chargeAmountPaise: 353882, currency: 'INR',
  minimumQuantity: 1, gstDiscountAvailable: false,
};

describe('billing catalog response validation', () => {
  it.each([{}, null, { mode: 'test', plans: null }, { mode: 'test', plans: {} },
    { mode: 'test', plans: [null] }, { mode: 'live', plans: [5] },
    { mode: 'unknown', plans: [] }, { mode: 'live', plans: [{ ...plan, amountPaise: '299900' }] },
    { mode: 'live', plans: [{ ...plan, amountPaise: -1 }] },
    { mode: 'live', plans: [{ ...plan, currency: 'USD' }] },
  ])('rejects malformed successful JSON without passing invalid plans to rendering: %j', (payload) => {
    expect(() => parseBillingCatalog(payload)).toThrow('unreadable response');
  });

  it('accepts both gateway modes and permits an empty published catalog', () => {
    for (const mode of ['test', 'live']) {
      expect(parseBillingCatalog({ mode, plans: [plan], gstRate: 18 })).toEqual({ mode, plans: [plan], betaInviteRequired: false, trial: { enabled: false, days: 7 } });
      expect(parseBillingCatalog({ mode, plans: [] })).toEqual({ mode, plans: [], betaInviteRequired: false, trial: { enabled: false, days: 7 } });
    }
  });
});
