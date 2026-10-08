import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("activation customer journey", () => {
  it("routes existing activation bookmarks to account-based access", async () => {
    const page = await readFile(new URL("../app/activate/page.tsx", import.meta.url), "utf8");
    expect(page).toContain("<BillingPortal />");
    expect(page).toContain("No activation key required.");
    expect(page).not.toContain("<ActivationForm />");
  });

  it("markets the Morrow Mac pilot without removing legacy platform support", async () => {
    const [home, layout, footer, privacy] = await Promise.all([
      readFile(new URL("../components/MorrowWebsite.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
      readFile(new URL("../components/SiteFooter.tsx", import.meta.url), "utf8"),
      readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
    ]);

    expect(home).toContain("MEET MORROW · MAC PILOT");
    expect(home).toContain("Book a personal demo");
    expect(layout).toContain("voice-first Mac workspace");
    expect(footer).toContain("64-bit Windows 10 or 11 PCs");
    expect(privacy).toContain("What stays on your Mac");
  });

  it("exposes input errors, pending copy, expiry recovery, and referrer-safe download behavior", async () => {
    const form = await readFile(new URL("../components/ActivationForm.tsx", import.meta.url), "utf8");
    expect(form).toContain("aria-invalid={Boolean(inputError)}");
    expect(form).toContain("activation-code-error");
    expect(form).toContain("Checking your invitation");
    expect(form).toContain('type ActivationState = "idle" | "loading" | "success" | "error" | "expired"');
    expect(form).toContain('referrerPolicy="no-referrer"');
    expect(form).toContain("REQUEST_TIMEOUT_MS");
    expect(form).toContain("Create a fresh link");
    expect(form).toContain('setPlatform("windows")');
    expect(form).toContain('aria-pressed={platform === "windows"}');
    expect(form).toContain("Download Morrow for {platformLabel}");
    expect(form).toContain('href="/windows-setup"');
    expect(form).toContain("Windows setup help");
    expect(form.indexOf('href="/windows-setup"')).toBeGreaterThan(form.indexOf("</fieldset>"));
    expect(form.indexOf('href="/windows-setup"')).toBeLessThan(form.indexOf('htmlFor="activation-code"'));
    expect(form).not.toContain('href="/windows-setup" target="_blank"');
  });

  it("provides a plain-language Windows route without weakening Windows security", async () => {
    const page = await readFile(new URL("../app/windows-setup/page.tsx", import.meta.url), "utf8");
    expect(page).toContain('id="main-content"');
    expect(page).toContain("export const metadata");
    expect(page).toContain("<SiteHeader />");
    expect(page).toContain("<SiteFooter />");
    expect(page.match(/<h1>/g)).toHaveLength(1);
    expect(page).toContain("Company-managed laptop");
    expect(page).toContain("Personal or unmanaged laptop");
    expect(page).toContain("Never turn off Smart App Control");
    expect(page).toContain('href="/subscribe"');
    expect(page).not.toMatch(/href=["'`]https?:\/\/[^"'`\s]+\.(?:exe|msi|msix)/i);
  });
});
