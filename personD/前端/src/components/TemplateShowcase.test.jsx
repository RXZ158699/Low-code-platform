import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TemplateShowcase from "./TemplateShowcase.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { listHotTemplates, listTemplates } from "../api/templates.js";
import {
  applyCatalogCanvas,
  canvasJsonForLocalTemplate,
} from "./TemplateShowcase.jsx";
import { TEMPLATE_CATALOG } from "../data/templateCatalog.js";

vi.mock("../api/templates.js", () => ({
  listTemplates: vi.fn(),
  listHotTemplates: vi.fn(),
  createWorkFromTemplate: vi.fn(),
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

  it("后端失败时回退到内置示例模板", async () => {
    listHotTemplates.mockRejectedValue(new Error("网络异常"));

    renderShowcase();

    expect(await screen.findByText(/后端暂不可用/)).toBeInTheDocument();
    expect(await screen.findAllByText("夏日冰爽饮品节")).not.toHaveLength(0);
  });

  it("后端无数据时用内置示例模板兜底并渲染 4 列", async () => {
    listHotTemplates.mockResolvedValue([]);

    const view = renderShowcase();

    expect(await screen.findAllByText("夏日冰爽饮品节")).not.toHaveLength(0);
    expect(screen.getByText(/后端暂无模板/)).toBeInTheDocument();
    expect(
      view.container.querySelectorAll(".template-column").length,
    ).toBe(4);
  });

  it("内置模板画布包含与预览一致的排版元素", () => {
    const template = TEMPLATE_CATALOG[0];
    const canvas = JSON.parse(canvasJsonForLocalTemplate(template));

    expect(canvas.elements.map((item) => item.id)).toEqual([
      "template-deco-circle",
      "template-deco-rect",
      "template-kicker",
      "template-title",
      "template-tags",
    ]);
    expect(canvas.elements.find((item) => item.id === "template-title").text).toBe(
      template.title,
    );
    expect(canvas.elements.find((item) => item.id === "template-kicker").text).toBe(
      template.kicker,
    );

    const prepared = applyCatalogCanvas({
      id: 1,
      title: template.title,
      jsonData: '{"width":1080,"height":1440,"elements":[]}',
    });
    expect(prepared.fromCatalog).toBe(true);
    expect(JSON.parse(prepared.template.jsonData).elements.length).toBe(5);
  });
});
