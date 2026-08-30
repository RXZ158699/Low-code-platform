/**
 * 本次 git diff 变更：素材面板支持拖拽到画布添加。
 *
 * 测试点：
 * 1. 素材面板卡片拖到画布后，元素出现在画布并自动选中（正常流程）。
 * 2. 文字预设卡片拖到画布后，文字元素出现在画布并选中（正常流程）。
 * 3. 拼图布局卡片拖到画布后，拼图元素添加到画布（正常流程）。
 * 4. 表格布局卡片拖到画布后，表格元素添加到画布（正常流程）。
 * 5. 涂鸦笔卡片拖到画布后，进入涂鸦绘制模式（工具切换）。
 * 6. 资源库图片卡片拖到画布后，图片元素添加到画布（接口数据驱动）。
 *
 * 风险点：
 * - 项目没有 data-testid，使用现有 aria-label / role / class 定位；
 *   如后续补充 data-testid，应优先替换。
 * - 拖拽使用 Playwright 原生 dragTo，依赖 HTML5 DataTransfer 流程。
 * - 自动保存走 PUT /api/works/9，已用 route 拦截，不影响拖拽断言。
 * - /api/assets 路由使用正则精确匹配，避免拦截到 /src/api/assets.js 模块。
 */
import { test, expect, type Locator, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const WORK_ID = "9";
const WORK_PAYLOAD = {
  id: 9,
  title: "未命名作品",
  status: "DRAFT",
  canvasJson: '{"width":800,"height":600,"elements":[]}',
};
const USER = {
  id: 1,
  username: "admin",
  nickname: "管理员",
  role: 1,
};

async function openEditor(page: Page): Promise<void> {
  await page.addInitScript((user) => {
    localStorage.setItem("dp.token", "playwright-token");
    localStorage.setItem("dp.refreshToken", "playwright-refresh");
    localStorage.setItem("dp.user", JSON.stringify(user));
  }, USER);

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ json: { code: 0, data: USER } });
  });

  await page.route(`**/api/works/${WORK_ID}`, async (route) => {
    await route.fulfill({ json: { code: 0, data: WORK_PAYLOAD } });
  });

  await page.route(/\/api\/assets(\?|$)/, async (route) => {
    await route.fulfill({
      json: {
        code: 0,
        data: {
          total: 1,
          page: 1,
          size: 24,
          records: [
            {
              id: 1,
              fileName: "示例图片",
              url: "http://cdn/a.png",
              fileType: "image",
            },
          ],
        },
      },
    });
  });

  await page.goto(`${BASE_URL}/works/${WORK_ID}`);
  await expect(page.getByLabel("作品名称")).toHaveValue("未命名作品");
}

async function openRail(page: Page, name: string): Promise<void> {
  await page
    .locator(".editor-rail")
    .getByRole("button", { name, exact: true })
    .click();
}

async function dragToCanvas(page: Page, source: Locator): Promise<void> {
  await source.dragTo(page.locator(".editor-stage-frame"));
}

test("素材卡片拖到画布后添加并选中", async ({ page }) => {
  await openEditor(page);
  await openRail(page, "素材");

  const card = page.locator(".editor-material-panel .editor-add-card").first();
  await expect(card).toHaveAttribute("draggable", "true");
  await dragToCanvas(page, card);

  const media = page.locator(".editor-artboard .editor-el.is-media");
  await expect(media).toBeVisible();
  await expect(media).toHaveClass(/is-selected/);
  await expect(
    page.getByRole("dialog", { name: "素材" }),
  ).not.toBeVisible();
});

test("文字预设拖到画布后添加文字", async ({ page }) => {
  await openEditor(page);
  await openRail(page, "添加");

  const card = page.getByRole("button", { name: /H1\s*标题/ });
  await expect(card).toHaveAttribute("draggable", "true");
  await dragToCanvas(page, card);

  const text = page.locator(".editor-artboard .editor-el.is-text");
  await expect(text).toBeVisible();
  await expect(text).toHaveClass(/is-selected/);
  await expect(text).toContainText("标题");
});

test("拼图布局拖到画布后添加拼图", async ({ page }) => {
  await openEditor(page);
  await openRail(page, "添加");

  await page.getByRole("button", { name: "拼图", exact: true }).click();
  const layout = page.getByRole("button", { name: "2-图布局1", exact: true });
  await expect(layout).toHaveAttribute("draggable", "true");
  await dragToCanvas(page, layout);

  await expect(
    page.locator(".editor-artboard .editor-el.is-collage"),
  ).toBeVisible();
});

test("表格布局拖到画布后添加表格", async ({ page }) => {
  await openEditor(page);
  await openRail(page, "添加");

  await page.getByRole("button", { name: "表格", exact: true }).click();
  const layout = page.getByRole("button", { name: "两行两列" });
  await expect(layout).toHaveAttribute("draggable", "true");
  await dragToCanvas(page, layout);

  await expect(
    page.locator(".editor-artboard .editor-el.is-table"),
  ).toBeVisible();
});

test("涂鸦笔拖到画布后进入涂鸦绘制模式", async ({ page }) => {
  await openEditor(page);
  await openRail(page, "添加");

  await page.getByRole("button", { name: "涂鸦笔", exact: true }).click();
  const pen = page.getByRole("button", { name: "马克笔" });
  await expect(pen).toHaveAttribute("draggable", "true");
  await dragToCanvas(page, pen);

  await expect(
    page.getByLabel("在画布上绘制涂鸦"),
  ).toBeVisible();
});

test("资源库图片拖到画布后添加图片", async ({ page }) => {
  await openEditor(page);
  await openRail(page, "我的");

  const card = page
    .locator(".editor-library-panel .editor-add-card")
    .first();
  await expect(card).toHaveAttribute("draggable", "true");
  await dragToCanvas(page, card);

  const media = page.locator(".editor-artboard .editor-el.is-media");
  await expect(media).toBeVisible();
  await expect(media.locator("img")).toHaveAttribute(
    "src",
    "http://cdn/a.png",
  );
});
