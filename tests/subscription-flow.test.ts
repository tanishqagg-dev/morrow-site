import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { BillingJourney } from "../components/BillingJourney";
import { currentSubscriptionForAccount, subscriptionStage, paymentPollDelay } from "../lib/subscription-flow";
import type { BillingSnapshot } from "../lib/billing";
const base = { loaded:true, signedIn:true, snapshotLoaded:true, hasPaidAccess:false, paymentPending:false, manageAccount:false };
describe("guided subscription journey", () => {
  it("backs off delayed payments without exhausting the 120-per-hour status limit", () => {
    let elapsed = 1500, requests = 0;
    while (elapsed < 3_600_000) elapsed += paymentPollDelay(requests++);
    expect(requests).toBeLessThan(90);
    expect(paymentPollDelay(0)).toBe(5000);
    expect(paymentPollDelay(50)).toBe(60_000);
  });
  it("requires a loaded account before offering a plan or payment", () => {
    expect(subscriptionStage({...base,loaded:false})).toBe("loading");
    expect(subscriptionStage({...base,signedIn:false,hasPaidAccess:true})).toBe("sign-in");
    expect(subscriptionStage({...base,snapshotLoaded:false})).toBe("loading");
    expect(subscriptionStage(base)).toBe("plan");
  });
  it("requires an invite before a new purchase but preserves paid and pending access", () => {
    expect(subscriptionStage({...base,inviteRequired:true})).toBe("invite");
    expect(subscriptionStage({...base,inviteRequired:true,inviteAccepted:true})).toBe("plan");
    expect(subscriptionStage({...base,inviteRequired:true,hasPaidAccess:true})).toBe("ready");
    expect(subscriptionStage({...base,inviteRequired:true,paymentPending:true})).toBe("confirming");
  });
  it("keeps payment awaiting confirmation out of checkout until verified access arrives", () => {
    expect(subscriptionStage({...base,paymentPending:true})).toBe("confirming");
    expect(subscriptionStage({...base,paymentPending:true,hasPaidAccess:true})).toBe("ready");
  });
  it("skips purchase screens for subscribers and opens management only on request", () => {
    expect(subscriptionStage({...base,hasPaidAccess:true})).toBe("ready");
    expect(subscriptionStage({...base,hasPaidAccess:true,manageAccount:true})).toBe("account");
  });
  it("does not let abandoned checkout hide paid access or use another account's payment", () => {
    const snapshot={subscriptions:[
      {id:"abandoned",account_id:"mine",status:"created",paid_until:null},
      {id:"other",account_id:"other",status:"active",paid_until:"2028-01-01T00:00:00Z"},
      {id:"paid",account_id:"mine",status:"active",paid_until:"2026-10-30T00:00:00Z"},
    ]} as BillingSnapshot;
    expect(currentSubscriptionForAccount(snapshot,"mine",Date.parse("2026-09-30"))?.id).toBe("paid");
    expect(currentSubscriptionForAccount(snapshot,"missing")).toBeUndefined();
  });
});
const props={stage:"sign-in" as const,email:null,desktopRequest:false,desktopConnected:false,busy:false,error:"",notice:"",signInAvailable:true,canConnect:false,
  onSignIn:()=>{},onSignOut:()=>{},onRefresh:()=>{},onAccount:()=>{},onBack:()=>{},onConnect:()=>{}};
describe("subscription screen boundaries",()=>{
  it("shows one sign-in action without a purchase form",()=>{
    const html=renderToStaticMarkup(createElement(BillingJourney,props));
    expect(html).toContain("Sign in or create account");
    expect(html).not.toContain("Due today");
    expect(html).not.toContain("Cancel subscription");
  });
  it("pending payment offers a status check, never another payment",()=>{
    const html=renderToStaticMarkup(createElement(BillingJourney,{...props,stage:"confirming",email:"me@example.com"}));
    expect(html).toContain("Check payment status");
    expect(html).not.toContain(">Subscribe");
  });
  it("only offers Mac connection when an entitled seat exists",()=>{
    const html=renderToStaticMarkup(createElement(BillingJourney,{...props,stage:"ready",desktopRequest:true}));
    expect(html).not.toContain(">Open Morrow");
    expect(html).toContain("Check access again");
    const connected=renderToStaticMarkup(createElement(BillingJourney,{...props,stage:"ready",desktopRequest:true,canConnect:true,desktopConnected:true}));
    expect(connected).toContain("You can close this page");
    expect(connected).not.toContain(">Open Morrow");
    expect(connected).toContain("Manage subscription");
  });
});
