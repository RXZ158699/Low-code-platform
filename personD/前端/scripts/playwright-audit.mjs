import { chromium } from "playwright";

const BASE_URL = "http://127.0.0.1:5173";
const results = [];
const issues = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  if (!ok) issues.push(`${name}：${detail}`);
}

async function waitText(page, text, timeout = 8000) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({
      state: "visible",
      timeout,
    });
    return true;
  } catch {
    return false;
  }
}

async function waitRole(page, role, name, timeout = 8000) {
  try {
    await page.getByRole(role, { name, exact: false }).first().waitFor({
      state: "visible",
      timeout,
    });
    return true;
  } catch {
    return false;
  }
}

async function clickText(page, text, timeout = 8000) {
  const target = page.getByText(text, { exact: false }).first();
  await target.waitFor({ state: "visible", timeout });
  await target.click();
}

async function collectErrors(page) {
  const errors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  page.on("requestfailed", (req) =>
    errors.push(
      `requestfailed: ${req.method()} ${req.url()} ${req.failure()?.errorText || ""}`,
    ),
  );
  return errors;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = await collectErrors(page);

try {
  // 1. 未登录首页
  await page.goto(`${BASE_URL}/`, { waitUntil: "networkidle" });
  record("首页-首屏标题", await waitText(page, "设计需求，一稿就好"));
  record("首页-搜索框", await waitRole(page, "textbox", "请输入关键词"));
  record("首页-功能入口", await waitText(page, "AI 画布"));
  record("首页-模版专场", await waitText(page, "模版专场"));
  record("首页-游客不显示创建入口", !(await page.getByText("图片创作", { exact: false }).first().isVisible().catch(() => false)));

  const guestSearch = page.getByRole("textbox", { name: "请输入关键词" }).first();
  await guestSearch.fill("海报");
  await guestSearch.press("Enter");
  record("首页-搜索触发", await waitText(page, "「海报」的搜索结果"));

  // 2. 登录
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  record("登录页-微信扫码", await waitText(page, "微信扫码登录"));
  record("登录页-手机号登录", await waitText(page, "手机号登录"));
  await clickText(page, "手机密码登录");
  await page.getByPlaceholder("输入用户名").fill("admin");
  await page.getByPlaceholder("输入密码").fill("admin123");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  record("登录-管理员登录成功", await waitText(page, "管理员"));

  // 3. 登录后首页
  record("登录后-用户菜单", await waitRole(page, "button", "用户菜单"));
  record("登录后-创建入口", await waitText(page, "创建"));
  record("登录后-图片创作入口", await waitText(page, "图片创作"));

  const templateCards = page.locator(".template-card");
  const cardCount = await templateCards.count();
  record("首页-模板卡片有数据", cardCount > 0, `卡片数 ${cardCount}`);

  const favoriteButton = page
    .locator(".template-card .favorite-btn")
    .first();
  if ((await favoriteButton.count()) > 0) {
    const label = await favoriteButton.getAttribute("aria-label");
    const wasFavorited = label?.includes("取消收藏");
    await favoriteButton.click();
    record(
      "首页-模板收藏交互",
      await waitText(page, wasFavorited ? "已取消收藏" : "已收藏"),
    );
  } else {
    record("首页-模板收藏交互", false, "未找到收藏按钮");
  }

  await clickText(page, "图片创作");
  record("创建设计-弹窗", await waitText(page, "创建设计"));
  record("创建设计-自定义尺寸", await waitText(page, "自定义尺寸"));
  const addCustom = page.getByRole("button", { name: "添加自定义尺寸" });
  if ((await addCustom.count()) > 0) {
    await addCustom.click();
    record("创建设计-自定义尺寸收藏", await waitText(page, "自定义尺寸收藏开发中"));
  }
  await page.getByRole("button", { name: "关闭" }).click();

  await clickText(page, "AI 画布");
  record("创建工具-AI画布", await waitText(page, "功能开发中"));

  // 4. 发现页
  await clickText(page, "发现");
  record("发现页-分类", await waitText(page, "模板推荐"));
  record("发现页-素材入口", await waitText(page, "素材"));
  record("发现页-类型筛选", await waitText(page, "PPT模板"));
  await clickText(page, "电商");
  record("发现页-切换电商分类", await waitText(page, "电商"));

  // 5. 我的空间
  await clickText(page, "我的");
  record("我的-空间页", await waitText(page, "我的空间"));
  record("我的-分类标签", await waitText(page, "收藏夹"));
  for (const tab of ["收藏夹", "草稿箱", "已归档", "回收站", "分享管理", "发布"]) {
    const tabButton = page
      .locator(".mine-space-tab")
      .filter({ hasText: tab })
      .first();
    if ((await tabButton.count()) > 0) {
      await tabButton.click();
      await page.waitForTimeout(500);
      record(`我的-${tab} 可切换`, true);
    } else {
      record(`我的-${tab} 可切换`, false, "未找到 Tab");
    }
  }

  await clickText(page, "模板管理");
  record("模板管理-面板", await waitText(page, "模板管理"));
  record("模板管理-新建模板按钮", await waitRole(page, "button", "新建模板"));

  // 6. 新建画布并进入编辑器
  await clickText(page, "我的");
  await clickText(page, "图片创作");
  const preset = page.locator(".create-canvas-preset").first();
  if ((await preset.count()) > 0) {
    await preset.click();
    record("编辑器-从预设创建作品", await page.waitForURL(/\/works\/\d+/, { timeout: 12000 }).then(() => true).catch(() => false));
    record("编辑器-画布", await page.locator(".editor-artboard").waitFor({ state: "visible", timeout: 8000 }).then(() => true).catch(() => false));
    record("编辑器-工具栏", await waitRole(page, "button", "撤销"));
  } else {
    record("编辑器-从预设创建作品", false, "未找到尺寸预设");
  }
} catch (err) {
  issues.push(`脚本异常：${err.message}`);
} finally {
  await page.screenshot({ path: "playwright-final.png", fullPage: true }).catch(() => {});
  await browser.close();
}

console.log(JSON.stringify({ results, issues, errors }, null, 2));
