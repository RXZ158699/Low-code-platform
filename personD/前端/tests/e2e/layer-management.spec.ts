/**
 * 测试范围：本次 git diff 中“图层管理 + 拖拽排序”相关变更
 * - canvas.js：moveElementToIndex / toggleElementVisible / toggleElementLocked
 * - WorkEditorPage：新增“图层”入口、图层面板接入、隐藏图层不再渲染
 * - editor.css：图层面板与图层行交互样式
 *
 * 测试点：
 * 1. 打开编辑器后可从工具栏进入“图层”面板，图层按顶层在上展示
 * 2. 点击图层行同步选中画布元素
 * 3. 隐藏图层后画布不再渲染该元素，自动保存时 visible=false 写入 canvasJson
 * 4. 锁定/解锁图层
 * 5. 复制图层会增加图层与画布元素
 * 6. 删除图层会移除图层与画布元素
 * 7. 拖动图层行可改变排序
 * 8. 双击图层名称可重命名
 *
 * 风险点 / TODO：
 * - 当前组件未提供 data-testid，选择器使用 .editor-layer-row、aria-label 等；
 *   建议后续为图层行、显隐/锁定按钮补充 data-testid。
 * - HTML5 拖拽依赖 dragstart/dragover/drop；若 dragTo 不稳定，
 *   可改用面板内“置顶/置底”按钮验证排序。
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

const WORK_CANVAS = {
  width: 800,
  height: 600,
  background: "#ffffff",
  backgroundOpacity: 100,
  backgroundImage: "",
  backgroundImageFit: "cover",
  elements: [
    {
      id: "bottom-text",
      type: "text",
      text: "底层文字",
      x: 50,
      y: 80,
      width: 260,
      height: 48,
      fontSize: 32,
      fontWeight: 700,
      color: "#111827",
    },
    {
      id: "top-text",
      type: "text",
      text: "顶层文字",
      x: 120,
      y: 160,
      width: 260,
      height: 48,
      fontSize: 32,
      fontWeight: 700,
      color: "#dc2626",
    },
  ],
};

const WORK = {
  id: 9,
  title: "图层演示",
  status: "DRAFT",
  canvasJson: JSON.stringify(WORK_CANVAS),
};

async function seedLoggedInUser(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("dp.token", "test-token");
    localStorage.setItem(
      "dp.user",
      JSON.stringify({
        id: 2,
        username: "demo",
        nickname: "演示用户",
        role: "USER",
        membershipType: "FREE",
      }),
    );
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "ok",
        data: {
          id: 2,
          username: "demo",
          nickname: "演示用户",
          role: "USER",
          membershipType: "FREE",
        },
      }),
    });
  });
}

async function mockWorkEditor(page: Page) {
  await page.route("**/api/works/9", async (route) => {
    const request = route.request();
    const method = request.method();
    const payload = method === "GET" ? WORK : request.postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data: payload }),
    });
  });
}

async function openEditor(page: Page) {
  await page.goto(`${BASE_URL}/works/9`);
  await expect(page.locator(".editor-page")).toBeVisible({ timeout: 15000 });
  await page.getByRole("button", { name: "图层" }).click();
  await expect(page.locator(".editor-layers-panel")).toBeVisible();
}

function layerRows(page: Page) {
  return page.locator(".editor-layers-panel .editor-layer-row");
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await seedLoggedInUser(page);
  await mockWorkEditor(page);
});

test("图层面板按顶层在上展示并可点击选中", async ({ page }) => {
  await openEditor(page);

  await expect(layerRows(page)).toHaveCount(2);
  await expect(layerRows(page).nth(0)).toContainText("顶层文字");
  await expect(layerRows(page).nth(1)).toContainText("底层文字");

  await layerRows(page).nth(0).click();
  await expect(layerRows(page).nth(0)).toHaveClass(/is-active/);
  await expect(page.locator(".editor-el.is-selected")).toHaveCount(1);
});

test("隐藏图层后不再渲染画布元素并写入自动保存", async ({ page }) => {
  let savedCanvas: string | undefined;
  await page.route("**/api/works/9", async (route) => {
    const request = route.request();
    if (request.method() === "PUT") {
      const payload = request.postDataJSON();
      if (payload?.canvasJson) savedCanvas = payload.canvasJson;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data: WORK }),
    });
  });

  await openEditor(page);
  await page.getByRole("button", { name: "隐藏 顶层文字" }).click();

  await expect(layerRows(page).nth(0)).toHaveClass(/is-hidden/);
  await expect(page.locator(".editor-el")).toHaveCount(1);
  await expect(page.locator(".editor-el")).toContainText("底层文字");

  await expect
    .poll(() => savedCanvas, { timeout: 5000 })
    .toContain('"visible":false');
});

test("锁定与解锁图层", async ({ page }) => {
  await openEditor(page);

  await layerRows(page).nth(1).hover();
  await page.getByRole("button", { name: "锁定 底层文字" }).click();
  await expect(layerRows(page).nth(1)).toHaveClass(/is-locked/);
  await expect(page.locator(".editor-el.is-locked")).toHaveCount(1);

  await layerRows(page).nth(1).hover();
  await page.getByRole("button", { name: "解锁 底层文字" }).click();
  await expect(layerRows(page).nth(1)).not.toHaveClass(/is-locked/);
});

test("复制与删除图层", async ({ page }) => {
  await openEditor(page);

  const topRow = layerRows(page).nth(0);
  await topRow.hover();
  await topRow.getByRole("button", { name: "复制 顶层文字" }).click();

  await expect(layerRows(page)).toHaveCount(3);
  await expect(page.locator(".editor-el")).toHaveCount(3);

  const activeRow = page.locator(".editor-layer-row.is-active").first();
  await activeRow.getByRole("button", { name: "删除 顶层文字" }).click();

  await expect(layerRows(page)).toHaveCount(2);
  await expect(page.locator(".editor-el")).toHaveCount(2);
});

test("拖动图层行可以调整排序", async ({ page }) => {
  await openEditor(page);

  await expect(layerRows(page).nth(0)).toContainText("顶层文字");
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await page.evaluate(async (dataTransfer) => {
    const rows = Array.from(
      document.querySelectorAll<HTMLElement>(".editor-layer-row"),
    );
    const source = rows[0];
    const target = rows[1];
    source.dispatchEvent(
      new DragEvent("dragstart", { bubbles: true, dataTransfer }),
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    target.dispatchEvent(
      new DragEvent("dragover", { bubbles: true, dataTransfer }),
    );
    await new Promise((resolve) => setTimeout(resolve, 80));
    target.dispatchEvent(
      new DragEvent("drop", { bubbles: true, dataTransfer }),
    );
    source.dispatchEvent(
      new DragEvent("dragend", { bubbles: true, dataTransfer }),
    );
  }, dataTransfer);

  await expect(layerRows(page).nth(0)).toContainText("底层文字");
  await expect(layerRows(page).nth(1)).toContainText("顶层文字");
});

test("双击图层名称可重命名", async ({ page }) => {
  await openEditor(page);

  await layerRows(page).nth(0).dblclick();
  const input = page.locator(".editor-layer-rename");
  await expect(input).toBeVisible();
  await input.fill("新图层名");
  await input.press("Enter");

  await expect(layerRows(page).nth(0)).toContainText("新图层名");
});
