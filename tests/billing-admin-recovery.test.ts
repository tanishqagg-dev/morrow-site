import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';

const source = readFileSync(new URL('../components/BillingAdmin.tsx', import.meta.url), 'utf8');
function recovery(role = 'owner', busy = '') {
  const bindings = { snapshot: { role }, busy, recoveryRequestId: ' aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa ',
    recoverySubscriptionId: ' sub_QATestExisting123 ', token: 'test-mfa-token',
    activeToken: { current: 'test-mfa-token' }, actionLock: { current: null as object | null },
    setBusy: vi.fn(), setError: vi.fn(), setNotice: vi.fn(),
    setRecoveryRequestId: vi.fn(), setRecoverySubscriptionId: vi.fn(),
    billingRequest: vi.fn(async () => ({ recovered: true })), refresh: vi.fn(async () => {}),
    errorText: (error: Error) => error.message,
  };
  const start = source.indexOf('const recoverCheckout =');
  const end = source.indexOf('\n  return <section', start);
  const runStart = source.indexOf('const run = async');
  const runEnd = source.indexOf('\n  const subscriptions =', runStart);
  const compiled = ts.transpileModule(`${source.slice(runStart, runEnd)}\n${source.slice(start, end)}\nreturn recoverCheckout;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const submit = new Function(...Object.keys(bindings), compiled)(...Object.values(bindings));
  return { ...bindings, submit };
}
async function settle() {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('owner checkout recovery', () => {
  it.each(['operator', 'auditor'])('does not expose mutation through a %s handler', (role) => {
    const flow = recovery(role);
    flow.submit({ preventDefault() {} });
    expect(flow.billingRequest).not.toHaveBeenCalled();
  });
  it('does not repeat recovery while an action is busy', () => {
    const flow = recovery('owner', 'recover-checkout');
    flow.submit({ preventDefault() {} });
    expect(flow.billingRequest).not.toHaveBeenCalled();
  });
  it('sends the exact existing checkout identifiers and never claims access is granted', async () => {
    const flow = recovery();
    flow.submit({ preventDefault() {} });
    await settle();
    expect(flow.billingRequest).toHaveBeenCalledWith('billing-admin', {
      action: 'recover_checkout', requestId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      razorpaySubscriptionId: 'sub_QATestExisting123',
    }, 'test-mfa-token');
    expect(flow.refresh).toHaveBeenCalledOnce();
    expect(flow.setNotice).toHaveBeenCalledWith(expect.stringContaining('Payment and access still require verification'));
    expect(flow.setBusy).toHaveBeenLastCalledWith('');
  });
  it('keeps request identifiers for review when provider validation rejects recovery', async () => {
    const flow = recovery();
    flow.billingRequest.mockRejectedValueOnce(new Error('Checkout details do not match'));
    flow.submit({ preventDefault() {} });
    await settle();
    expect(flow.setError).toHaveBeenCalledWith('Checkout details do not match');
    expect(flow.setRecoveryRequestId).not.toHaveBeenCalled();
    expect(flow.setRecoverySubscriptionId).not.toHaveBeenCalled();
    expect(flow.refresh).not.toHaveBeenCalled();
  });
});


describe('recovery request ordering', () => {
  it.each([1, 2, 3, 4, 5])('blocks same-render duplicate submit, ordering %i', async () => {
    const flow = recovery();
    let complete!: (value: { recovered: boolean }) => void;
    flow.billingRequest.mockReturnValue(new Promise(resolve => { complete = resolve; }));
    flow.submit({ preventDefault() {} }); flow.submit({ preventDefault() {} });
    expect(flow.billingRequest).toHaveBeenCalledOnce();
    complete({ recovered: true }); await settle();
    expect(flow.actionLock.current).toBeNull();
  });
  it.each(['success', 'failure'])('ignores an old token recovery %s after session rotation', async outcome => {
    const flow = recovery();
    let complete!: (value: { recovered: boolean }) => void;
    let fail!: (error: Error) => void;
    flow.billingRequest.mockReturnValue(new Promise((resolve, reject) => { complete = resolve; fail = reject; }));
    flow.submit({ preventDefault() {} });
    flow.activeToken.current = 'new-session';
    flow.actionLock.current = {}; // The next session owns its own action.
    flow.setError.mockClear(); flow.setNotice.mockClear(); flow.setBusy.mockClear();
    if (outcome === 'success') complete({ recovered: true }); else fail(new Error('old-session failure'));
    await settle();
    expect(flow.refresh).not.toHaveBeenCalled();
    expect(flow.setError).not.toHaveBeenCalled(); expect(flow.setNotice).not.toHaveBeenCalled();
    expect(flow.setBusy).not.toHaveBeenCalled(); expect(flow.actionLock.current).not.toBeNull();
  });
});
