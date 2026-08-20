import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import TemplateShowcase from "./TemplateShowcase.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { listHotTemplates, listTemplates } from "../api/templates.js";

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

    expect(await screen.findByText("夏日海报")).toBeInTheDocument();
    expect(listHotTemplates).toHaveBeenCalledWith(4);
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
        expect.objectContaining({ category: "活动营销", page: 1, size: 4 }),
      ),
    );
    expect(await screen.findByText("活动营销示例")).toBeInTheDocument();
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
    listHotTemplates.mockRejectedValue(new Error("网络异常"));

    renderShowcase();

    expect(await screen.findByText(/模板加载失败/)).toBeInTheDocument();
  });
});
