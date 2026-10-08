import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

const source = () => readFile(new URL("../components/MorrowWebsite.tsx", import.meta.url), "utf8");
describe("Morrow website", () => {
  it("does not market the private build as a public download or fully local AI", async () => {
    const page = await source();
    expect(page).not.toContain("<DownloadButton");
    expect(page).toContain("Not fully offline");
    expect(page).toContain("unless training is disabled");
    expect(page).toContain("Broader access allows more actions with fewer prompts");
    expect(page).toContain("Illustrative workflow");
    expect(page).not.toContain("—");
  });
  it("registers exactly the form fields submitted by the component", async () => {
    const [page, skeleton] = await Promise.all([source(), readFile(new URL("../public/__forms.html", import.meta.url), "utf8")]);
    for (const field of ["form-name", "name", "email", "workflow", "bot-field"]) {
      expect(page).toContain(`name="${field}"`);
      expect(skeleton).toContain(`name="${field}"`);
    }
    expect(skeleton).toContain('name="morrow-demo"');
    expect(page).toContain('fetch("/__forms.html"');
    expect(page).toContain('if (!enabled || local)');
    expect(page).toContain("AbortSignal.timeout(15000)");
    expect(page).toContain("if (!response.ok)");
  });
  it("exposes selected controls and respects reduced motion", async () => {
    const [page, css] = await Promise.all([source(), readFile(new URL("../components/MorrowWebsite.module.css", import.meta.url), "utf8")]);
    expect(page).toContain("aria-pressed={index === workflow}");
    expect(page).toContain('aria-live="polite"');
    expect(css).toContain("prefers-reduced-motion:reduce");
  });
  it("provides a static motion fallback and cleans up animation resources", async () => {
    const motion = await readFile(new URL("../components/MorrowMotion.tsx", import.meta.url), "utf8");
    expect(motion).toContain("prefers-reduced-motion: no-preference");
    expect(motion).toContain("Pause animations");
    expect(motion).toContain("lenis.destroy()");
    expect(motion).toContain("gsap.ticker.remove(tick)");
    expect(motion).toContain("media.revert()");
    expect(motion).toContain("min-width: 800px");
    expect(motion).toContain("Illustrative sequence, not a live task");
  });
});
