import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
describe("DOC-4 invoice place of supply", () => {
  it("requires a state for consumers and sends a consumer profile instead of null", async () => {
    const { invoiceProfileForCheckout } = await import("../lib/invoice-profile");
    expect(() => invoiceProfileForCheckout(false, { stateCode: "" })).toThrow("state");
    expect(invoiceProfileForCheckout(false, { stateCode: "07" })).toEqual({ kind: "consumer", stateCode: "07" });
    expect(invoiceProfileForCheckout(false, { stateCode: "97" })).toEqual({ kind: "consumer", stateCode: "97" });
  });
  it("keeps business details and rejects GSTIN/state mismatches before checkout", async () => {
    const { invoiceProfileForCheckout } = await import("../lib/invoice-profile");
    const details = { businessName: "Example", gstin: "07ABCDE1234F1Z5", address: "Delhi", stateCode: "07", postalCode: "110001" };
    expect(invoiceProfileForCheckout(true, details)).toEqual({ kind: "business", ...details });
    expect(() => invoiceProfileForCheckout(true, { ...details, stateCode: "09" })).toThrow("GSTIN");
  });
  it("prefills consumer, business and legacy business profiles without stale account details", async () => {
    const { invoiceFormFromProfile } = await import("../lib/invoice-profile");
    expect(invoiceFormFromProfile({ kind: "consumer", stateCode: "07" })).toMatchObject({ businessInvoice: false, details: { stateCode: "07", gstin: "" } });
    expect(invoiceFormFromProfile({ gstin: "07ABCDE1234F1Z5", stateCode: "07" })).toMatchObject({ businessInvoice: true });
    expect(invoiceFormFromProfile(null)).toMatchObject({ businessInvoice: false, details: { stateCode: "", gstin: "" } });
  });
  it("collects state for every buyer, saves before checkout and handles BILLING_STATE_REQUIRED", () => {
    const source = readFileSync(new URL("../components/BillingPortal.tsx", import.meta.url), "utf8");
    expect(source.includes('Your state')).toBe(true); expect(source.includes('aria-label="Your state" required')).toBe(true);
    expect(source.includes('invoiceProfile:businessInvoice?invoiceDetails:null')).toBe(false);
    expect(source.includes('BILLING_STATE_REQUIRED')).toBe(true); expect(source.includes('selectedAccount?.invoice_profile')).toBe(true);
    const start = source.slice(source.indexOf('  const startCheckout ='), source.indexOf('  const forgetDesktop ='));
    expect(start.indexOf('save_invoice_profile')).toBeLessThan(start.indexOf('action: "checkout"'));
  });
});
