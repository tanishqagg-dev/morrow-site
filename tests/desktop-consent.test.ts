import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DesktopConsent } from "../components/DesktopConsent";
import { describe, expect, it, vi } from "vitest";
import type { DesktopRequest } from "../lib/desktop-consent";
const request: DesktopRequest = { id: "request", status: "pending", deviceName: "My Mac", deviceModel: null, appVersion: "1.2", requestedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), seatInUse: null };
describe("AUTH-01 desktop consent", () => {
  it("requires a typed code and sends it only on approval", async () => {
    const { approveDesktopRequest } = await import("../lib/desktop-consent");
    const send = vi.fn().mockResolvedValue({});
    await expect(approveDesktopRequest(request, "seat", "", send)).rejects.toThrow("code");
    expect(send).not.toHaveBeenCalled();
    await approveDesktopRequest(request, "seat", "K7M4QX", send);
    expect(send).toHaveBeenCalledExactlyOnceWith({ action: "approve_desktop", requestId: "request", seatId: "seat", userCode: "K7M4QX" });
  });
  it("rejects expired requests and checks lifetime again after replacement", async () => {
    const { approveDesktopRequest } = await import("../lib/desktop-consent");
    const send = vi.fn();
    await expect(approveDesktopRequest({ ...request, expiresAt: new Date(0).toISOString() }, "seat", "K7M4QX", send)).rejects.toThrow("expired");
    expect(send).not.toHaveBeenCalled();
    const expiring = { ...request, seatInUse: { installationId: "old", deviceName: "Old Mac", lastSeenAt: null } };
    send.mockImplementation(async () => { expiring.expiresAt = new Date(0).toISOString(); });
    await expect(approveDesktopRequest(expiring, "seat", "K7M4QX", send, true)).rejects.toThrow("expired");
    expect(send).toHaveBeenCalledExactlyOnceWith({ action: "revoke_device", installationId: "old" });
  });
  it("replaces a Mac only by explicit choice, revoking before approval", async () => {
    const { approveDesktopRequest } = await import("../lib/desktop-consent");
    const send = vi.fn().mockResolvedValue({});
    const occupied = { ...request, seatInUse: { installationId: "old", deviceName: "Old Mac", lastSeenAt: null } };
    await expect(approveDesktopRequest(occupied, "seat", "K7M4QX", send)).rejects.toThrow("another Mac");
    expect(send).not.toHaveBeenCalled();
    await approveDesktopRequest(occupied, "seat", "K7M4QX", send, true);
    expect(send.mock.calls.map(([body]) => body.action)).toEqual(["revoke_device", "approve_desktop"]);
  });
  it("removes automatic approval from paid-access and payment recovery paths", () => {
    const source = readFileSync(new URL("../components/BillingPortal.tsx", import.meta.url), "utf8");
    expect(source).not.toContain("autoApprove");
    const recovery = source.slice(source.indexOf("  const connectAfterPayment ="), source.indexOf("  const connectDesktop ="));
    expect(recovery).not.toContain("approveDesktop(");
    expect(source).toContain("<DesktopConsent");
  });
});

describe("desktop consent screen", () => {
  const props = { request, busy: false, canConnect: true, now: Date.now(), onConnect() {}, onForget() {} };
  it("shows request details and empty code boxes with approval initially disabled", () => {
    const html = renderToStaticMarkup(createElement(DesktopConsent, props));
    expect(html).toContain("Connect this Mac?"); expect(html).toContain("Enter the code shown in Morrow");
    expect(html).toContain("My Mac"); expect(html).toContain("App version 1.2"); expect(html).toContain("Requested around");
    expect(html).not.toContain('type="checkbox"'); expect(html).toMatch(/disabled="">Connect this Mac/);
    expect(html).toContain("This isn&#x27;t my Mac");
    const css = readFileSync(new URL("../components/SubscriptionFlow.module.css", import.meta.url), "utf8");
    // The code rule must outrank the existing .state>p font size.
    expect(css.includes(".site .codeBoxes input")).toBe(true);
  });
  it("renders waiting, server-confirmed connected and expired as distinct states", () => {
    const waiting = renderToStaticMarkup(createElement(DesktopConsent, { ...props, request: { ...request, status: "approved" } }));
    expect(waiting).toContain("Waiting for your Mac…"); expect(waiting).not.toContain("You can close this tab");
    const connected = renderToStaticMarkup(createElement(DesktopConsent, { ...props, request: { ...request, status: "connected" } }));
    expect(connected).toContain(">Connected<"); expect(connected).toContain("You can close this tab");
    const expired = renderToStaticMarkup(createElement(DesktopConsent, { ...props, now: Date.parse(request.expiresAt) }));
    expect(expired).toContain("start sign-in again"); expect(expired).not.toContain(">Connect this Mac</button>");
  });
});
