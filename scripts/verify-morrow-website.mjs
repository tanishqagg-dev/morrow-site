import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import assert from "node:assert/strict";

const browser = await chromium.launch({ headless: true });
const artifacts = new URL("../qa/morrow-website/", import.meta.url).pathname;
await mkdir(artifacts, { recursive: true });
const errors = [];
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
const page = await context.newPage();
page.on("pageerror", error => errors.push(error.message));
page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
let submissions = 0;
page.on("request", request => { if (request.method() === "POST" && request.url().includes("__forms")) submissions++; });
try {
  await page.goto("http://127.0.0.1:8796", { waitUntil: "networkidle" });
  assert.equal(await page.locator('nextjs-portal [data-error="true"]').count(), 0, "No hydration or development error badge");
  await page.screenshot({ path: artifacts + "desktop.png", fullPage: true });
  await page.screenshot({ path: artifacts + "hero.png" });
  await page.getByRole("button", { name: /The proposal pile/ }).click();
  assert.equal(await page.getByRole("heading", { name: "A clearer decision" }).count(), 1);
  await page.getByRole("button", { name: "Talk", exact: true }).click();
  assert.equal(await page.getByText("A thought. A question. A fresh angle.", { exact: true }).count(), 1);
  await page.getByRole("button", { name: "Business / Enterprise / Edu", exact: true }).click();
  assert.equal(await page.getByText(/OpenAI does not use Business, Enterprise or Edu data/).count(), 1);
  await page.locator("summary").filter({ hasText: "Can it control my whole computer?" }).click();
  assert.equal(await page.locator("details[open]").count(), 1);
  await page.getByLabel("Your name", { exact: true }).fill("Local QA");
  await page.getByLabel("Work email", { exact: true }).fill("qa@example.com");
  await page.getByRole("button", { name: "Request my demo" }).click();
  assert.equal(await page.getByText(/Nothing was sent/).count(), 1);
  assert.equal(submissions, 0, "Local preview must never transmit demo information");
  await page.screenshot({ path: artifacts + "form-preview.png" });
  for (const width of [390, 320, 768]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("http://127.0.0.1:8796", { waitUntil: "networkidle" });
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
    assert.ok(dimensions.scroll <= dimensions.viewport, `Overflow at ${width}: ${JSON.stringify(dimensions)}`);
    await page.screenshot({ path: artifacts + `width-${width}.png`, fullPage: true });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  const duration = await page.locator('[aria-label="Choose an example workflow"] button').first().evaluate(el => getComputedStyle(el).transitionDuration);
  assert.equal(duration, "0s");
  await page.goto("http://127.0.0.1:8796/privacy");
  assert.equal(await page.getByRole("heading", { name: "Demo requests on this website" }).count(), 1);
  await page.goto("http://127.0.0.1:8796");
  await page.keyboard.press("Tab");
  assert.match(await page.locator(":focus").innerText(), /Skip to content/);
  assert.deepEqual(errors, []);
  console.log("PASS: desktop, 390/320/768px; workflows; Talk/Work; account privacy selector; FAQ; local form non-transmission; privacy link; reduced motion; keyboard skip link; no runtime errors.");
  console.log(`Screenshots: ${artifacts}`);
} finally { await browser.close(); }
