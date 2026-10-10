import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { billingAuthToken } from "../lib/billing-auth";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it("stops a hung token lookup and permits another read-only attempt", async () => {
  let finish!: (token: string) => void;
  const lookup = vi.fn(() => new Promise<string>(resolve => { finish = resolve; }));
  const failed = expect(billingAuthToken(lookup)).rejects.toThrow("taking too long");
  await vi.advanceTimersByTimeAsync(15_000);
  await failed;
  finish("late-token");
  await expect(billingAuthToken(async () => "new-token")).resolves.toBe("new-token");
  expect(lookup).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("clears timers for signed-out, rejected, and successful token lookups", async () => {
  await expect(billingAuthToken(async () => null)).rejects.toThrow("Sign in");
  await expect(billingAuthToken(async () => { throw new Error("offline"); })).rejects.toThrow("offline");
  await expect(billingAuthToken(async () => "token")).resolves.toBe("token");
  expect(vi.getTimerCount()).toBe(0);
});
