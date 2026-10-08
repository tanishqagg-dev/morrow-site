import { describe, expect, it } from "vitest";
import {
  activationCheckRequest,
  activationServiceErrorMessage,
  downloadExpiryDelay,
  edgeErrorMessage,
  parseLicenseCheckResponse,
} from "../lib/license-check";

describe("license preflight contract", () => {
  const now = 1_800_000_000_000;
  const downloadUrl = "https://project.supabase.co/storage/v1/object/sign/jarvis-releases/macos/aarch64/Jarvis-0.3.0.dmg?token=private-storage-capability";
  const windowsDownloadUrl = "https://project.supabase.co/storage/v1/object/sign/jarvis-releases/windows/x86_64/Jarvis-0.3.0.exe?token=private-storage-capability";

  it("sends exactly the normalized activationCode and no customer PII", () => {
    expect(activationCheckRequest("j4u abcde fghjk mnpqr stuvw")).toEqual({
      activationCode: "J4U-ABCDE-FGHJK-MNPQR-STUVW",
      platform: "macos",
    });
    expect(activationCheckRequest("j4u abcde fghjk mnpqr stuvw", "windows")).toEqual({
      activationCode: "J4U-ABCDE-FGHJK-MNPQR-STUVW",
      platform: "windows",
    });
  });

  it("accepts a Windows code response only with the fixed private EXE path", () => {
    const response = {
      eligible: true,
      status: "recognized",
      message: "Code recognized.",
      downloadUrl: windowsDownloadUrl,
      downloadExpiresAt: Math.floor(now / 1000) + 180,
    } as const;
    const options = {
      expectedSupabaseUrl: "https://project.supabase.co",
      expectedPlatform: "windows" as const,
      now,
    };
    expect(parseLicenseCheckResponse(response, options)).toEqual(response);
    expect(parseLicenseCheckResponse({ ...response, downloadUrl }, options)).toBeNull();
  });

  it("accepts a recognized code only with an origin-pinned short-lived private DMG", () => {
    expect(parseLicenseCheckResponse({
      eligible: true,
      status: "recognized",
      message: "Code recognized.",
      requestId: "request-id",
      downloadUrl,
      downloadExpiresAt: Math.floor(now / 1000) + 180,
    }, { expectedSupabaseUrl: "https://project.supabase.co", now })).toEqual({
      eligible: true,
      status: "recognized",
      message: "Code recognized.",
      requestId: "request-id",
      downloadUrl,
      downloadExpiresAt: Math.floor(now / 1000) + 180,
    });
  });

  it("rejects permanent, cross-origin, wrong-object, and expired download responses", () => {
    const base = {
      eligible: true,
      status: "recognized",
      message: "Code recognized.",
      downloadUrl,
      downloadExpiresAt: Math.floor(now / 1000) + 180,
    } as const;
    const options = { expectedSupabaseUrl: "https://project.supabase.co", now };
    expect(parseLicenseCheckResponse({ ...base, downloadUrl: "https://attacker.example/file?token=private-storage-capability" }, options)).toBeNull();
    expect(parseLicenseCheckResponse({ ...base, downloadUrl: downloadUrl.replace(".dmg", ".app.tar.gz") }, options)).toBeNull();
    expect(parseLicenseCheckResponse({ ...base, downloadExpiresAt: Math.floor(now / 1000) - 1 }, options)).toBeNull();
    expect(parseLicenseCheckResponse({ ...base, downloadExpiresAt: Math.floor(now / 1000) + 3600 }, options)).toBeNull();
    expect(parseLicenseCheckResponse({ ...base, downloadUrl: downloadUrl.replace("https://", "https://user:pass@") }, options)).toBeNull();
    expect(parseLicenseCheckResponse(base, { expectedSupabaseUrl: "https://user:pass@project.supabase.co", now })).toBeNull();
    expect(parseLicenseCheckResponse({ eligible: true, status: "recognized", message: "missing capability" }, options)).toBeNull();
  });

  it("accepts unavailable without exposing a download", () => {
    expect(parseLicenseCheckResponse({
      eligible: false,
      status: "unavailable",
      message: "This code is unavailable.",
    })).toEqual({
      eligible: false,
      status: "unavailable",
      message: "This code is unavailable.",
    });
    expect(parseLicenseCheckResponse({ eligible: true, status: "ready", message: "stale" })).toBeNull();
  });

  it("accepts a valid invitation while its signed installer is pending", () => {
    expect(parseLicenseCheckResponse({
      eligible: true,
      status: "pending",
      message: "Your invitation is valid. The Mac installer is not available yet.",
    })).toEqual({
      eligible: true,
      status: "pending",
      message: "Your invitation is valid. The Mac installer is not available yet.",
    });
  });

  it("rejects pending downloads and eligibility/status mismatches", () => {
    expect(parseLicenseCheckResponse({
      eligible: true,
      status: "pending",
      message: "Pending.",
      downloadUrl,
      downloadExpiresAt: Math.floor(now / 1000) + 180,
    })).toBeNull();
    expect(parseLicenseCheckResponse({ eligible: false, status: "pending", message: "Pending." })).toBeNull();
    expect(parseLicenseCheckResponse({ eligible: false, status: "recognized", message: "Ready." })).toBeNull();
    expect(parseLicenseCheckResponse({ eligible: true, status: "unavailable", message: "Unavailable." })).toBeNull();
    expect(parseLicenseCheckResponse({
      eligible: false,
      status: "unavailable",
      message: "Unavailable.",
      downloadUrl,
    })).toBeNull();
  });

  it("extracts safe service errors", () => {
    expect(edgeErrorMessage({ error: { message: "Try again later." } })).toBe("Try again later.");
    expect(edgeErrorMessage({ error: { message: "internal\nstack trace" } })).toBeUndefined();
    expect(edgeErrorMessage({ error: { message: "x".repeat(241) } })).toBeUndefined();
    expect(activationServiceErrorMessage(429, null)).toContain("Wait a minute");
    expect(activationServiceErrorMessage(500, { error: { message: "database password leaked" } })).not.toContain("password");
    expect(activationServiceErrorMessage(400, { error: { message: "That invitation is not available." } })).toBe("That invitation is not available.");
  });

  it("rejects unsafe public copy and omits malformed request identifiers", () => {
    expect(parseLicenseCheckResponse({
      eligible: false,
      status: "unavailable",
      message: "line one\nline two",
    })).toBeNull();
    expect(parseLicenseCheckResponse({
      eligible: false,
      status: "unavailable",
      message: "This code is unavailable.",
      requestId: "unsafe request id with spaces",
    })).toEqual({
      eligible: false,
      status: "unavailable",
      message: "This code is unavailable.",
    });
  });

  it("calculates a bounded client expiry timer", () => {
    expect(downloadExpiryDelay(Math.floor(now / 1000) + 180, now)).toBe(180_000);
    expect(downloadExpiryDelay(Math.floor(now / 1000) - 1, now)).toBe(0);
    expect(downloadExpiryDelay(Math.floor(now / 1000) + 1_000, now)).toBe(330_000);
    expect(downloadExpiryDelay("soon", now)).toBeNull();
  });
});
