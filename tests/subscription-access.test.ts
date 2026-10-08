import { readFileSync } from "node:fs";
import ts from "typescript";
import { describe, expect, it, vi } from "vitest";
import { paidSeatForAccount, type BillingSnapshot } from "../lib/billing";

const portal = readFileSync(new URL("../components/BillingPortal.tsx", import.meta.url), "utf8");
const fixture = (paidUntil: string | null = new Date(Date.now() + 86400000).toISOString()) => ({
  accounts: [], payments: [],
  subscriptions: [{account_id:"account-a",paid_until:paidUntil}],
  seats: [{id:"seat-a",account_id:"account-a",email:"owner@example.com",licenseStatus:null}],
} as unknown as BillingSnapshot);

function flow(userId = "user-a") {
  const approveDesktop = vi.fn(async () => {});
  const bindings = {desktopRequest:"device-request",desktopConnected:false,
    activeUserId:{current:userId}, identityRef:{current:{email:"owner@example.com"}},
    paidSeatForAccount, approveDesktop, setNotice:vi.fn()};
  const start = portal.indexOf("const connectAfterPayment =");
  const code = portal.slice(start, portal.indexOf("const connectDesktop =", start));
  const compiled = ts.transpileModule(`${code}\nreturn connectAfterPayment;`, {compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const connect = new Function(...Object.keys(bindings), compiled)(...Object.values(bindings));
  return {connect,approveDesktop,bindings};
}

describe("subscription access without activation keys", () => {
  it("connects the waiting Mac after a verified paid term appears", async () => {
    const {connect,approveDesktop} = flow();
    await connect(fixture(), "account-a", "user-a");
    expect(approveDesktop).toHaveBeenCalledWith(expect.objectContaining({id:"seat-a"}),"user-a");
  });
  it("does not unlock for a checkout callback without confirmed paid access", async () => {
    const {connect,approveDesktop} = flow();
    await connect(fixture(null),"account-a","user-a");
    await connect(fixture(new Date(Date.now()-1000).toISOString()),"account-a","user-a");
    expect(approveDesktop).not.toHaveBeenCalled();
  });
  it("does not connect another account, revoked seat, or a changed signed-in user", async () => {
    const {connect,approveDesktop} = flow();
    await connect(fixture(),"another-account","user-a");
    await connect(fixture(),"account-a","another-user");
    const revoked=fixture();revoked.seats[0].licenseStatus="revoked";
    await connect(revoked,"account-a","user-a");
    const other=fixture();other.seats[0].email="someone-else@example.com";
    await connect(other,"account-a","user-a");
    expect(approveDesktop).not.toHaveBeenCalled();
  });
  it("keeps payment active when an expired desktop request needs a fresh sign-in", async () => {
    const {connect,approveDesktop,bindings}=flow();
    approveDesktop.mockRejectedValueOnce(new Error("Request expired"));
    await connect(fixture(),"account-a","user-a");
    expect(bindings.setNotice).toHaveBeenCalledWith(expect.stringContaining("Your subscription is active"));
  });
  it("removes manual key issuing and input from the customer and admin interfaces", () => {
    const admin=readFileSync(new URL("../components/OperatorConsole.tsx",import.meta.url),"utf8");
    expect(admin).not.toMatch(/operator-issue-code|Manual pilot codes|copyIssuedCode/);
  });
});
