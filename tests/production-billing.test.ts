import { describe, expect, it, vi } from "vitest";
import { validateProductionBilling } from "../scripts/validate-production-environment.mjs";

const production = {
  NETLIFY: "true", CONTEXT: "production", NEXT_PUBLIC_CHECKOUT_ENABLED: "true",
  JARVIS_SITE_ORIGIN: "https://morrow.aestrum.in",
  NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
  NEXT_PUBLIC_LICENSE_API_URL: "https://abcdefghijklmnopqrst.supabase.co/functions/v1",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"a".repeat(32)}`,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_live_${"a".repeat(32)}`,
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL: "https://clerk.morrow.aestrum.in",
};

describe("production billing readiness", () => {
  it("refuses test-mode billing even with valid production-looking settings", async () => {
    await expect(validateProductionBilling(production, async () =>
      Response.json({ mode: "test", plans: [{ id: "plan-test" }] })))
      .rejects.toThrow("live billing service");
  });

  it("refuses an empty live catalog or a failed service response", async () => {
    await expect(validateProductionBilling(production, async () =>
      Response.json({ mode: "live", plans: [] }))).rejects.toThrow("published plans");
    await expect(validateProductionBilling(production, async () =>
      Response.json({ mode: "live", plans: [{ id: "plan-live" }] }, { status: 503 })))
      .rejects.toThrow("live billing service");
  });

  it("checks the configured service before permitting live checkout", async () => {
    const request = vi.fn(async () => Response.json({ mode: "live", plans: [{ id: "plan-live" }] }));
    await validateProductionBilling(production, request);
    expect(request).toHaveBeenCalledWith(`${production.NEXT_PUBLIC_LICENSE_API_URL}/billing-catalog`,
      expect.objectContaining({ headers: { apikey: production.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY } }));
  });

  it("does not require live billing for local builds or explicitly closed checkout", async () => {
    const request = vi.fn();
    await validateProductionBilling({}, request);
    await validateProductionBilling({ ...production, NEXT_PUBLIC_CHECKOUT_ENABLED: "false",
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "", NEXT_PUBLIC_CLERK_FRONTEND_API_URL: "" }, request);
    expect(request).not.toHaveBeenCalled();
  });
});
