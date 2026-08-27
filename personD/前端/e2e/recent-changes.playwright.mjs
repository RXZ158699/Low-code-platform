/* global process, console, fetch, setTimeout, localStorage, document, window, getComputedStyle */

import { chromium } from "playwright";

const BASE_URL = process.env.BASE_URL || "http://localhost:5173";
const API_BASE = process.env.API_BASE || "http://localhost:8080/api";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const TEST_WORK_TITLE = "e2e-warp-test";
const SCROLL_WORK_PREFIX = "e2e-mine-scroll";
const SCROLL_WORK_COUNT = 10;

let failed = 0;

function report(name, passed, detail = "") {
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` - ${detail}` : ""}`);
  if (!passed) failed += 1;
}

async function api(path, options = {}, token) {
  const headers = { ...(options.headers || {}) };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const json = await response.json();
  if (json.code !== 0) {
    throw new Error(`${path} -> ${json.message || JSON.stringify(json)}`);
  }
  return json.data;
}

async function login() {
  return api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
}

async function createWork(token, title) {
  return api("/works", { method: "POST", body: JSON.stringify({ title }) }, token);
}

async function deleteWork(token, id) {
  return api(`/works/${id}`, { method: "DELETE" }, token);
}

async function workTitleElement(token, workId) {
  const work = await api(`/works/${workId}`, {}, token);
  const canvas = JSON.parse(work.canvasJson || "{}");
  return (
    (canvas.elements || []).find(
      (item) => item.type === "text" && item.text === "标题",
    ) || null
  );
}

async function waitForWorkWarp(token, workId, expected, timeout = 8000) {
  const target = JSON.stringify(expected);
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const item = await workTitleElement(token, workId);
    const current = item?.warp ?? null;
    if (JSON.stringify(current) === target) return true;
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  return false;
}

async function textSvgState(locator) {
  const svg = locator.locator(".editor-el-copy-svg");
  const textCount = await svg.locator("text").count();
  const tspanCount = await svg.locator("tspan").count();
  const transforms = await svg.locator("text").evaluateAll((nodes) =>
    nodes.map((node) => node.getAttribute("transform") || ""),
  );
  return { textCount, tspanCount, transforms };
}

async function expectWarpDom(page, textLocator, warped) {
  const deadline = Date.now() + 5000;
  let state = null;
  while (Date.now() < deadline) {
    state = await textSvgState(textLocator);
    const ok = warped
      ? state.textCount > 1 &&
        state.transforms.every((item) => item.startsWith("rotate("))
      : state.textCount === 1 &&
        state.transforms.length === 1 &&
        state.transforms[0] === "";
    if (ok) return state;
    await page.waitForTimeout(100);
  }
  return state;
}

const auth = await login();
const createdIds = [];
let mainWork;

try {
  mainWork = await createWork(auth.token, TEST_WORK_TITLE);
  createdIds.push(mainWork.id);
  for (let index = 0; index < SCROLL_WORK_COUNT; index += 1) {
    const work = await createWork(auth.token, `${SCROLL_WORK_PREFIX}-${index}`);
    createdIds.push(work.id);
  }

  const browser = await chromium.launch({ headless: true, channel: "msedge" });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();

    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.evaluate(
      ({ token, refreshToken, user }) => {
        localStorage.setItem("dp.token", token);
        localStorage.setItem("dp.refreshToken", refreshToken);
        localStorage.setItem("dp.user", JSON.stringify(user));
      },
      { token: auth.token, refreshToken: auth.refreshToken, user: auth.user },
    );
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.locator(".homepage").waitFor({ state: "visible", timeout: 10000 });

    // 1. 文字属性面板的变形下拉
    await page.goto(`${BASE_URL}/works/${mainWork.id}`, {
      waitUntil: "domcontentloaded",
    });
    await page.locator(".editor-workspace").waitFor({
      state: "visible",
      timeout: 12000,
    });
    await page.getByRole("button", { name: "文字", exact: true }).click();
    const textDialog = page.getByRole("dialog", { name: "文字" });
    await textDialog.locator(".editor-add-text-item.is-h1").click();

    const textEl = page.locator(".editor-el.is-text").first();
    await textEl.waitFor({ state: "visible", timeout: 5000 });
    await page.locator(".editor-text-panel").waitFor({
      state: "visible",
      timeout: 5000,
    });
    const warpBtn = page.getByRole("button", { name: "变形", exact: true });
    await warpBtn.waitFor({ state: "visible" });

    const initial = await textSvgState(textEl);
    report(
      "变形-初始文字为普通排版",
      initial.textCount === 1 && initial.tspanCount > 0,
      JSON.stringify(initial),
    );

    await warpBtn.click();
    const menuTexts = await page.getByRole("menuitem").allInnerTexts();
    report(
      "变形-菜单包含三种选项",
      ["无变形", "弧形", "波浪形"].every((name) =>
        menuTexts.some((text) => text.includes(name)),
      ),
      menuTexts.join(" | "),
    );

    await page.getByRole("menuitem", { name: "弧形" }).click();
    let state = await expectWarpDom(page, textEl, true);
    report(
      "变形-弧形逐字渲染",
      state.textCount > 1 &&
        state.transforms.every((item) => item.startsWith("rotate(")),
      JSON.stringify(state),
    );
    report(
      "变形-弧形默认强度44",
      await waitForWorkWarp(auth.token, mainWork.id, {
        type: "arc",
        strength: 44,
      }),
    );

    await warpBtn.click();
    await page.getByRole("menuitem", { name: "波浪形" }).click();
    state = await expectWarpDom(page, textEl, true);
    report(
      "变形-波浪形逐字渲染",
      state.textCount > 1 &&
        state.transforms.every((item) => item.startsWith("rotate(")),
      JSON.stringify(state),
    );
    report(
      "变形-波浪形默认强度30",
      await waitForWorkWarp(auth.token, mainWork.id, {
        type: "wave",
        strength: 30,
      }),
    );

    await warpBtn.click();
    await page.getByRole("menuitem", { name: "无变形" }).click();
    state = await expectWarpDom(page, textEl, false);
    report(
      "变形-无变形恢复普通排版",
      state.textCount === 1 && state.transforms[0] === "",
      JSON.stringify(state),
    );
    report(
      "变形-无变形清空数据",
      await waitForWorkWarp(auth.token, mainWork.id, null),
    );

    // 2 + 3. 我的空间内部滚动与自适应高度
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.getByRole("button", { name: "我的", exact: true }).click();
    await page.locator(".mine-page").waitFor({ state: "visible", timeout: 10000 });
    await page.locator(".mine-main > .ant-spin-nested-loading").waitFor({
      state: "visible",
      timeout: 10000,
    });
    await page.locator(".mine-loaded").waitFor({ state: "visible", timeout: 10000 });

    async function readScaleHeight() {
      return page.evaluate(() => {
        const canvas = document.querySelector(".scale-canvas");
        const inner = document.querySelector(".scale-inner");
        const mine = document.querySelector(".mine-page");
        return {
          viewportHeight: window.innerHeight,
          canvasHeight: canvas?.getBoundingClientRect().height || 0,
          innerComputedHeight: inner
            ? parseFloat(getComputedStyle(inner).height)
            : 0,
          mineHeight: mine ? getComputedStyle(mine).height : "",
        };
      });
    }

    await page.setViewportSize({ width: 1440, height: 600 });
    await page.waitForTimeout(300);
    const heightAt600 = await readScaleHeight();
    report(
      "我的空间-画布高度跟随视口600",
      Math.abs(heightAt600.canvasHeight - heightAt600.viewportHeight) <= 2,
      JSON.stringify(heightAt600),
    );

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.waitForTimeout(300);
    const heightAt800 = await readScaleHeight();
    report(
      "我的空间-画布高度跟随视口800",
      Math.abs(heightAt800.canvasHeight - heightAt800.viewportHeight) <= 2,
      JSON.stringify(heightAt800),
    );

    const scrollLayout = await page.evaluate(() => {
      const search = document.querySelector(".mine-main > .mine-search");
      const row = document.querySelector(".mine-main > .mine-space-row");
      const toolbar = document.querySelector(".mine-main > .mine-toolbar");
      const list = document.querySelector(
        ".mine-page:not(.is-detail) .mine-main > .ant-spin-nested-loading",
      );
      const style = (el) => (el ? getComputedStyle(el) : null);
      return {
        searchFlexShrink: style(search)?.flexShrink,
        rowFlexShrink: style(row)?.flexShrink,
        toolbarFlexShrink: style(toolbar)?.flexShrink,
        listFlexGrow: style(list)?.flexGrow,
        listMinHeight: style(list)?.minHeight,
        listOverflowY: style(list)?.overflowY,
        listScrollHeight: list?.scrollHeight || 0,
        listClientHeight: list?.clientHeight || 0,
      };
    });
    report(
      "我的空间-头部区域不收缩",
      scrollLayout.searchFlexShrink === "0" &&
        scrollLayout.rowFlexShrink === "0" &&
        scrollLayout.toolbarFlexShrink === "0",
      JSON.stringify(scrollLayout),
    );
    report(
      "我的空间-列表独立滚动容器",
      scrollLayout.listOverflowY === "auto" &&
        scrollLayout.listFlexGrow === "1" &&
        scrollLayout.listMinHeight === "0px",
      JSON.stringify(scrollLayout),
    );

    const list = page.locator(
      ".mine-page:not(.is-detail) .mine-main > .ant-spin-nested-loading",
    );
    const toolbarBefore = await page.locator(".mine-main > .mine-toolbar").boundingBox();
    const searchBefore = await page.locator(".mine-main > .mine-search").boundingBox();
    const scrollResult = await list.evaluate((el) => {
      el.scrollTop = el.scrollHeight;
      return { scrollTop: el.scrollTop, max: el.scrollHeight - el.clientHeight };
    });
    await page.waitForTimeout(200);
    const toolbarAfter = await page.locator(".mine-main > .mine-toolbar").boundingBox();
    const searchAfter = await page.locator(".mine-main > .mine-search").boundingBox();
    report(
      "我的空间-列表滚动且头部固定",
      scrollResult.scrollTop > 0 &&
        toolbarBefore &&
        toolbarAfter &&
        Math.abs(toolbarBefore.y - toolbarAfter.y) <= 1 &&
        Math.abs(searchBefore.y - searchAfter.y) <= 1,
      JSON.stringify({ scrollResult, toolbarBefore, toolbarAfter, searchBefore, searchAfter }),
    );

    await list.evaluate((el) => {
      el.scrollTop = 0;
    });
    const detailCard = page.locator(".mine-card", { hasText: TEST_WORK_TITLE }).first();
    await detailCard.waitFor({ state: "visible", timeout: 5000 });
    await detailCard.locator(".mine-card-hover").dispatchEvent("click");

    const detail = page.locator(".mine-page.is-detail .mine-detail");
    await detail.waitFor({ state: "visible", timeout: 8000 });
    const detailStyle = await detail.evaluate((el) => ({
      overflowY: getComputedStyle(el).overflowY,
      flexGrow: getComputedStyle(el).flexGrow,
      scrollHeight: el.scrollHeight,
      clientHeight: el.clientHeight,
    }));
    const detailScrollTop = await detail.evaluate((el) => {
      el.scrollTop = 400;
      return el.scrollTop;
    });
    report(
      "我的空间-详情页内部滚动",
      detailStyle.overflowY === "auto" && detailScrollTop > 0,
      JSON.stringify({ detailStyle, detailScrollTop }),
    );
  } finally {
    await browser.close();
  }
} finally {
  for (const id of createdIds.reverse()) {
    try {
      await deleteWork(auth.token, id);
    } catch (err) {
      console.log(`CLEANUP FAIL ${id}: ${err.message}`);
    }
  }
}

console.log(failed === 0 ? "ALL PASS" : `${failed} CHECK(S) FAILED`);
process.exit(failed === 0 ? 0 : 1);
