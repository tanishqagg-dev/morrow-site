import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { expect, test, vi } from 'vitest';

const source = readFileSync(new URL('../components/BillingPortal.tsx', import.meta.url), 'utf8');
function effectEnding(marker: string) {
  const end = source.indexOf(marker) + marker.length;
  return source.slice(source.lastIndexOf('useEffect(() => {', end), end);
}

test('subscription link opens management and account switches preserve the chosen view', () => {
  for (const search of ['', '?view=subscription']) {
    let management = false;
    const context = { pendingKey: 'pending:user:account', URLSearchParams, window: { location: { search } },
      useEffect: (callback: () => void) => callback(), sessionStorage: { getItem: () => null }, parsePendingPayment: () => null,
      setManageAccount: (value: boolean) => { management = value; },
      pendingReceipt: { current: null }, setPaymentRecovery() {}, setConfirmCancel() {}, setError() {}, setNotice() {}, setPaymentPending() {}, setPaymentDesktopRequest() {},
    };
    const marker = 'setManageAccount(new URLSearchParams(window.location.search).get("view") === "subscription");';
    const start = source.lastIndexOf('useEffect(() => {', source.indexOf(marker));
    const end = source.indexOf('}, []);', start) + '}, []);'.length;
    runInNewContext(source.slice(start, end), context);
    expect(management).toBe(search !== '');
    management = true; // Customer chooses Manage subscription from the Ready screen.
    for (const pendingKey of ['pending:user:first-account', 'pending:user:second-account']) {
      runInNewContext(effectEnding('}, [pendingKey]);'), { ...context, pendingKey });
      expect(management).toBe(true);
    }
    management = false; // Customer chooses Back to Morrow.
    runInNewContext(effectEnding('}, [pendingKey]);'), context);
    expect(management).toBe(false);
  }
});

function invoiceFlow() {
  const setInvoices = vi.fn();
  const setNotice = vi.fn();
  const authToken = vi.fn(async () => 'test-session');
  const billingRequest = vi.fn();
  const setError = vi.fn();
  const bindings = { activeUserId: { current: 'qa-user' }, selectedAccountId: 'account-a',
    selectedAccountRef: { current: 'account-a' }, authToken,
    subscriptions: [{ id: 'sub-a', razorpay_subscription_id: 'gateway-sub-a' }],
    invoices: [], billingRequest, setInvoices, setNotice, setError,
    run: (_name: string, task: () => Promise<void>) => task().catch(setError),
  };
  const start = source.indexOf('const loadInvoices =');
  const end = source.indexOf('\n  const desktopConsent =', start);
  const compiled = ts.transpileModule(`${source.slice(start, end)}\nreturn loadInvoices;`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const load = new Function(...Object.keys(bindings), compiled)(...Object.values(bindings));
  return { ...bindings, load };
}

test('switching accounts clears old invoices before another account is displayed', () => {
  const setInvoices = vi.fn();
  runInNewContext(effectEnding('}, [selectedAccountId]);'), {
    useEffect: (callback: () => void) => callback(), selectedAccountId: 'account-b', setInvoices,
  });
  expect(setInvoices).toHaveBeenCalledWith([]);
});

test('an old account invoice request cannot populate the newly selected account', async () => {
  const flow = invoiceFlow();
  let complete!: (value: unknown) => void;
  flow.billingRequest.mockReturnValue(new Promise(resolve => { complete = resolve; }));
  flow.load();
  await Promise.resolve();
  flow.selectedAccountRef.current = 'account-b';
  complete({ invoices: [{ id: 'private-old-account-invoice' }] });
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(flow.setInvoices).not.toHaveBeenCalled();
  expect(flow.setNotice).not.toHaveBeenCalled();
});

test('invoice loading skips backend calls if the account changes while authentication awaits', async () => {
  const flow = invoiceFlow();
  let complete!: (value: string) => void;
  flow.authToken.mockReturnValue(new Promise(resolve => { complete = resolve; }));
  flow.load();
  flow.selectedAccountRef.current = 'account-b';
  complete('test-session');
  await Promise.resolve(); await Promise.resolve();
  expect(flow.billingRequest).not.toHaveBeenCalled();
});

test('a rejected old-account invoice request does not show an error on the new account', async () => {
  const flow = invoiceFlow();
  let reject!: (error: Error) => void;
  flow.billingRequest.mockReturnValue(new Promise((_resolve, fail) => { reject = fail; }));
  flow.load();
  await Promise.resolve();
  flow.selectedAccountRef.current = 'account-b';
  reject(new Error('Old account unavailable'));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(flow.setError).not.toHaveBeenCalled();
});

test('matching account invoices appear and signed-out requests are ignored', async () => {
  const flow = invoiceFlow();
  flow.billingRequest.mockResolvedValue({ invoices: [{ id: 'invoice-a' }] });
  flow.load();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(flow.setInvoices).toHaveBeenCalledWith([{ id: 'invoice-a' }]);
  flow.setInvoices.mockClear();
  flow.authToken.mockImplementation(async () => { flow.activeUserId.current = 'another-user'; return 'old-session'; });
  flow.load();
  await Promise.resolve(); await Promise.resolve();
  expect(flow.setInvoices).not.toHaveBeenCalled();
});

test('account refresh scopes recovery to the selected account and keeps initial snapshots unscoped', async () => {
  for (const selectedAccount of ['', 'account-a']) {
    const snapshot = { accounts: [{ id: 'account-a', kind: 'personal' }], subscriptions: [], seats: [] };
    const billingRequest = vi.fn(async () => snapshot);
    const selectedAccountRef = { current: selectedAccount };
    const bindings = { activeUserId: { current: 'qa-user' }, selectedAccountRef, refreshSequence: { current: 0 },
      authToken: async () => 'test-session', billingRequest,
      identityRef: { current: { email: 'qa@example.test' } },
      desktopRequestRef: { current: "" }, setSnapshotFailed: vi.fn(), setSnapshot: vi.fn(), setSelectedAccountId: vi.fn(), paidSeatForAccount: () => undefined,
      useCallback: (callback: () => Promise<unknown>) => callback,
    };
    const start = source.indexOf('const refresh = useCallback');
    const end = source.indexOf('}, [authToken]);', start) + '}, [authToken]);'.length;
    const compiled = ts.transpileModule(`${source.slice(start, end)}\nreturn refresh;`, {
      compilerOptions: { target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const refresh = new Function(...Object.keys(bindings), compiled)(...Object.values(bindings));
    await refresh();
    expect(billingRequest).toHaveBeenCalledWith('billing-customer', {
      action: 'snapshot', accountId: selectedAccount || undefined,
    }, 'test-session');
  }
});

test('an empty invoice response clears rows without creating a second empty-state notice', async () => {
  const flow = invoiceFlow();
  flow.billingRequest.mockResolvedValue({ invoices: [] });
  flow.load();
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(flow.setInvoices).toHaveBeenCalledWith([]);
  expect(flow.setNotice).not.toHaveBeenCalled();
});
