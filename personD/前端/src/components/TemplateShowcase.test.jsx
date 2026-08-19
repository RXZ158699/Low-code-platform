import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TemplateShowcase from "./TemplateShowcase.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { listTemplates } from "../api/templates.js";

vi.mock("../api/templates.js", () => ({
  listTemplates: vi.fn(),
  useTemplate: vi.fn(),
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
  });

  it("loads featured templates from the API without category filter", async () => {
    listTemplates.mockResolvedValue({
      total: 4,
      page: 1,
      size: 4,
      records: [
        {
          id: 1,
          title: "夏日海报",
          category: "主题海报",
          tags: ["海报", "节日"],
          authorNickname: "Alice",
        },
        {
          id: 2,
          title: "活动营销示例",
          category: "活动营销",
          tags: ["促销"],
          authorNickname: "Alice",
        },
      ],
    });

    renderShowcase();

    expect(await screen.findByText("夏日海报")).toBeInTheDocument();
    expect(await screen.findByText("活动营销示例")).toBeInTheDocument();
    expect(listTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ keyword: undefined, page: 1, size: 4 }),
    );
    expect(listTemplates.mock.calls[0][0].category).toBeUndefined();
  });

  it("searches by keyword without category filter", async () => {
    listTemplates.mockResolvedValue({ total: 0, page: 1, size: 4, records: [] });

    renderShowcase({ keyword: "七夕" });

    await waitFor(() =>
      expect(listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ keyword: "七夕", page: 1, size: 4 }),
      ),
    );
    expect(listTemplates.mock.calls[0][0].category).toBeUndefined();
    expect(await screen.findByText(/暂无模板/)).toBeInTheDocument();
  });

  it("shows an error hint when the API fails", async () => {
    listTemplates.mockRejectedValue(new Error("网络异常"));

    renderShowcase();

    expect(await screen.findByText(/模板加载失败/)).toBeInTheDocument();
  });
});
