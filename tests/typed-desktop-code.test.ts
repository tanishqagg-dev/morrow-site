import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it, vi } from "vitest";
import { DesktopConsent } from "../components/DesktopConsent";
import * as consent from "../lib/desktop-consent";
const request: consent.DesktopRequest = { id: "request", status: "pending", deviceName: "QA Mac", deviceModel: "MacBook Air", appVersion: "1", requestedAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 60000).toISOString(), seatInUse: null };
it("AUTH-01b normalizes pasted codes and rejects disallowed characters", () => {
  expect(consent.normalizeDesktopCode("k7m-4qx")).toBe("K7M4QX");
  expect(consent.normalizeDesktopCode("k7m 4qx")).toBe("K7M4QX");
  expect(consent.normalizeDesktopCode("BI05O2")).toBe("");
});
it("AUTH-01b approves only a complete typed code without a server code", async () => {
  const send = vi.fn().mockResolvedValue({});
  await expect(consent.approveDesktopRequest(request, "seat", "K7M", send)).rejects.toThrow("code");
  expect(send).not.toHaveBeenCalled();
  await consent.approveDesktopRequest(request, "seat", "k7m-4qx", send);
  expect(send).toHaveBeenCalledExactlyOnceWith({ action: "approve_desktop", requestId: "request", seatId: "seat", userCode: "K7M4QX" });
});
it("AUTH-01b renders six empty labelled inputs and never exposes a server code", () => {
  const html = renderToStaticMarkup(createElement(DesktopConsent, { request: Object.assign({}, request, { userCode: "SECRET" }), busy: false, canConnect: true, now: Date.now(), onConnect() {}, onForget() {} }));
  expect(html).toContain("Enter the code shown in Morrow");
  expect(html.match(/aria-label="Code character /g)).toHaveLength(6);
  expect(html).not.toContain("SECRET"); expect(html).not.toContain('type="checkbox"');
  expect(html).toMatch(/disabled="">Connect this Mac/);
});
