import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("../lib/supabase-browser", () => ({ licensingFunctionsBase: () => "https://billing.example/functions/v1" }));
const hint = { clerk_error: { type: "forbidden", reason: "reverification-error", metadata: { reverification: { level: "first_factor", afterMinutes: 10 } } }, error: { code: "REVERIFICATION_REQUIRED", message: "Confirm it's you to continue." } };
// Execute the installed Clerk hook with only its React and UI dependencies stubbed.
function clerkHook(fetcher: (...args: any[]) => Promise<unknown>, onOpen: (props: any) => void) {
  const path = new URL("../node_modules/@clerk/shared/dist/react/hooks/useReverification.js", import.meta.url);
  const actualRequire = createRequire(path); const exports: Record<string, any> = {};
  const require = (name: string) => name === "react" ? { useRef: (current: unknown) => ({ current }), useCallback: (fn: unknown) => fn }
    : name === "./useClerk.js" ? { useClerk: () => ({ __internal_openReverification: onOpen }) }
    : name === "./useSafeLayoutEffect.js" ? { useSafeLayoutEffect: (fn: () => void) => fn() } : actualRequire(name);
  new Function("require", "exports", readFileSync(path, "utf8"))(require, exports);
  return exports.useReverification(fetcher);
}
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });
describe("AUTH-08 Clerk reverification", () => {
  it("returns the contract's 403 JSON hint instead of throwing, preserving ordinary errors", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "public-test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(Response.json(hint, { status: 403 }))
      .mockResolvedValueOnce(Response.json({ error: { code: "NOT_ALLOWED", message: "No access" } }, { status: 403 })));
    const { billingRequest } = await import("../lib/billing");
    await expect(billingRequest("billing-customer", { action: "cancel" }, "test-token")).resolves.toEqual(hint);
    await expect(billingRequest("billing-customer", { action: "cancel" }, "test-token")).rejects.toThrow("No access");
  });
  it("uses the installed Clerk hook to retry once after success and never on cancellation", async () => {
    let modal: any;
    const send = vi.fn().mockResolvedValueOnce(hint).mockResolvedValueOnce({ revoked: true });
    const enhanced = clerkHook(send, props => { modal = props; });
    const pending = enhanced({ action: "revoke_device" }); await vi.waitFor(() => expect(modal).toBeTruthy());
    expect(send).toHaveBeenCalledOnce(); modal.afterVerification();
    await expect(pending).resolves.toEqual({ revoked: true }); expect(send).toHaveBeenCalledTimes(2);
    send.mockClear().mockResolvedValue(hint); modal = null;
    const cancelled = enhanced({ action: "cancel" }); const rejected = cancelled.catch((error: unknown) => error);
    await vi.waitFor(() => expect(modal).toBeTruthy()); modal.afterVerificationCancelled(); expect(await rejected).toMatchObject({ code: "reverification_cancelled" });
    expect(send).toHaveBeenCalledOnce();
  });
  it("routes all six sensitive mutations and atomic replacement through reverification", () => {
    const source = readFileSync(new URL("../components/BillingPortal.tsx", import.meta.url), "utf8");
    expect(source.includes("useReverification(")).toBe(true);
    expect(source.includes('sensitiveMutation({ action: "assign_seat"')).toBe(true);
    expect(source.includes('sensitiveMutation({ action: "remove_seat"')).toBe(true);
    expect(source.includes('sensitiveMutation({ action, subscriptionId:')).toBe(true);
    expect(source.includes('return sensitiveMutation(body)')).toBe(true);
    expect(source.includes('if ((body as { replaceInstallationId?: string }).replaceInstallationId) return sensitiveMutation(body)')).toBe(true);
  });
});

it('RACE-03b preserves the top-level retryAfter on CHECKOUT_EXPIRING errors',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','public-test-key');vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({error:{code:'CHECKOUT_EXPIRING'},retryAfter:7},{status:409})));
 const {billingRequest}=await import('../lib/billing');await expect(billingRequest('billing-customer',{action:'checkout'},'test-token')).rejects.toMatchObject({code:'CHECKOUT_EXPIRING',retryAfter:7});
});

it('BROWSER-05 preserves the authenticated OPEN_CHECKOUT conflict details',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','public-test-key');const openCheckout={id:'local',subscriptionId:'sub_open',requestId:'request',accountId:'account',planId:'monthly',planName:'Personal',period:'monthly',quantity:1,couponCode:null,paymentMethod:'upi',trial:false,amountPaise:11800,currency:'INR',keyId:'rzp_test_fixture',expiresAt:null,resumable:true};vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({openCheckout,error:{code:'OPEN_CHECKOUT',message:'Unfinished checkout'}},{status:409})));
 const {billingRequest}=await import('../lib/billing');await expect(billingRequest('billing-customer',{action:'checkout'},'test-token')).rejects.toMatchObject({code:'OPEN_CHECKOUT',openCheckout});
});

it('launch sign-in-again bypasses the installed Clerk modal without replaying cancel',async()=>{
 vi.stubEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','public-test-key');const fetch=vi.fn().mockResolvedValue(Response.json({...hint,sign_in_again:true},{status:403}));vi.stubGlobal('fetch',fetch);const {billingRequest}=await import('../lib/billing');const modal=vi.fn();const enhanced=clerkHook(body=>billingRequest('billing-customer',body,'test-token'),modal);await expect(enhanced({action:'cancel'})).rejects.toMatchObject({code:'SIGN_IN_AGAIN_REQUIRED'});expect(modal).not.toHaveBeenCalled();expect(fetch).toHaveBeenCalledOnce();
});
