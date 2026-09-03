import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TemplateShowcase from "./TemplateShowcase.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import {
  favoriteTemplate,
  getTemplate,
  listHotTemplates,
  listTemplates,
  unfavoriteTemplate,
} from "../api/templates.js";
import {
  applyCatalogCanvas,
  canvasJsonForLocalTemplate,
  matchesTemplateKeyword,
  searchLocalTemplates,
} from "./TemplateShowcase.jsx";
import { TEMPLATE_CATALOG } from "../data/templateCatalog.js";

const FIRST_BUSINESS = TEMPLATE_CATALOG.find((template) =>
  template.tags.includes("商务"),
);
const FIRST_FOOD = TEMPLATE_CATALOG.find((template) =>
  template.tags.includes("美食"),
);
const FIRST_SALE = TEMPLATE_CATALOG.find((template) =>
  template.tags.includes("促销"),
);

vi.mock("../api/templates.js", () => ({
  listTemplates: vi.fn(),
  listHotTemplates: vi.fn(),
  getTemplate: vi.fn(),
  favoriteTemplate: vi.fn(),
  unfavoriteTemplate: vi.fn(),
  createWorkFromTemplate: vi.fn(),
}));

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../auth/openLoginTab.js", () => ({
  openLoginTab: vi.fn(),
}));

function renderShowcase(props) {
  return render(
    <MemoryRouter>
      <AntdApp>
        <AuthProvider>
          <TemplateShowcase {...props} />
        </AuthProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("TemplateShowcase", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    listHotTemplates.mockResolvedValue([]);
    listTemplates.mockResolvedValue({ total: 0, records: [] });
    getTemplate.mockResolvedValue(null);
    favoriteTemplate.mockResolvedValue(null);
    unfavoriteTemplate.mockResolvedValue(null);
  });

  it("loads hot templates by default", async () => {
    listHotTemplates.mockResolvedValue([
      { id: 1, title: "夏日海报", category: "主题海报", tags: ["海报"], authorNickname: "Alice" },
    ]);

    renderShowcase();

    expect(await screen.findAllByText("夏日海报")).not.toHaveLength(0);
    expect(listHotTemplates).toHaveBeenCalledWith(20);
    expect(listTemplates).not.toHaveBeenCalled();
  });

  it("passes category when a tab is clicked", async () => {
    const user = userEvent.setup();
    listTemplates.mockResolvedValue({
      total: 1,
      records: [{ id: 2, title: "活动营销示例", category: "活动营销", tags: ["促销"] }],
    });

    renderShowcase();
    await user.click(screen.getByRole("tab", { name: "活动营销" }));

    await waitFor(() =>
      expect(listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ category: "活动营销", page: 1, size: 36 }),
      ),
    );
    expect(await screen.findAllByText("活动营销示例")).not.toHaveLength(0);
  });

  it("searches by keyword without category filter", async () => {
    listTemplates.mockResolvedValue({ total: 0, page: 1, size: 4, records: [] });

    renderShowcase({ keyword: "七夕" });

    await waitFor(() =>
      expect(listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: "七夕", page: 1, size: 12 }),
      ),
    );
    expect(listTemplates.mock.calls[0][0].category).toBeUndefined();
    expect(await screen.findByText(/暂无模板/)).toBeInTheDocument();
  });

  it("搜索命中标题、分类与标签", () => {
    const template = {
      title: "双11主图",
      category: "电商海报",
      tags: ["大促", "秒杀"],
      kicker: "SALE",
    };

    expect(matchesTemplateKeyword(template, "电商")).toBe(true);
    expect(matchesTemplateKeyword(template, "秒杀")).toBe(true);
    expect(matchesTemplateKeyword(template, "sale")).toBe(true);
    expect(matchesTemplateKeyword(template, "节日")).toBe(false);
  });

  it("后端无搜索结果时用内置模板补足", async () => {
    listTemplates.mockResolvedValue({ total: 0, records: [] });

    renderShowcase({ keyword: "商务" });

    expect(
      (await screen.findAllByText(FIRST_BUSINESS.title)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/后端暂无匹配模板/)).toBeInTheDocument();
  });

  it("后端与内置目录同名模板不重复展示", async () => {
    listTemplates.mockResolvedValue({
      total: 1,
      records: [
        {
          id: 99,
          title: FIRST_BUSINESS.title,
          category: "主题海报",
          tags: ["商务", "海报"],
        },
      ],
    });

    renderShowcase({ keyword: "商务" });

    await waitFor(() => {
      const names = [
        ...document.querySelectorAll(".template-name"),
      ].map((node) => node.textContent);
      expect(
        names.filter((name) => name === FIRST_BUSINESS.title),
      ).toHaveLength(1);
    });
  });

  it("搜索时保留当前分类过滤", async () => {
    listTemplates.mockResolvedValue({ total: 0, records: [] });

    renderShowcase({ keyword: "促销", category: "promo" });

    await waitFor(() =>
      expect(listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({
          category: "活动营销",
          keyword: "促销",
          page: 1,
          size: 12,
        }),
      ),
    );
    expect(
      (await screen.findAllByText(FIRST_SALE.title)).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText(FIRST_BUSINESS.title)).not.toBeInTheDocument();
  });

  it("后端失败时搜索仍展示内置模板", async () => {
    listTemplates.mockRejectedValue(new Error("网络异常"));

    renderShowcase({ keyword: "美食" });

    expect(
      (await screen.findAllByText(FIRST_FOOD.title)).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(/后端暂不可用/)).toBeInTheDocument();
  });

  it("searchLocalTemplates 按关键词筛选内置目录", () => {
    const results = searchLocalTemplates("all", "商务");

    expect(results.map((template) => template.title)).toContain(
      FIRST_BUSINESS.title,
    );
    expect(results.every((template) => template.jsonData)).toBe(true);
  });

  it("后端失败时回退到内置示例模板", async () => {
    listHotTemplates.mockRejectedValue(new Error("网络异常"));

    renderShowcase();

    expect(await screen.findByText(/后端暂不可用/)).toBeInTheDocument();
    expect(
      await screen.findAllByText(FIRST_BUSINESS.title),
    ).not.toHaveLength(0);
  });

  it("后端无数据时用内置示例模板兜底并按分类分组", async () => {
    listHotTemplates.mockResolvedValue([]);

    const view = renderShowcase();

    expect(
      await screen.findAllByText(FIRST_BUSINESS.title),
    ).not.toHaveLength(0);
    expect(screen.getByText(/后端暂无模板/)).toBeInTheDocument();
    expect(
      view.container.querySelectorAll(".template-group").length,
    ).toBeGreaterThan(0);
    expect(view.container.querySelector(".template-row")).not.toBeNull();
    expect(
      view.container.querySelector(".template-group-title"),
    ).toHaveTextContent("主题海报");
  });

  it("opens template detail from a card and loads the detail endpoint", async () => {
    const user = userEvent.setup();
    listHotTemplates.mockResolvedValue([
      {
        id: 1,
        title: "夏日海报",
        category: "主题海报",
        tags: ["海报"],
        authorNickname: "Alice",
        viewCount: 3,
        downloadCount: 1,
      },
    ]);
    getTemplate.mockResolvedValue({
      id: 1,
      title: "夏日海报",
      category: "主题海报",
      tags: ["海报"],
      authorNickname: "Alice",
      viewCount: 4,
      downloadCount: 1,
      isPublic: true,
    });

    const view = renderShowcase();

    await screen.findAllByText("夏日海报");
    await user.click(view.container.querySelector(".template-card"));

    await waitFor(() => expect(getTemplate).toHaveBeenCalledWith(1));
    expect(await screen.findByRole("button", { name: "使用模板" })).toBeInTheDocument();
    expect(screen.getByText("作者：Alice")).toBeInTheDocument();
  });

  it("收藏远程模板并可在详情弹窗中取消收藏", async () => {
    const user = userEvent.setup();
    localStorage.setItem("dp.token", "test-token");
    localStorage.setItem(
      "dp.user",
      JSON.stringify({ id: 1, username: "alice", nickname: "Alice", role: "USER" }),
    );
    listHotTemplates.mockResolvedValue([
      {
        id: 7,
        title: "夏日海报",
        category: "主题海报",
        tags: ["海报"],
        authorNickname: "Alice",
      },
    ]);
    getTemplate.mockResolvedValue({
      id: 7,
      title: "夏日海报",
      category: "主题海报",
      tags: ["海报"],
      authorNickname: "Alice",
      isPublic: true,
    });

    const view = renderShowcase();

    await screen.findAllByText("夏日海报");
    await user.click(screen.getByRole("button", { name: "收藏 夏日海报" }));
    await waitFor(() => expect(favoriteTemplate).toHaveBeenCalledWith(7));

    await user.click(view.container.querySelector(".template-card"));
    await waitFor(() => expect(getTemplate).toHaveBeenCalledWith(7));
    const favoriteButton = await screen.findByRole("button", {
      name: /已收藏/,
    });

    await user.click(favoriteButton);
    await waitFor(() => expect(unfavoriteTemplate).toHaveBeenCalledWith(7));
  });

  it("内置模板画布包含与预览一致的排版元素", () => {
    const template = TEMPLATE_CATALOG[0];
    const canvas = JSON.parse(canvasJsonForLocalTemplate(template));

    expect(canvas.elements.map((item) => item.id)).toEqual([
      "template-image",
      "template-title",
    ]);
    expect(canvas.elements.find((item) => item.id === "template-title").text).toBe(
      template.title,
    );

    const prepared = applyCatalogCanvas({
      id: 1,
      title: template.title,
      jsonData: '{"width":1080,"height":1440,"elements":[]}',
    });
    expect(prepared.fromCatalog).toBe(true);
    expect(JSON.parse(prepared.template.jsonData).elements.length).toBe(2);
  });

  it("分类模板不足一行时补足到 4 张", async () => {
    listHotTemplates.mockResolvedValue([
      {
        id: 1,
        title: "夏日海报",
        category: "主题海报",
        tags: ["海报"],
        authorNickname: "Alice",
      },
    ]);

    const view = renderShowcase();

    await screen.findAllByText("夏日海报");
    const group = view.container.querySelector(".template-group");
    expect(group.querySelectorAll(".template-card")).toHaveLength(4);
  });

  it("分类模板超出单行时显示左右箭头并可滑动", async () => {
    const user = userEvent.setup();
    listHotTemplates.mockResolvedValue(
      Array.from({ length: 6 }, (_, index) => ({
        id: index + 1,
        title: `海报 ${index + 1}`,
        category: "主题海报",
        tags: ["海报"],
        authorNickname: "Alice",
      })),
    );

    const view = renderShowcase();

    await screen.findAllByText("海报 1");
    const group = view.container.querySelector(".template-group");
    const row = group.querySelector(".template-row");
    expect(group.querySelectorAll(".template-card")).toHaveLength(6);
    expect(
      screen.getByRole("button", { name: "主题海报向左滑动" }),
    ).toBeInTheDocument();
    const right = screen.getByRole("button", {
      name: "主题海报向右滑动",
    });

    Object.defineProperty(row, "clientWidth", {
      configurable: true,
      value: 1000,
    });
    Object.defineProperty(row, "scrollWidth", {
      configurable: true,
      value: 1600,
    });
    Object.defineProperty(row, "scrollLeft", {
      configurable: true,
      writable: true,
      value: 0,
    });

    await user.click(right);

    expect(row.scrollLeft).toBeGreaterThan(0);
  });
});
