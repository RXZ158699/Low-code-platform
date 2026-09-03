/**
 * 测试范围：本次 git diff 中 TemplateShowcase 分类模板行补足与左右箭头滑动
 *
 * 测试点：
 * 1. fillGroupItems：分类模板不足 4 张时补足到 4 张（正常流程）
 * 2. 分类模板恰好 4 张时不补足、不显示箭头（边界）
 * 3. 分类模板超过 4 张时保留全部卡片并显示左右箭头（UI 展示）
 * 4. 点击右箭头平滑右滑、到末尾禁用；点击左箭头回到起点、起点禁用（交互）
 * 5. 后端返回空数据时走内置模板兜底，且每个分类都补足到至少 4 张（异常输入）
 * 6. 本地补足模板可通过“使用”创建作品，调用 POST /api/works 并跳转（接口交互）
 *
 * 风险点 / TODO：
 * - 当前组件没有 data-testid，选择器暂用 aria-label 与类名；建议后续为
 *   .template-row、.template-card、.template-row-arrow 补充 data-testid。
 * - 滚动使用 smooth，断言 scrollLeft 时需要用轮询等待。
 * - 分类名来自后端数据，用例统一使用“主题海报”。
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

type TemplateRecord = {
  id: number;
  title: string;
  category: string;
  tags: string[];
  authorNickname?: string;
  coverImageUrl?: string | null;
};

function templateList(count: number, category = "主题海报"): TemplateRecord[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    title: `${category}模板 ${index + 1}`,
    category,
    tags: ["海报"],
    authorNickname: "Alice",
  }));
}

async function mockHomeTemplates(page: Page, templates: TemplateRecord[]) {
  await page.route("**/api/templates/hot*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data: templates }),
    });
  });
  await page.route("**/api/templates?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "ok",
        data: { total: templates.length, records: templates },
      }),
    });
  });
}

function groupLocator(page: Page, category: string) {
  // TODO: 建议给分类组补 data-testid="template-group"，当前按标题过滤类名。
  return page.locator(".template-group").filter({
    has: page.locator(".template-group-title", { hasText: category }),
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
});

test("分类模板不足 4 张时补足到 4 张，且不显示箭头", async ({ page }) => {
  await mockHomeTemplates(page, templateList(3));

  await page.goto(BASE_URL);

  const group = groupLocator(page, "主题海报");
  await expect(group).toBeVisible();
  await expect(group.locator(".template-card")).toHaveCount(4);
  await expect(group.locator(".template-card").filter({ hasText: "主题海报模板 1" })).toBeVisible();
  await expect(group.locator(".template-card").filter({ hasText: "主题海报灵感示例 01" })).toBeVisible();
  await expect(page.getByRole("button", { name: "主题海报向左滑动" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "主题海报向右滑动" })).toHaveCount(0);
});

test("分类模板恰好 4 张时不补足、不显示箭头", async ({ page }) => {
  await mockHomeTemplates(page, templateList(4));

  await page.goto(BASE_URL);

  const group = groupLocator(page, "主题海报");
  await expect(group.locator(".template-card")).toHaveCount(4);
  await expect(group.locator(".template-card").filter({ hasText: "主题海报灵感示例" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "主题海报向左滑动" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "主题海报向右滑动" })).toHaveCount(0);
});

test("分类模板超过 4 张时显示左右箭头，点击可滑动到两端并禁用", async ({ page }) => {
  await mockHomeTemplates(page, templateList(6));

  await page.goto(BASE_URL);

  const group = groupLocator(page, "主题海报");
  const row = group.locator(".template-row");
  const leftArrow = page.getByRole("button", { name: "主题海报向左滑动" });
  const rightArrow = page.getByRole("button", { name: "主题海报向右滑动" });

  await expect(group.locator(".template-card")).toHaveCount(6);
  await expect(leftArrow).toBeVisible();
  await expect(rightArrow).toBeVisible();
  await expect(row.evaluate((el: HTMLElement) => el.scrollLeft)).resolves.toBe(0);

  await rightArrow.click();
  await expect.poll(() => row.evaluate((el: HTMLElement) => el.scrollLeft)).toBeGreaterThan(0);
  await expect(rightArrow).toHaveClass(/is-disabled/);
  await expect(leftArrow).not.toHaveClass(/is-disabled/);

  await leftArrow.click();
  await expect.poll(() => row.evaluate((el: HTMLElement) => el.scrollLeft)).toBe(0);
  await expect(leftArrow).toHaveClass(/is-disabled/);
  await expect(rightArrow).not.toHaveClass(/is-disabled/);
});

test("后端返回空数据时走内置模板兜底，且每个分类都补足到至少 4 张", async ({ page }) => {
  await mockHomeTemplates(page, []);

  await page.goto(BASE_URL);

  await expect(page.getByText("后端暂无模板，当前展示内置示例模板")).toBeVisible();
  const counts = await page.locator(".template-group").evaluateAll((groups) =>
    groups.map((group) => group.querySelectorAll(".template-card").length),
  );
  expect(counts.length).toBeGreaterThan(0);
  expect(counts.every((count) => count >= 4)).toBeTruthy();
});

test("本地补足模板可点击使用并调用创建作品接口", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("dp.token", "test-token");
    localStorage.setItem(
      "dp.user",
      JSON.stringify({ id: 1, username: "alice", nickname: "Alice", role: "USER" }),
    );
  });
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "ok",
        data: { id: 1, username: "alice", nickname: "Alice", role: "USER" },
      }),
    });
  });
  await mockHomeTemplates(page, templateList(1));

  let createPayload: Record<string, unknown> | undefined;
  await page.route("**/api/works", async (route) => {
    const request = route.request();
    if (request.method() === "POST") {
      createPayload = request.postDataJSON();
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "ok",
        data: { id: 999, title: "主题海报灵感示例 01" },
      }),
    });
  });

  await page.goto(BASE_URL);

  const fillerCard = page
    .locator(".template-card")
    .filter({ hasText: "主题海报灵感示例 01" });
  await expect(fillerCard).toHaveCount(1);
  await fillerCard.getByRole("button", { name: /使\s*用/ }).click();

  await page.waitForURL("**/works/999");
  expect(createPayload).toBeDefined();
  expect(createPayload).toEqual(expect.objectContaining({ title: "主题海报灵感示例 01" }));
  const canvas = JSON.parse(String(createPayload?.canvasJson));
  expect(canvas.elements.length).toBeGreaterThan(0);
});
