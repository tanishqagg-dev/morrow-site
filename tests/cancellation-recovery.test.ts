import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
import { BillingError } from '../lib/billing';

function cancellationFlow() {
  const source = readFileSync(new URL('../components/BillingPortal.tsx', import.meta.url), 'utf8');
  let pending: Promise<void>;
  const bindings = { clearSignInIntent:vi.fn(),
    signedIn: true, BillingError, authToken: async () => 'qa-token', billingRequest: vi.fn(),
    refresh: vi.fn(), setCancelRetryId: vi.fn(), setConfirmCancel: vi.fn(), setNotice: vi.fn(),
    run: (_action: string, work: () => Promise<void>) => { pending = work(); },
  };
  const sensitiveMutation = (body: object) => bindings.billingRequest("billing-customer", body, "qa-token");
  const start = source.indexOf('const changeSubscription =');
  const end = source.indexOf('const loadInvoices =', start);
  const code = ts.transpileModule(source.slice(start, end) + '\nreturn changeSubscription;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const change = new Function(...Object.keys(bindings), "sensitiveMutation", code)(...Object.values(bindings), sensitiveMutation);
  return { ...bindings, cancel: (status: string) => { change('cancel', { id: 'sub-a', status }); return pending!; } };
}
const failure = () => new BillingError('Provider cancellation unconfirmed.', 'CANCELLATION_VERIFICATION_FAILED');
const message = "We couldn't confirm the cancellation with Razorpay. Nothing changed. Try again in a minute.";
describe('unconfirmed subscription cancellation', () => {
  it.each(['trialing','active'])('retains %s access and offers retry without publishing success', async status => {
    const flow = cancellationFlow(); flow.billingRequest.mockRejectedValue(failure());
    await expect(flow.cancel(status)).rejects.toThrow(message);
    expect(flow.setCancelRetryId).toHaveBeenLastCalledWith('sub-a');
    expect(flow.refresh).not.toHaveBeenCalled();
    expect(flow.setConfirmCancel).not.toHaveBeenCalled();
    expect(flow.setNotice).not.toHaveBeenCalled();
    expect(flow.billingRequest).toHaveBeenCalledOnce();
  });
  it.each(['trialing','active'])('reports %s cancellation only after an explicit successful retry', async status => {
    const flow = cancellationFlow(); flow.billingRequest.mockRejectedValueOnce(failure()).mockResolvedValueOnce({});
    await expect(flow.cancel(status)).rejects.toThrow(message);
    await expect(flow.cancel(status)).resolves.toBeUndefined();
    expect(flow.billingRequest).toHaveBeenCalledTimes(2);
    expect(flow.refresh).toHaveBeenCalledOnce();
    expect(flow.setConfirmCancel).toHaveBeenCalledWith(false);
    expect(flow.setNotice).toHaveBeenCalledOnce();
    expect(flow.setNotice.mock.calls[0][0]).toContain(status === 'trialing' ? 'Trial canceled.' : 'Renewal cancelled.');
  });
});
