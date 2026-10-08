import { describe, expect, it } from 'vitest';
import { parsePendingPayment } from '../lib/billing';
describe('saved pending payment receipt', () => {
  it.each([true, [], 'garbage', 42, { unrelated: true }, null, { desktopRequest: 42 }, { desktopRequest: 'not-a-desktop-request' }])('rejects corrupt receipt %j', value => {
    expect(parsePendingPayment(value)).toBeNull();
  });
  it.each(['', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'])('preserves valid pending receipt %s', desktopRequest => {
    expect(parsePendingPayment({ desktopRequest })).toEqual({ desktopRequest });
  });
});
