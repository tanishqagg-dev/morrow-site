import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { describe, expect, it, vi } from 'vitest';
const source = readFileSync(new URL('../components/BillingPortal.tsx', import.meta.url), 'utf8');
const start = source.indexOf('useEffect(() => {', source.indexOf('const [inviteAccepted'));
const end = source.indexOf('}, [identity?.userId]);', start) + '}, [identity?.userId]);'.length;
const code = ts.transpileModule(source.slice(start, end), { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
describe('invitation without browser storage', () => {
  it.each(['quota', 'security', 'read-only', 'private mode', 'disabled'])('keeps the desktop URL invitation during %s failure', failure => {
    const bindings = { URLSearchParams, window: { location: { search: '?invite=SUPPLIED-CODE' } }, identity: { userId: 'qa-user' },
      sessionStorage: { getItem: () => { throw new Error(failure); }, setItem: () => { throw new Error(failure); } },
      useEffect: (effect: () => void) => effect(), setInviteAccepted: vi.fn(), setInviteCode: vi.fn() };
    new Function(...Object.keys(bindings), code)(...Object.values(bindings));
    expect(bindings.setInviteCode).toHaveBeenLastCalledWith('SUPPLIED-CODE');
    expect(bindings.setInviteAccepted).toHaveBeenLastCalledWith(false);
  });
  it('retains a supplied custom code without pretending it was verified', () => {
    const bindings = { URLSearchParams, window: { location: { search: '?invite=MY-CODE' } }, identity: { userId: 'qa-user' },
      sessionStorage: { getItem: () => { throw new Error('denied'); }, setItem: vi.fn() },
      useEffect: (effect: () => void) => effect(), setInviteAccepted: vi.fn(), setInviteCode: vi.fn() };
    new Function(...Object.keys(bindings), code)(...Object.values(bindings));
    expect(bindings.setInviteCode).toHaveBeenLastCalledWith('MY-CODE');
    expect(bindings.setInviteAccepted).toHaveBeenCalledOnce();
    expect(bindings.setInviteAccepted).toHaveBeenCalledWith(false);
  });
});
