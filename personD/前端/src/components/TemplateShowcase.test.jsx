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

  it("loads templates of the active category from the API", async () => {
    listTemplates.mockResolvedValue({
      total: 1,
      page: 1,
      size: 8,
      records: [
        {
          id: 1,
          title: "夏日海报",
          category: "主题海报",
          tags: ["海报", "节日"],
          authorNickname: "Alice",
        },
      ],
    });

    renderShowcase();

    expect(await screen.findByText("夏日海报")).toBeInTheDocument();
    expect(listTemplates).toHaveBeenCalledWith(
      expect.objectContaining({ category: "主题海报", keyword: undefined }),
    );
  });

  it("searches by keyword without category filter", async () => {
    listTemplates.mockResolvedValue({ total: 0, page: 1, size: 8, records: [] });

    renderShowcase({ keyword: "七夕" });

    await waitFor(() =>
      expect(listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ category: undefined, keyword: "七夕" }),
      ),
    );
    expect(await screen.findByText(/暂无模板/)).toBeInTheDocument();
  });

  it("shows an error hint when the API fails", async () => {
    listTemplates.mockRejectedValue(new Error("网络异常"));

    renderShowcase();

    expect(await screen.findByText(/模板加载失败/)).toBeInTheDocument();
  });
});
