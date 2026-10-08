import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";

const source = readFileSync(new URL("../components/OperatorConsole.tsx", import.meta.url), "utf8");

// Exercise the actual component handlers with deferred requests and small hook
// bindings. This keeps the race tests independent of browser auth credentials.
function handler<T>(name: string, end: string, bindings: Record<string, unknown>): T {
  const start = source.indexOf(`const ${name}`);
  const code = source.slice(start, source.indexOf(end, start));
  const compiled = ts.transpileModule(`${code}\nreturn ${name};`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return new Function(...Object.keys(bindings), compiled)(...Object.values(bindings)) as T;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

type Page = { items: { id: string }[]; nextCursor: string | null };
type SessionFixture = { user: { id: string }; access_token: string };
const sessionA: SessionFixture = { user: { id: "operator-a" }, access_token: "test-token-a" };
const sessionB: SessionFixture = { user: { id: "operator-b" }, access_token: "test-token-b" };

function listHarness() {
  const requests: ReturnType<typeof deferred<Page>>[] = [];
  const bindings = {
    previousUserId: { current: sessionA.user.id },
    authGeneration: { current: 1 },
    licenseLoadGeneration: { current: 0 },
    licenseLoadInFlight: { current: null as null | { sequence: number; request: Promise<boolean> } },
    useCallback: (callback: unknown) => callback,
    setOperatorAccess: vi.fn(), setNotice: vi.fn(), setLicenses: vi.fn(), setNextLicenseCursor: vi.fn(),
    invokeOperator: vi.fn(() => {
      const request = deferred<Page>();
      requests.push(request);
      return request.promise;
    }),
    OperatorInvocationError: class extends Error {},
  };
  const load = handler<(session: SessionFixture, cursor?: string | null, force?: boolean) => Promise<boolean>>(
    "loadLicenses", "\n\n  useEffect", bindings,
  );
  return { bindings, requests, load };
}

describe("operator async request ownership", () => {
  it("starts the new account's request without waiting for an old account", async () => {
    const { bindings, requests, load } = listHarness();
    const old = load(sessionA);
    bindings.authGeneration.current += 1;
    bindings.previousUserId.current = sessionB.user.id;
    const current = load(sessionB);
    expect(requests).toHaveLength(2);
    const currentInFlight = bindings.licenseLoadInFlight.current;
    bindings.setLicenses.mockClear();
    bindings.setOperatorAccess.mockClear();
    requests[0].resolve({ items: [{ id: "old-license" }], nextCursor: null });
    expect(await old).toBe(false);
    expect(bindings.licenseLoadInFlight.current).toBe(currentInFlight);
    expect(bindings.setLicenses).not.toHaveBeenCalled();
    expect(bindings.setOperatorAccess).not.toHaveBeenCalled();
    requests[1].resolve({ items: [{ id: "current-license" }], nextCursor: "page-two" });
    expect(await current).toBe(true);
    expect(bindings.setOperatorAccess).toHaveBeenCalledWith("authorized");
    expect(bindings.setNextLicenseCursor).toHaveBeenCalledWith("page-two");
  });

  it("does not deny a current session when an old list request fails", async () => {
    const { bindings, requests, load } = listHarness();
    const old = load(sessionA);
    bindings.authGeneration.current += 1;
    bindings.setOperatorAccess.mockClear();
    bindings.setNotice.mockClear();
    requests[0].reject(new Error("old request failed"));
    expect(await old).toBe(false);
    expect(bindings.setOperatorAccess).not.toHaveBeenCalled();
    expect(bindings.setNotice).not.toHaveBeenCalled();
  });

  it("post-mutation refresh supersedes an already pending list", async () => {
    const { requests, load } = listHarness();
    const old = load(sessionA);
    const current = load(sessionA, null, true);
    expect(requests).toHaveLength(2);
    requests[0].resolve({ items: [{ id: "before-revoke" }], nextCursor: null });
    expect(await old).toBe(false);
    requests[1].resolve({ items: [{ id: "after-revoke" }], nextCursor: null });
    expect(await current).toBe(true);
  });

});
