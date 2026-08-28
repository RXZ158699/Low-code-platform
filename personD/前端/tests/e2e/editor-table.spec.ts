/**
 * 本次 git diff 变更：编辑器“添加弹框 - 组件 - 表格”。
 *
 * 测试点：
 * 1. 点击“表格”进入表格布局子弹框，选择布局后表格添加到画布并选中。
 * 2. 双击画布单元格可输入文本，Enter 提交后文本写入单元格。
 * 3. 右侧属性面板可编辑单元格内容、切换表格布局。
 * 4. 表格侧边拖拽只改变对应宽/高，不做等比缩放。
 * 5. 表格选择子弹框可返回添加弹框主页。
 * 6. 编辑表格后自动保存请求携带表格 canvasJson（接口交互）。
 *
 * 风险点：
 * - 项目目前没有 data-testid，测试使用现有 aria-label / role / class；
 *   如后续补充 data-testid，应优先替换为 data-testid。
 * - 自动保存有约 800ms 防抖，通过 route 拦截保存请求并解析 canvasJson 校验。
 * - AntD Dropdown 菜单渲染在 portal 中，使用可见文本定位并标注 TODO。
 */
import { test, expect, type Page } from "@playwright/test";

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

async function openEditor(
  page: Page,
  onTableSave?: (canvasJson: string) => void,
): Promise<void> {
  await page.addInitScript((user) => {
    localStorage.setItem("dp.token", "playwright-token");
    localStorage.setItem("dp.refreshToken", "playwright-refresh");
    localStorage.setItem("dp.user", JSON.stringify(user));
  }, USER);

  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({ json: { code: 0, data: USER } });
  });

  await page.route(`**/api/works/${WORK_ID}`, async (route) => {
    if (route.request().method() === "PUT") {
      const payload = route.request().postDataJSON() as {
        canvasJson?: string;
      } | null;
      if (payload?.canvasJson) {
        try {
          const canvas = JSON.parse(payload.canvasJson) as {
            elements?: Array<{ type?: string }>;
          };
          if (
            (canvas.elements || []).some((element) => element?.type === "table")
          ) {
            onTableSave?.(payload.canvasJson);
          }
        } catch {
          // 忽略无法解析的保存请求，只等待包含有效 canvasJson 的请求
        }
      }
    }
    await route.fulfill({ json: { code: 0, data: WORK_PAYLOAD } });
  });

  await page.goto(`http://localhost:5173/works/${WORK_ID}`);
  await expect(page.getByLabel("作品名称")).toHaveValue("未命名作品");
}

async function addTable(page: Page, layoutName = "两行两列"): Promise<void> {
  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "表格", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "表格", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: layoutName, exact: true }).click();
  const table = page.locator(".editor-el.is-table");
  await expect(table).toBeVisible();
  await expect(table).toHaveClass(/is-selected/);
}

test("添加弹框可选择表格布局并添加到画布", async ({ page }) => {
  await openEditor(page);

  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "表格", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "表格", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "两行两列", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "两行两列", exact: true }).click();

  const table = page.locator(".editor-el.is-table");
  await expect(table).toBeVisible();
  await expect(table).toHaveClass(/is-selected/);
  await expect(page.locator(".editor-table-cell")).toHaveCount(4);
  await expect(
    page.getByRole("button", { name: "表格布局", exact: true }),
  ).toBeVisible();
});

test("双击画布单元格可输入并提交文本", async ({ page }) => {
  await openEditor(page);
  await addTable(page);

  const firstCell = page.locator(".editor-table-cell").first();
  await firstCell.dblclick();

  const input = page.getByLabel("编辑表格单元格1");
  await expect(input).toBeVisible();
  await input.fill("报价");
  await input.press("Enter");

  await expect(firstCell).toContainText("报价");
});

test("右侧属性面板可编辑单元格并切换表格布局", async ({ page }) => {
  await openEditor(page);
  await addTable(page);

  await page.getByLabel("单元格内容").fill("备注");
  await expect(page.locator(".editor-table-cell").first()).toContainText("备注");

  await page.getByRole("button", { name: "表格布局", exact: true }).click();
  // TODO: AntD Dropdown 菜单渲染在 portal，先用可见文本定位
  await page.getByText("三行两列", { exact: true }).last().click();

  await expect(page.locator(".editor-table-cell")).toHaveCount(6);
  await expect(page.locator(".editor-table-cell").first()).toContainText("备注");
});

test("表格侧边拖拽只改变对应宽高", async ({ page }) => {
  await openEditor(page);
  await addTable(page);

  const table = page.locator(".editor-el.is-table");
  const before = await table.boundingBox();
  expect(before).not.toBeNull();

  const rightHandle = page.getByRole("button", {
    name: "缩放 右",
    exact: true,
  });
  await rightHandle.hover();
  await page.mouse.down();
  await page.mouse.move(before!.x + before!.width + 120, before!.y + before!.height / 2);
  await page.mouse.up();

  await expect
    .poll(async () => (await table.boundingBox())?.width ?? 0)
    .toBeGreaterThan(before!.width);
  const widthAfterRight = (await table.boundingBox())?.width ?? 0;
  expect((await table.boundingBox())?.height).toBeCloseTo(before!.height, 0);

  const bottomHandle = page.getByRole("button", {
    name: "缩放 下",
    exact: true,
  });
  await bottomHandle.hover();
  await page.mouse.down();
  await page.mouse.move(before!.x + before!.width / 2, before!.y + before!.height + 120);
  await page.mouse.up();

  await expect
    .poll(async () => (await table.boundingBox())?.height ?? 0)
    .toBeGreaterThan(before!.height);
  expect((await table.boundingBox())?.width).toBeCloseTo(widthAfterRight, 0);
});

test("表格选择子弹框可返回添加弹框", async ({ page }) => {
  await openEditor(page);

  await page.getByRole("button", { name: "添加", exact: true }).click();
  await page.getByRole("button", { name: "表格", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "表格", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "返回", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "组件", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "表格", exact: true })).toBeVisible();
});

test("编辑表格后自动保存请求携带表格 canvasJson", async ({ page }) => {
  let resolveSave: (canvasJson: string) => void = () => {};
  const saveSeen = new Promise<string>((resolve) => {
    resolveSave = resolve;
  });
  await openEditor(page, (canvasJson) => resolveSave(canvasJson));
  await addTable(page);

  const firstCell = page.locator(".editor-table-cell").first();
  await firstCell.dblclick();
  await page.getByLabel("编辑表格单元格1").fill("持久化");
  await page.getByLabel("编辑表格单元格1").press("Enter");

  const savedCanvasJson = await Promise.race([
    saveSeen,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("保存请求超时")), 10000),
    ),
  ]);
  const canvas = JSON.parse(savedCanvasJson) as {
    elements?: Array<{ type?: string }>;
  };
  expect(
    (canvas.elements || []).some((element) => element?.type === "table"),
  ).toBe(true);
});
