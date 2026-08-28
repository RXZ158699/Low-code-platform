/**
 * 本次 git diff 变更：文字弹框新增 10 个气泡文字分类，每个分类 3 个素材。
 *
 * 测试点：
 * 1. 文字弹框展示 10 个气泡分类，每个分类 3 个素材（UI 展示）。
 * 2. 弹框预览复用画布同款气泡渲染（TextBubble + CanvasTextCopy）。
 * 3. 点击气泡素材后，画布出现 has-bubble 文字元素并显示气泡背景。
 * 4. 双击画布气泡文字可编辑内容，气泡背景保持存在。
 * 5. 添加/编辑气泡文字后自动保存请求的 canvasJson 包含 bubble 字段（接口交互）。
 *
 * 风险点：
 * - 项目没有 data-testid，使用 aria-label / role / class 定位；如后续补充
 *   data-testid，应优先替换。
 * - 自动保存约 800ms 防抖，使用 route 拦截保存请求并解析 canvasJson 校验。
 * - 弹框内预览也包含 editor-el-copy，断言画布文本时必须限定在
 *   .editor-artboard 内。
 * - 画布气泡元素双击编辑前先等待 visible 并 hover，dblclick 内部会等待元素稳定。
 * - 编辑保存用例先等待添加时的防抖保存结束，再开启捕获，避免拿到旧文本。
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

const BUBBLE_CATEGORIES = [
  "毕业季",
  "生日",
  "节气",
  "价格标签",
  "复古",
  "综艺",
  "杂质风",
  "爆炸贴",
  "印章",
  "开工大吉",
];

async function openEditor(
  page: Page,
  onTextSave?: (canvasJson: string) => void,
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
            elements?: Array<{ type?: string; bubble?: object }>;
          };
          if (
            (canvas.elements || []).some(
              (element) =>
                element?.type === "text" && Boolean(element?.bubble),
            )
          ) {
            onTextSave?.(payload.canvasJson);
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

async function openTextPanel(page: Page): Promise<void> {
  await page.getByRole("button", { name: "文字", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "文字", exact: true }),
  ).toBeVisible();
}

async function addBubblePreset(
  page: Page,
  presetName = "学士帽",
): Promise<void> {
  await openTextPanel(page);
  await page.getByRole("button", { name: presetName, exact: true }).click();
  const text = page.locator(".editor-artboard .editor-el.is-text.has-bubble");
  await expect(text).toBeVisible();
  await expect(text).toHaveClass(/is-selected/);
}

async function dblclickBubbleText(
  page: Page,
  text: ReturnType<Page["locator"]>,
): Promise<void> {
  await text.waitFor({ state: "visible" });
  await text.hover();
  await page.waitForTimeout(200);
  await text.dblclick({ delay: 80 });
}

test("文字弹框展示 10 个气泡分类且每类 3 个素材", async ({ page }) => {
  await openEditor(page);
  await openTextPanel(page);

  for (const title of BUBBLE_CATEGORIES) {
    await expect(
      page.getByRole("heading", { name: title, exact: true }),
    ).toBeVisible();
  }

  const sections = page.locator(".editor-add-bubble-section");
  await expect(sections).toHaveCount(10);
  for (let index = 0; index < 10; index += 1) {
    await expect(
      sections.nth(index).locator(".editor-add-text-item"),
    ).toHaveCount(3);
  }
});

test("弹框气泡素材预览复用画布气泡渲染", async ({ page }) => {
  await openEditor(page);
  await openTextPanel(page);

  const preview = page
    .locator(".editor-add-bubble-section")
    .first()
    .locator(".editor-add-bubble-preview")
    .first();
  await expect(preview.locator(".editor-text-bubble")).toBeVisible();
  await expect(preview.locator(".editor-el-copy-svg")).toBeVisible();
});

test("点击气泡素材后画布出现带气泡背景的文字元素", async ({ page }) => {
  await openEditor(page);
  await addBubblePreset(page, "学士帽");

  const text = page.locator(".editor-artboard .editor-el.is-text.has-bubble");
  await expect(text.locator(".editor-text-bubble")).toBeVisible();
  await expect(
    page.locator(".editor-artboard .editor-el-copy"),
  ).toContainText("毕业快乐");
});

test("编辑画布气泡文字后气泡背景保持存在", async ({ page }) => {
  await openEditor(page);
  await addBubblePreset(page, "学士帽");

  const text = page.locator(".editor-artboard .editor-el.is-text.has-bubble");
  await dblclickBubbleText(page, text);
  const input = page.getByLabel("编辑文字");
  await expect(input).toBeVisible();
  await input.fill("前程似锦");
  await input.press("Tab");

  await expect(
    page.locator(".editor-artboard .editor-el-copy"),
  ).toContainText("前程似锦");
  await expect(text.locator(".editor-text-bubble")).toBeVisible();
});

test("添加气泡文字后自动保存请求携带 bubble canvasJson", async ({ page }) => {
  let capture: ((canvasJson: string) => void) | null = null;
  const saveSeen = new Promise<string>((resolve) => {
    capture = resolve;
  });
  await openEditor(page, (canvasJson) => capture?.(canvasJson));
  await addBubblePreset(page, "学士帽");

  const savedCanvasJson = await Promise.race([
    saveSeen,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("保存请求超时")), 10000),
    ),
  ]);
  const canvas = JSON.parse(savedCanvasJson) as {
    elements?: Array<{ type?: string; bubble?: object }>;
  };
  expect(
    (canvas.elements || []).some(
      (element) => element?.type === "text" && Boolean(element?.bubble),
    ),
  ).toBe(true);
});

test("编辑气泡文字后保存请求包含 bubble 与更新文本", async ({ page }) => {
  let captureActive = false;
  let resolveSave: (canvasJson: string) => void = () => {};
  const saveSeen = new Promise<string>((resolve) => {
    resolveSave = resolve;
  });
  await openEditor(page, (canvasJson) => {
    if (captureActive) resolveSave(canvasJson);
  });
  await addBubblePreset(page, "学士帽");
  await page.waitForTimeout(1200);
  captureActive = true;

  const text = page.locator(".editor-artboard .editor-el.is-text.has-bubble");
  await dblclickBubbleText(page, text);
  await page.getByLabel("编辑文字").fill("开工大吉");
  await page.getByLabel("编辑文字").press("Tab");

  const savedCanvasJson = await Promise.race([
    saveSeen,
    new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error("保存请求超时")), 10000),
    ),
  ]);
  const canvas = JSON.parse(savedCanvasJson) as {
    elements?: Array<{
      type?: string;
      text?: string;
      bubble?: object;
    }>;
  };
  const bubbleText = (canvas.elements || []).find(
    (element) => element?.type === "text" && Boolean(element?.bubble),
  );
  expect(bubbleText).toBeTruthy();
  expect(bubbleText?.text).toBe("开工大吉");
});
