import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { validateProductionEnvironment } from "../scripts/validate-production-environment.mjs";
import { renderNetlifyHeaders } from "../scripts/write-static-headers.mjs";

describe("Netlify production configuration", () => {
  it("exports a static customer site without pinning a runtime adapter", async () => {
    const [config, packageJson, nextConfig] = await Promise.all([
      readFile(new URL("../netlify.toml", import.meta.url), "utf8"),
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../next.config.ts", import.meta.url), "utf8"),
    ]);
    expect(config).toContain('command = "npm run build"');
    expect(config).toContain('publish = "out"');
    expect(nextConfig).toContain('output: "export"');
    expect(nextConfig).toContain("unoptimized: true");
    expect(packageJson).toContain("write-static-headers.mjs");
    expect(JSON.parse(packageJson).scripts.build).toContain("next build && node scripts/preserve-published-home.mjs");
    expect(`${config}\n${packageJson}`).not.toContain("@netlify/plugin-nextjs");
    expect(config).not.toContain("NETLIFY_NEXT_PLUGIN_SKIP");
  });

  it("clears only generated Next output before release checks and builds", async () => {
    const [packageJson, cleanup] = await Promise.all([
      readFile(new URL("../package.json", import.meta.url), "utf8"),
      readFile(new URL("../scripts/clear-next-output.mjs", import.meta.url), "utf8"),
    ]);
    expect(packageJson).toContain('"prebuild": "node scripts/validate-production-environment.mjs && node scripts/prepare-mac-download.mjs && node scripts/prepare-windows-download.mjs && node scripts/clear-next-output.mjs"');
    expect(packageJson).toContain('"pretypecheck": "node scripts/clear-next-output.mjs"');
    expect(cleanup).toContain('resolve(websiteDirectory, ".next")');
    expect(cleanup).toContain('resolve(websiteDirectory, "out")');
    expect(cleanup).toContain("dirname(generatedOutput) !== websiteDirectory");
    expect(cleanup).not.toContain("process.cwd()");
  });

  it("writes exact-origin static security headers for the browser build", () => {
    const headers = renderNetlifyHeaders({
      NEXT_PUBLIC_SUPABASE_URL: "https://pilot.supabase.co",
      NEXT_PUBLIC_LICENSE_API_URL: "https://pilot.supabase.co/functions/v1",
      NEXT_PUBLIC_CLERK_FRONTEND_API_URL: "https://morrow.clerk.accounts.dev",
    });
    expect(headers).toContain("connect-src 'self' https://pilot.supabase.co");
    expect(headers).toContain("https://morrow.clerk.accounts.dev");
    expect(headers).toContain("https://*.protect.clerk.com:*");
    expect(headers).toContain("X-Frame-Options: DENY");
    expect(headers).toContain("/activate\n  Cache-Control: no-cache, no-store, must-revalidate");
    expect(headers).toContain("/operator\n  Cache-Control: no-cache, no-store, must-revalidate\n  X-Robots-Tag: noindex, nofollow, noarchive");
    expect(renderNetlifyHeaders({
      NEXT_PUBLIC_SUPABASE_URL: "https://user:pass@evil.example",
      NEXT_PUBLIC_LICENSE_API_URL: "javascript:alert(1)",
    })).toContain("connect-src 'self'");
  });

  it("refuses a Netlify production build without exact activation configuration", () => {
    expect(validateProductionEnvironment({})).toEqual({ enforced: false });

    const production = {
      NETLIFY: "true",
      CONTEXT: "production",
      JARVIS_SITE_ORIGIN: "https://jarvis.example.com",
      NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      NEXT_PUBLIC_LICENSE_API_URL: "https://abcdefghijklmnopqrst.supabase.co/functions/v1",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"a".repeat(32)}`,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_live_${"a".repeat(32)}`,
      NEXT_PUBLIC_CLERK_FRONTEND_API_URL: "https://morrow.example.com",
    };
    expect(validateProductionEnvironment(production)).toEqual({
      enforced: true,
      siteOrigin: "https://jarvis.example.com",
      supabaseOrigin: "https://abcdefghijklmnopqrst.supabase.co",
      clerkOrigin: "https://morrow.example.com",
    });

    for (const variable of [
      "JARVIS_SITE_ORIGIN",
      "NEXT_PUBLIC_LICENSE_API_URL",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_CLERK_FRONTEND_API_URL",
    ]) {
      const missing = { ...production, [variable]: "" };
      expect(() => validateProductionEnvironment(missing)).toThrow(variable);
    }

    expect(() => validateProductionEnvironment({
      ...production,
      NEXT_PUBLIC_LICENSE_API_URL: "https://evil.example/functions/v1",
    })).toThrow("NEXT_PUBLIC_LICENSE_API_URL");
    expect(() => validateProductionEnvironment({
      ...production,
      NEXT_PUBLIC_SUPABASE_URL: "https://user:password@abcdefghijklmnopqrst.supabase.co",
    })).toThrow("NEXT_PUBLIC_SUPABASE_URL");
    expect(() => validateProductionEnvironment({
      ...production,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_secret_not_for_the_browser",
    })).toThrow("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(() => validateProductionEnvironment({
      ...production,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: `pk_test_${"a".repeat(32)}`,
    })).toThrow("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY");
  });

  it("allows a closed checkout release only with customer keys omitted", () => {
    const closed = {
      NETLIFY: "true", CONTEXT: "production", NEXT_PUBLIC_CHECKOUT_ENABLED: "false",
      JARVIS_SITE_ORIGIN: "https://morrow.aestrum.in",
      NEXT_PUBLIC_SUPABASE_URL: "https://abcdefghijklmnopqrst.supabase.co",
      NEXT_PUBLIC_LICENSE_API_URL: "https://abcdefghijklmnopqrst.supabase.co/functions/v1",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: `sb_publishable_${"a".repeat(32)}`,
    };
    expect(validateProductionEnvironment(closed).enforced).toBe(true);
    expect(() => validateProductionEnvironment({...closed, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: "pk_test_example"})).toThrow("CLERK_MUST_BE_EMPTY");
    expect(() => validateProductionEnvironment({...closed, NEXT_PUBLIC_CHECKOUT_ENABLED: "true"})).toThrow("missing");
  });
});
