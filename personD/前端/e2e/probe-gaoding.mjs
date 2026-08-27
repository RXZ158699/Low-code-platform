/* global process, console */
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("E:/node1/node_modules/@playwright/mcp/node_modules/playwright");

const URL =
  "https://www.gaoding.com/editor/design?mode=create&category_id=2497&type=poster&width=1800&height=1000&unit=px&dpi=72";

const browser = await chromium.launch({ headless: true, channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

page.on("console", (msg) => {
  if (msg.type() === "error") console.log("CONSOLE ERROR:", msg.text().slice(0, 200));
});

try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(12000);

  console.log("FINAL URL:", page.url());
  console.log("TITLE:", await page.title());
  const bodyText = (await page.locator("body").innerText()).slice(0, 2000);
  console.log("BODY TEXT:", bodyText.replace(/\n+/g, " | ").slice(0, 1200));

  const buttons = await page.getByRole("button").all();
  const labels = [];
  for (const button of buttons.slice(0, 40)) {
    const text = (await button.innerText().catch(() => "")).trim();
    if (text) labels.push(text.replace(/\s+/g, " "));
  }
  console.log("VISIBLE BUTTONS:", JSON.stringify(labels));
  console.log("INPUTS:", await page.locator("input").count());
  console.log("TEXTAREA:", await page.locator("textarea").count());

  await page.screenshot({ path: "e2e/artifacts/gaoding-probe.png", fullPage: false });
} catch (error) {
  console.log("PROBE FAIL:", error.message);
}

await browser.close();
process.exit(0);
