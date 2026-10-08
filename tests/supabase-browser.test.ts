import { describe, expect, it } from "vitest";
import { validatedLicensingFunctionsBase } from "../lib/supabase-browser";

describe("licensing endpoint validation", () => {
  it("accepts only the exact functions endpoint on the configured Supabase origin", () => {
    expect(validatedLicensingFunctionsBase(
      "https://project.supabase.co/functions/v1/",
      "https://project.supabase.co",
    )).toBe("https://project.supabase.co/functions/v1");
    expect(validatedLicensingFunctionsBase(
      "https://attacker.example/functions/v1",
      "https://project.supabase.co",
    )).toBe("");
    expect(validatedLicensingFunctionsBase(
      "https://project.supabase.co/functions/v1/extra",
      "https://project.supabase.co",
    )).toBe("");
    expect(validatedLicensingFunctionsBase(
      "https://project.supabase.co/functions/v1?redirect=attacker",
      "https://project.supabase.co",
    )).toBe("");
    expect(validatedLicensingFunctionsBase(
      "https://user:pass@project.supabase.co/functions/v1",
      "https://project.supabase.co",
    )).toBe("");
  });

  it("allows plain HTTP only for a same-origin local development stack", () => {
    expect(validatedLicensingFunctionsBase(
      "http://127.0.0.1:54321/functions/v1",
      "http://127.0.0.1:54321",
    )).toBe("http://127.0.0.1:54321/functions/v1");
    expect(validatedLicensingFunctionsBase(
      "http://project.supabase.co/functions/v1",
      "http://project.supabase.co",
    )).toBe("");
  });
});
