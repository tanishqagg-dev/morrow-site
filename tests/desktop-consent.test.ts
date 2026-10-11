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
  it("rejects expired requests before replacement", async () => {
    const { approveDesktopRequest } = await import("../lib/desktop-consent");
    const send = vi.fn();
    await expect(approveDesktopRequest({ ...request, expiresAt: new Date(0).toISOString() }, "seat", "K7M4QX", send, true)).rejects.toThrow("expired");
    expect(send).not.toHaveBeenCalled();
  });
  it("replaces a Mac only by explicit choice in one server transaction", async () => {
    const { approveDesktopRequest } = await import("../lib/desktop-consent");
    const send = vi.fn().mockResolvedValue({});
    const occupied = { ...request, seatInUse: { installationId: "old", deviceName: "Old Mac", lastSeenAt: null } };
    await expect(approveDesktopRequest(occupied, "seat", "K7M4QX", send)).rejects.toThrow("another Mac");
    expect(send).not.toHaveBeenCalled();
    await approveDesktopRequest(occupied, "seat", "K7M4QX", send, true);
    expect(send).toHaveBeenCalledExactlyOnceWith({action:"approve_desktop",requestId:"request",seatId:"seat",userCode:"K7M4QX",replaceInstallationId:"old"});
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

it('BROWSER-04 validates the code before replacing a Mac in one approval call', async()=>{
 const {approveDesktopRequest}=await import('../lib/desktop-consent');
 const {BillingError}=await import('../lib/billing');
 const occupied={...request,seatInUse:{installationId:'old',deviceName:'Old Mac',lastSeenAt:null}};
 let oldConnected=true;
 const send=vi.fn(async(body:object)=>{
  const action=body as {action:string;userCode?:string;replaceInstallationId?:string};
  if(action.action==='revoke_device') oldConnected=false;
  if(action.userCode!=='K7M4QX') throw new BillingError('Wrong code','DEVICE_CODE_MISMATCH');
  if(action.replaceInstallationId==='old') oldConnected=false;
 });
 await expect(approveDesktopRequest(occupied,'seat','AAAAAA',send,true)).rejects.toMatchObject({code:'DEVICE_CODE_MISMATCH'});
 expect(oldConnected).toBe(true);expect(send).toHaveBeenCalledExactlyOnceWith({action:'approve_desktop',requestId:'request',seatId:'seat',userCode:'AAAAAA',replaceInstallationId:'old'});
 send.mockClear();await approveDesktopRequest(occupied,'seat','K7M4QX',send,true);
 expect(oldConnected).toBe(false);expect(send).toHaveBeenCalledExactlyOnceWith({action:'approve_desktop',requestId:'request',seatId:'seat',userCode:'K7M4QX',replaceInstallationId:'old'});
});
