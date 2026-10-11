import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("../lib/supabase-browser", () => ({ licensingFunctionsBase: () => "https://billing.example/functions/v1" }));
beforeEach(() => { vi.useFakeTimers(); vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.resetModules(); });

describe("billing request recovery", () => {
  it("aborts a stalled mutation without replaying it", async () => {
    const fetchMock = vi.fn((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { billingRequest } = await import("../lib/billing");
    const result = expect(billingRequest("billing-customer", { action: "checkout" }, "session-token"))
      .rejects.toThrow("before trying another payment");
    await vi.advanceTimersByTimeAsync(90_000); await result;
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("rejects an unreadable success response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>proxy failure</html>", { status: 200 })));
    const { billingRequest } = await import("../lib/billing");
    await expect(billingRequest("billing-customer", { action: "confirm_checkout" })).rejects.toThrow("unreadable response");
    expect(vi.getTimerCount()).toBe(0);
  });
  it("returns server data and clears its timeout", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ accounts: [], subscriptions: [], seats: [], payments: [] })));
    const { billingRequest } = await import("../lib/billing");
    await expect(billingRequest("billing-customer", { action: "snapshot" })).resolves.toEqual({ accounts: [], subscriptions: [], seats: [], payments: [], openCheckouts: [], betaInviteRequired: false, trial: { enabled: false, days: 7 } });
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("Razorpay loader recovery", () => {
  it("shares a pending load, removes a stalled script, and permits a fresh attempt", async () => {
    const scripts: Array<{ onload: (() => void) | null; onerror: (() => void) | null; remove: ReturnType<typeof vi.fn> }> = [];
    vi.stubGlobal("window", {});
    vi.stubGlobal("document", {
      createElement: () => ({ onload: null, onerror: null, remove: vi.fn() }),
      head: { appendChild: (script: typeof scripts[number]) => scripts.push(script) },
    });
    const { loadRazorpayCheckout } = await import("../lib/billing");
    const first = loadRazorpayCheckout();
    expect(loadRazorpayCheckout()).toBe(first);
    const failed = expect(first).rejects.toThrow("too long");
    await vi.advanceTimersByTimeAsync(20_000); await failed;
    expect(scripts[0].remove).toHaveBeenCalledOnce();
    expect(scripts[0].onload).toBeNull();
    const retry = loadRazorpayCheckout();
    expect(scripts).toHaveLength(2);
    window.Razorpay = class { open() {} on() {} };
    scripts[1].onload!();
    await expect(retry).resolves.toBeUndefined();
    expect(vi.getTimerCount()).toBe(0);
  });
});
