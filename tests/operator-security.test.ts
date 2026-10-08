import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = fileURLToPath(new URL("..", import.meta.url));
const consoleSource = readFileSync(`${root}/components/OperatorConsole.tsx`, "utf8");
const supabaseSource = readFileSync(`${root}/lib/supabase-browser.ts`, "utf8");

describe("operator console security boundaries", () => {



  it("keeps browser auth in session storage", () => {
    expect(supabaseSource).toContain("window.sessionStorage");
    expect(supabaseSource).not.toContain("window.localStorage");
  });

  it("gates console actions on AAL2 and clears user-scoped state at auth boundaries", () => {
    expect(consoleSource).toContain('assurance.data.currentLevel === "aal2"');
    expect(consoleSource).toContain('mfaStatus !== "verified"');
    expect(consoleSource).toContain("previousUserId.current !== nextUserId");
    expect(consoleSource).toContain("clearOperatorScopedState();");
  });

  it("bootstraps only after AAL2 and sends no browser-selected user or setup secret", () => {
    const bootstrapFlow = consoleSource.slice(
      consoleSource.indexOf("const bootstrapOwner"),
      consoleSource.indexOf("const signOut ="),
    );
    expect(bootstrapFlow).toContain('mfaStatus !== "verified"');
    expect(bootstrapFlow).toContain('invokeOperator("operator-bootstrap-owner", session.access_token, {})');
    expect(bootstrapFlow).not.toMatch(/userId|user_id|bootstrapSecret|serviceRole/i);
    expect(consoleSource).toContain('error.code === "OPERATOR_FORBIDDEN"');
    expect(consoleSource).toContain("Create first owner");
  });



  it("invalidates pending requests before account changes or sign-out complete", () => {
    const clear = consoleSource.slice(consoleSource.indexOf("const clearOperatorScopedState"), consoleSource.indexOf("const acceptSession"));
    expect(clear).toContain("authGeneration.current += 1");
    expect(clear).toContain("licenseLoadGeneration.current += 1");
    expect(clear).toContain("licenseLoadInFlight.current = null");
    expect(clear).toContain("setNotice(null)");
    const signOut = consoleSource.slice(consoleSource.indexOf("const signOut ="), consoleSource.indexOf("if (checkingSession)"));
    expect(signOut.indexOf("acceptSession(null)")).toBeLessThan(signOut.indexOf("await client.auth.signOut()"));
    expect(signOut).toContain("signOutInFlight.current = true");
    expect(signOut).toContain("signOutInFlight.current = false");
    const signIn = consoleSource.slice(consoleSource.indexOf("const signIn"), consoleSource.indexOf("const beginMfaEnrollment"));
    expect(signIn).toContain("if (!client || signOutInFlight.current) return");
    expect(consoleSource).not.toContain("onClick={() => void client.auth.signOut()}");
  });

  it("deduplicates only the current account and cursor and ignores stale list results", () => {
    const list = consoleSource.slice(consoleSource.indexOf("const loadLicenses"), consoleSource.indexOf("const bootstrapOwner"));
    expect(list).toContain("inFlight?.scope === scope && inFlight.cursor === cursor");
    expect(list).toContain("scope === authGeneration.current && sequence === licenseLoadGeneration.current");
    expect(list.match(/if \(!isCurrent\(\)\) return false/g)?.length).toBeGreaterThanOrEqual(3);
    expect(list).toContain("if (licenseLoadInFlight.current?.sequence === sequence) licenseLoadInFlight.current = null");
    expect(list).toContain("licenseLoadInFlight.current = { scope, sequence, cursor, request }");
  });



  it("prevents a late MFA check or initial session lookup from restoring stale access", () => {
    expect(consoleSource).toContain("mounted && !sessionEventReceived");
    const mfa = consoleSource.slice(consoleSource.indexOf("const refreshMfa"), consoleSource.indexOf("const signIn"));
    expect(mfa).toContain("scope !== authGeneration.current || check !== mfaCheckGeneration.current");
  });
});
