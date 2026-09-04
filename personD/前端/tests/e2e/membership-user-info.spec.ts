/**
 * 测试范围：本次 git diff 中与普通用户权限、会员信息、会员弹窗、
 * 个人信息弹框、取消会员相关的变更。
 *
 * 测试点：
 * 1. 普通用户可看到 创作/发现/我的/创建，并可进入编辑器路由
 * 2. 个人信息弹框展示账号信息、会员类型、会员到期时间
 * 3. 个人信息弹框支持编辑昵称并调用 PUT /api/users/me
 * 4. 会员中心弹框展示普通/高级会员价格并可创建支付宝订单
 * 5. 普通会员 hover 会员类型出现“取消会员”，点击调用 POST /api/membership/cancel
 * 6. 非会员 hover 会员类型不出现取消会员入口
 *
 * 风险点 / TODO：
 * - 当前组件未提供 data-testid，选择器依赖 aria-label、类名与文案；
 *   后续建议为 UserInfoModal/MemberModal/Sidebar 补充 data-testid。
 * - AntD Button 会把两个中文字符渲染为“登 录”“保 存”等，断言使用正则。
 * - 支付宝支付需要打开外部沙箱页，测试只验证创建订单的接口交互，
 *   不真实支付。
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";

type User = {
  id: number;
  username: string;
  nickname: string;
  role: number | string;
  membershipType?: string;
  membershipExpireAt?: string | null;
  createdAt?: string;
  avatar?: string | null;
};

const FREE_USER: User = {
  id: 2,
  username: "demo",
  nickname: "演示用户",
  role: "USER",
  membershipType: "FREE",
  membershipExpireAt: null,
  createdAt: "2026-08-21T09:09:00",
};

const BASIC_USER: User = {
  ...FREE_USER,
  membershipType: "BASIC",
  membershipExpireAt: "2026-10-01T10:00:00",
};

async function seedAuth(page: Page, user: User) {
  await page.addInitScript((seed) => {
    localStorage.setItem("dp.token", "test-token");
    localStorage.setItem("dp.user", JSON.stringify(seed));
  }, user);
}

async function mockMe(page: Page, user: User) {
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data: user }),
    });
  });
}

async function mockHomeData(page: Page) {
  await page.route("**/api/templates?*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "ok",
        data: { total: 0, records: [] },
      }),
    });
  });
  await page.route("**/api/templates/hot*", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data: [] }),
    });
  });
}

test.beforeEach(async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await mockHomeData(page);
});

test("普通用户可看到创作/发现/我的/创建并可进入编辑器", async ({ page }) => {
  await seedAuth(page, FREE_USER);
  await mockMe(page, FREE_USER);

  await page.goto(BASE_URL);
  const nav = page.locator(".sidebar-nav");
  await expect(nav.getByRole("button", { name: "创作", exact: true })).toBeVisible();
  await expect(nav.getByRole("button", { name: "发现", exact: true })).toBeVisible();
  await expect(nav.getByRole("button", { name: "我的", exact: true })).toBeVisible();
  await expect(nav.getByRole("button", { name: "创建", exact: true })).toBeVisible();

  await page.route("**/api/works/9", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "ok",
        data: {
          id: 9,
          title: "演示作品",
          status: "DRAFT",
          canvasJson: '{"width":800,"height":600,"elements":[]}',
        },
      }),
    });
  });

  await page.goto(`${BASE_URL}/works/9`);
  await page.waitForURL("**/works/9");
  await expect(page.locator(".editor-page")).toBeVisible({ timeout: 15000 });
});

test("个人信息弹框展示账号与会员信息并支持编辑昵称", async ({ page }) => {
  await seedAuth(page, BASIC_USER);
  let currentUser: User = BASIC_USER;
  await mockMe(page, BASIC_USER);

  await page.route("**/api/users/me", async (route) => {
    if (route.request().method() !== "PUT") {
      await route.continue();
      return;
    }
    const payload = route.request().postDataJSON();
    currentUser = {
      ...currentUser,
      nickname: payload.nickname,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data: currentUser }),
    });
  });

  await page.goto(BASE_URL);
  await page.getByRole("button", { name: "用户信息" }).click();

  const dialog = page.getByRole("dialog", { name: "个人信息" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText("演示用户").first()).toBeVisible();
  await expect(dialog.getByText(/普通会员/).first()).toBeVisible();
  await expect(dialog.getByText("2026-10-01 10:00")).toBeVisible();

  await dialog.getByRole("button", { name: "编辑资料" }).click();
  const nicknameInput = dialog.getByRole("textbox", { name: /昵称/ });
  await nicknameInput.fill("新昵称");
  await dialog.getByRole("button", { name: /保\s*存/ }).click();

  await expect(dialog.getByText("新昵称").first()).toBeVisible({ timeout: 10000 });
});

test("会员中心弹框展示两档套餐并创建支付宝订单", async ({ page }) => {
  await seedAuth(page, FREE_USER);
  await mockMe(page, FREE_USER);

  await page.route("**/api/membership/plans", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "ok",
        data: [
          { code: "BASIC", name: "普通会员", amountCents: 990, benefits: "每日 10 次导出" },
          { code: "PREMIUM", name: "高级会员", amountCents: 2990, benefits: "不限次导出" },
        ],
      }),
    });
  });

  let orderRequest: unknown;
  await page.route("**/api/membership/orders", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    orderRequest = route.request().postDataJSON();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        code: 0,
        message: "ok",
        data: {
          orderNo: "M20260904TEST",
          planType: "PREMIUM",
          amountCents: 2990,
          status: "CREATED",
          payForm: "<form action='https://openapi-sandbox.dl.alipaydev.com/gateway.do'></form>",
        },
      }),
    });
  });

  // 测试中不真正打开支付宝新窗口。
  await page.addInitScript(() => {
    window.open = () => null as unknown as Window;
  });

  await page.goto(BASE_URL);
  await page.getByRole("button", { name: "会员中心" }).click();

  const dialog = page.getByRole("dialog", { name: "开通会员" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(/普通会员 · ¥9\.90/)).toBeVisible();
  await expect(dialog.getByText(/高级会员 · ¥29\.90/)).toBeVisible();

  await dialog.getByRole("button", { name: "立即支付" }).click();
  await expect.poll(() => orderRequest).toEqual({
    planType: "PREMIUM",
  });
});

test("普通会员 hover 会员类型可取消会员并刷新为非会员", async ({ page }) => {
  let currentUser: User = BASIC_USER;
  await seedAuth(page, BASIC_USER);
  await mockMe(page, BASIC_USER);

  await page.route("**/api/membership/cancel", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    currentUser = {
      ...currentUser,
      membershipType: "FREE",
      membershipExpireAt: null,
    };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data: null }),
    });
  });

  // refreshMe 会再次请求 /auth/me，返回取消后的会员状态。
  await page.unroute("**/api/auth/me");
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data: currentUser }),
    });
  });

  await page.goto(BASE_URL);
  await page.getByRole("button", { name: "用户信息" }).click();
  await page.hover(".user-membership-value");
  await page.getByRole("button", { name: "取消会员" }).click();

  const list = page.locator(".user-info-list");
  await expect(list.getByText("非会员").first()).toBeVisible({ timeout: 10000 });
  await expect(list.getByText("—").first()).toBeVisible();
});

test("非会员 hover 会员类型不显示取消会员入口", async ({ page }) => {
  await seedAuth(page, FREE_USER);
  await mockMe(page, FREE_USER);

  await page.goto(BASE_URL);
  await page.getByRole("button", { name: "用户信息" }).click();

  const membershipValue = page
    .locator(".user-info-list dd")
    .filter({ hasText: "非会员" });
  await membershipValue.hover();
  await expect(page.getByRole("button", { name: "取消会员" })).toHaveCount(0);
});
