import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
function deferred<T>() { let resolve!: (value: T) => void; let reject!: (error: Error) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; }
function portal() {
  const source = readFileSync(new URL('../components/BillingPortal.tsx', import.meta.url), 'utf8');
  const bindings = { refreshSequence: { current: 0 }, activeUserId: { current: 'qa-user' }, selectedAccountRef: { current: 'account-a' },
    authToken: vi.fn(async () => 'test-session'), billingRequest: vi.fn(), identityRef: { current: { email: 'qa@example.test' } },
    setSnapshotFailed: vi.fn(), setSnapshot: vi.fn(), setSelectedAccountId: vi.fn(), paidSeatForAccount: () => undefined, useCallback: (fn: unknown) => fn };
  const start = source.indexOf('const refresh = useCallback');
  const end = source.indexOf('}, [authToken]);', start) + '}, [authToken]);'.length;
  const code = ts.transpileModule(source.slice(start, end) + '\nreturn refresh;', { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  return { ...bindings, refresh: new Function(...Object.keys(bindings), code)(...Object.values(bindings)) as () => Promise<unknown> };
}
const unpaid = { accounts: [{ id: 'account-a', kind: 'personal' }], subscriptions: [], seats: [] };
const paid = { ...unpaid, subscriptions: [{ id: 'sub-paid' }] };
describe('snapshot response ordering', () => {
  it.each([1, 2, 3, 4, 5])('late old poll cannot undo a newer paid snapshot, ordering %i', async () => {
    const flow = portal(); const old = deferred<unknown>();
    flow.billingRequest.mockReturnValueOnce(old.promise).mockResolvedValueOnce(paid);
    const first = flow.refresh(); await Promise.resolve();
    await flow.refresh(); old.resolve(unpaid); await first;
    expect(flow.setSnapshot).toHaveBeenCalledOnce(); expect(flow.setSnapshot).toHaveBeenCalledWith(paid);
  });
  it.each(['account', 'user'])('ignores a response after %s changes', async kind => {
    const flow = portal(); const pending = deferred<unknown>(); flow.billingRequest.mockReturnValue(pending.promise);
    const call = flow.refresh(); await Promise.resolve();
    if (kind === 'account') flow.selectedAccountRef.current = 'account-b'; else flow.activeUserId.current = 'new-user';
    pending.resolve(unpaid); await call; expect(flow.setSnapshot).not.toHaveBeenCalled();
  });
  it('suppresses a late error from an older poll', async () => {
    const flow = portal(); const old = deferred<unknown>(); flow.billingRequest.mockReturnValueOnce(old.promise).mockResolvedValueOnce(paid);
    const first = flow.refresh(); await Promise.resolve(); await flow.refresh(); old.reject(new Error('stale outage'));
    await expect(first).resolves.toBeUndefined(); expect(flow.setSnapshot).toHaveBeenLastCalledWith(paid);
    expect(flow.setSnapshotFailed).not.toHaveBeenCalledWith(true);
  });
  it('marks a current snapshot failure and clears it when a retry succeeds', async () => {
    const flow = portal();
    flow.billingRequest.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(paid);
    await expect(flow.refresh()).rejects.toThrow('offline');
    expect(flow.setSnapshotFailed).toHaveBeenLastCalledWith(true);
    await flow.refresh();
    expect(flow.setSnapshotFailed).toHaveBeenLastCalledWith(false);
    expect(flow.setSnapshot).toHaveBeenLastCalledWith(paid);
  });
});
