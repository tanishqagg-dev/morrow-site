import { afterEach, describe, expect, it, vi } from "vitest";
import type { DesktopRequest } from "../lib/desktop-consent";
const request = (status: DesktopRequest['status'], ttl = 10000): DesktopRequest => ({ id: "request", status, deviceName: "Mac", deviceModel: null, appVersion: "1", requestedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + ttl).toISOString(), seatInUse: null });
afterEach(() => vi.useRealTimers());
describe("AUTH-09 desktop completion", () => {
  it("waits for server connected, polls every 2 seconds and stops on completion", async () => {
    vi.useFakeTimers(); const { pollDesktopCompletion } = await import("../lib/desktop-completion");
    const approved = request("approved"); const read = vi.fn().mockResolvedValueOnce(approved).mockResolvedValueOnce({ ...approved, status: "connected" }); const update = vi.fn();
    pollDesktopCompletion(approved, read, update, vi.fn());
    expect(read).not.toHaveBeenCalled(); expect(update).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(2000); expect(read).toHaveBeenCalledOnce(); expect(update.mock.lastCall?.[0].status).toBe("approved");
    await vi.advanceTimersByTimeAsync(2000); expect(read).toHaveBeenCalledTimes(2); expect(update.mock.lastCall?.[0].status).toBe("connected");
    await vi.advanceTimersByTimeAsync(20000); expect(read).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
  });
  it("expires at the deadline even when a request hangs and ignores its late connected reply", async () => {
    vi.useFakeTimers(); const { pollDesktopCompletion } = await import("../lib/desktop-completion");
    const approved = request("approved", 3000); let resolve!: (value: DesktopRequest) => void;
    const update = vi.fn(); const read = vi.fn(() => new Promise<DesktopRequest>(done => { resolve = done; }));
    pollDesktopCompletion(approved, read, update, vi.fn()); await vi.advanceTimersByTimeAsync(3000);
    expect(update.mock.lastCall?.[0].status).toBe("expired"); resolve({ ...approved, status: "connected" }); await Promise.resolve(); await Promise.resolve();
    expect(update.mock.lastCall?.[0].status).toBe("expired"); expect(read).toHaveBeenCalledOnce(); expect(vi.getTimerCount()).toBe(0);
  });
  it("stops on server expiry and cancellation, and bounds retryable errors by expiry", async () => {
    vi.useFakeTimers(); const { pollDesktopCompletion } = await import("../lib/desktop-completion");
    const approved = request("approved", 5000); const update = vi.fn();
    const read = vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue({ ...approved, status: "expired" });
    pollDesktopCompletion(approved, read, update, vi.fn()); await vi.advanceTimersByTimeAsync(4000);
    expect(update.mock.lastCall?.[0].status).toBe("expired"); expect(vi.getTimerCount()).toBe(0);
    const cancel = pollDesktopCompletion(approved, read, update, vi.fn()); cancel(); await vi.advanceTimersByTimeAsync(10000);
    expect(read).toHaveBeenCalledTimes(2); expect(vi.getTimerCount()).toBe(0);
  });
});
