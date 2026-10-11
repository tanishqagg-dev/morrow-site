import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("AUTH-06 desktop request storage", () => {
  it("binds the first signed-in user and rejects other users, expired and legacy entries", async () => {
    const { resolveDesktopRequest } = await import("../lib/desktop-storage");
    const id = "00000000-0000-4000-8000-000000000001";
    const first = resolveDesktopRequest(null, id, null, 1000);
    expect(first).toMatchObject({ requestId: id, userId: null, expiresAt: 1801000 });
    const bound = resolveDesktopRequest(first, id, "user-a", 2000);
    expect(bound?.userId).toBe("user-a");
    expect(resolveDesktopRequest(bound, id, "user-b", 2000)).toBeNull();
    expect(resolveDesktopRequest(bound, null, null, 2000)).toBeNull();
    expect(resolveDesktopRequest(bound, id, "user-a", 1801000)).toBeNull();
    expect(resolveDesktopRequest(id, null, "user-b", 2000)).toBeNull();
  });
  it("clears the URL and storage before explicit sign-out and tracks Clerk account changes", () => {
    const source = readFileSync(new URL("../components/BillingPortal.tsx", import.meta.url), "utf8");
    expect(source.includes("clearDesktopRequest(sessionStorage)")).toBe(true);
    expect(source.includes("resolveDesktopRequest")).toBe(true);
    expect(source.includes("previousUserId")).toBe(true);
  });
});
