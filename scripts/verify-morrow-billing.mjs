import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright-core";

const base = process.env.MORROW_PREVIEW_URL || "http://localhost:8796";
const captures = new URL("../qa/morrow-billing/", import.meta.url).pathname;
await mkdir(captures, { recursive: true });
const browser = await chromium.launch({ headless: true,
  ...(process.env.MORROW_CHROME_EXECUTABLE ? { executablePath: process.env.MORROW_CHROME_EXECUTABLE } : {}),
});
const errors = [];

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on("pageerror", (error) => errors.push(error.message));
  for (const route of ["/subscribe", "/activate", "/operator", "/download", "/refunds"]) {
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.locator("#main-content").waitFor();
    assert.equal(await page.locator('nextjs-portal [data-error="true"]').count(), 0);
    assert.equal(await page.locator("#main-content").count(), 1);
    const filename = route.slice(1);
    await page.screenshot({ path: `${captures}${filename}-desktop.png`, fullPage: true });
    for (const width of [768, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });
      await page.locator("#main-content").waitFor();
      const sizes = await page.evaluate(() => ({ page: document.documentElement.scrollWidth, viewport: innerWidth }));
      assert.ok(sizes.page <= sizes.viewport, `${route} overflows at ${width}px: ${JSON.stringify(sizes)}`);
      if (width === 390) await page.screenshot({ path: `${captures}${filename}-mobile.png`, fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
  }
  for (const route of ["/subscribe", "/activate"]) {
    await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    // This is a signed-out smoke check. Paid checkout needs its own sandbox account fixture.
    await page.getByRole("heading", { name: /Welcome to Morrow\.|Your work, with Morrow\./ }).waitFor({ timeout: 30000 });
    const signIn = page.getByRole("button", { name: "Sign in or create account" });
    if (await signIn.count()) {
      assert.equal(await page.locator("#plans").count(), 0, "Plans must follow account sign-in.");
      assert.equal(await page.getByRole("button", { name: /Continue to payment/ }).count(), 0);
    } else {
      assert.equal(await page.getByText("There is no checkout. You can't be charged from this page.").count(), 1);
    }
  }
  assert.deepEqual(errors, []);
  process.stdout.write(`PASS signed-out Morrow account, operator, download and refund smoke checks at 1440/768/390/320px. Paid checkout is not exercised. Screenshots: ${captures}\n`);
} finally {
  await browser.close();
}
