import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

describe("Morrow public launch", () => {
  it("keeps invitations and full paid-beta pricing consistent on the public site", async () => {
    const [home, header] = await Promise.all([read("published-home/index.html"), read("components/SiteHeader.tsx")]);
    expect(home).toContain('href="/subscribe"');
    expect(home).not.toContain("Get Morrow");
    expect(home).not.toContain("Free during the beta");
    expect(home).toContain("data-plan-price");
    expect(home).toContain("data-plan-total");
    expect(home).toContain("Your ChatGPT sign-in stays on your device.");
    expect(home).not.toContain("Uses your ChatGPT account");
    expect(home).not.toContain("—");
    expect(header).toContain('href="/subscribe"');
  });

  it("does not claim secret redaction the app does not do", async () => {
    const pages = await Promise.all(["published-home/index.html", "app/privacy/page.tsx", "app/terms/page.tsx"].map(read));
    for (const page of pages) expect(page.toLowerCase()).not.toMatch(/redact/);
  });

  it("registers the beta form fields that the homepage submits", async () => {
    const [home, skeleton] = await Promise.all([read("published-home/index.html"), read("public/__forms.html")]);
    for (const field of ["form-name", "request", "name", "email", "workflow", "bot-field"]) {
      expect(home).toContain(`name="${field}"`);
      expect(skeleton).toContain(`name="${field}"`);
    }
    expect(home).toContain('name="morrow-beta"');
    expect(home).toContain('data-netlify="true"');
    expect(home).not.toContain('value="Join the beta"');
    expect(home).toContain('value="Book a demo"');
    expect(skeleton).toContain('name="morrow-beta"');
  });

  it("routes invitations to paid checkout without granting free access", async () => {
    const [portal, config] = await Promise.all([read("components/BillingPortal.tsx"), read("lib/site-config.ts")]);
    expect(config).toContain('betaMode: process.env.NEXT_PUBLIC_BETA_MODE !== "false"');
    expect(portal).toContain('action: "verify_invite"');
    expect(portal).not.toContain('Paid plans are closed');
    expect(portal).toContain('stage === "invite"');
    expect(portal).toContain('does not waive payment');
  });

  it("publishes privacy, terms and contact pages with a real support address", async () => {
    const [privacy, terms, contact, config, redirects] = await Promise.all([
      read("app/privacy/page.tsx"), read("app/terms/page.tsx"), read("app/contact/page.tsx"),
      read("lib/site-config.ts"), read("scripts/preserve-published-home.mjs"),
    ]);
    expect(config).toContain("support@aestrum.in");
    expect(privacy).toContain("Deleting your account");
    expect(privacy).toContain("What goes to OpenAI");
    expect(terms).toContain("OpenAI's terms");
    expect(contact).toContain("Harsh Jain");
    for (const route of ["/terms", "/refunds", "/contact", "/thanks"]) expect(redirects).toContain(`"${route} ${route}.html 200"`);
  });
});
