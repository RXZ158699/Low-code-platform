/* global process, console, localStorage */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("E:/node1/node_modules/@playwright/mcp/node_modules/playwright");

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

let failed = 0;

function report(name, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!passed) failed += 1;
}

async function openPasswordMode(page) {
  await page.goto(`${BASE_URL}/login`);
  await page.getByRole("button", { name: "手机密码登录" }).click();
}

async function loginAs(page, username, password) {
  await page.getByPlaceholder("输入用户名").fill(username);
  await page.getByPlaceholder("输入密码").fill(password);
  await page.locator("button.login-submit").click();
}

const browser = await chromium.launch({ headless: true, channel: "msedge" });

try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();

  // 1. 空表单校验
  await openPasswordMode(page);
  await page.locator("button.login-submit").click();
  await page.getByText("请输入用户名").first().waitFor({ timeout: 5000 });
  const userRequired = await page.getByText("请输入用户名").isVisible().catch(() => false);
  const passwordRequired = await page.getByText("请输入密码").isVisible().catch(() => false);
  report("空表单显示校验提示", userRequired && passwordRequired);
  await page.screenshot({ path: "e2e/artifacts/login-validation.png" });

  // 2. 密码错误
  await loginAs(page, "demo", "wrongpass");
  const wrongMessage = await page
    .locator(".ant-message-notice")
    .getByText("用户名或密码错误")
    .waitFor({ timeout: 5000 })
    .then(() => true)
    .catch(() => false);
  report("错误密码提示失败信息", wrongMessage);
  report("错误密码停留在登录页", page.url().includes("/login"));
  await page.screenshot({ path: "e2e/artifacts/login-wrong-password.png" });

  // 3. 正确密码登录
  await loginAs(page, "demo", "demo123");
  await page.waitForURL(`${BASE_URL}/`, { timeout: 8000 });
  const token = await page.evaluate(() => localStorage.getItem("dp.token"));
  await page.locator(".homepage").waitFor({ timeout: 10000 });
  const homeVisible = await page.locator(".homepage").isVisible().catch(() => false);
  report("正确密码登录后跳转首页", page.url() === `${BASE_URL}/`);
  report("登录令牌写入本地存储", Boolean(token));
  report("首页正常渲染", homeVisible);
  await page.screenshot({ path: "e2e/artifacts/login-success-home.png" });

  // 4. 刷新后登录态保持
  await page.reload();
  await page.waitForTimeout(1200);
  const stillLoggedIn = await page.locator(".homepage").isVisible().catch(() => false);
  const sidebarUser = await page.getByText("演示用户").first().isVisible().catch(() => false);
  report("刷新后登录态保持", stillLoggedIn && sidebarUser);

  await context.close();
} catch (error) {
  console.error(`ERROR ${error.message}`);
  failed += 1;
} finally {
  await browser.close();
}

console.log(failed === 0 ? "ALL PASS" : `${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
