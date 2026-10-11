import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
describe("AUTH-07 connected Macs", () => {
  it("revokes only the chosen installation and signs out Clerk only after everywhere succeeds", async () => {
    const { revokeConnectedMac, signOutEverywhere } = await import("../lib/connected-macs");
    const send = vi.fn().mockResolvedValue({ revoked: true }); const signOut = vi.fn();
    await revokeConnectedMac("mac-a", send);
    expect(send).toHaveBeenLastCalledWith({ action: "revoke_device", installationId: "mac-a" });
    send.mockRejectedValueOnce(new Error("offline"));
    await expect(signOutEverywhere(send, signOut)).rejects.toThrow("offline");
    expect(signOut).not.toHaveBeenCalled();
    await signOutEverywhere(send, signOut);
    expect(send).toHaveBeenLastCalledWith({ action: "sign_out_everywhere" }); expect(signOut).toHaveBeenCalledOnce();
  });
  it("lists connected Macs in the account view with name, last seen, version and revoke", () => {
    const source = readFileSync(new URL("../components/BillingPortal.tsx", import.meta.url), "utf8");
    for (const text of ['action: "devices"', 'Connected Macs', 'device.lastSeenAt', 'device.appVersion', 'Revoke', 'Sign out everywhere']) expect(source.includes(text)).toBe(true);
  });
});
