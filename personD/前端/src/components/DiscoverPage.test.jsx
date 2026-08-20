import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DiscoverPage from "./DiscoverPage.jsx";
import DiscoverStickyHeader, { DiscoverNavProvider } from "./DiscoverHeader.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { listHotTemplates, listTemplates } from "../api/templates.js";

vi.mock("../api/templates.js", () => ({
  listHotTemplates: vi.fn(),
  listTemplates: vi.fn(),
  createWorkFromTemplate: vi.fn(),
}));

vi.mock("../api/assets.js", () => ({
  listAssets: vi.fn(),
}));

function renderDiscover() {
  return render(
    <MemoryRouter>
      <AntdApp>
        <AuthProvider>
          <DiscoverNavProvider>
            <DiscoverStickyHeader pinned={false} scale={1} left={80} width={1360} />
            <DiscoverPage />
          </DiscoverNavProvider>
        </AuthProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("DiscoverPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    listHotTemplates.mockResolvedValue([]);
    listTemplates.mockResolvedValue({ records: [] });
  });

  it("renders the discover search, categories and loads hot templates", async () => {
    listHotTemplates.mockResolvedValue([{ id: 1, title: "热门海报", category: "主题海报" }]);
    renderDiscover();

    expect(screen.getByPlaceholderText("搜索你想要的创意模板、素材与作品")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "模板推荐" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "图片模板" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /渠道/ })).toBeInTheDocument();
    expect(await screen.findByText("热门海报")).toBeInTheDocument();
    expect(listHotTemplates).toHaveBeenCalled();
  });

  it("switches category underline when a tab is clicked", async () => {
    const user = userEvent.setup();
    listTemplates.mockResolvedValue({
      records: [{ id: 2, title: "种草封面", category: "小红书种草" }],
    });
    renderDiscover();

    await user.click(screen.getByRole("button", { name: "小红书" }));

    expect(screen.getByRole("button", { name: "小红书" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "模板推荐" })).not.toHaveClass("active");
    await waitFor(() =>
      expect(listTemplates).toHaveBeenCalledWith(
        expect.objectContaining({ category: "小红书种草" }),
      ),
    );
    expect(await screen.findByText("种草封面")).toBeInTheDocument();
  });

  it("keeps the type filter row out of the sticky header", () => {
    render(
      <DiscoverNavProvider>
        <DiscoverStickyHeader pinned scale={1} left={80} width={1360} />
      </DiscoverNavProvider>,
    );

    expect(screen.getByRole("button", { name: "模板推荐" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "图片模板" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /渠道/ })).not.toBeInTheDocument();
  });

  it("keeps the same header and only adds a white background when pinned", () => {
    const rest = render(
      <DiscoverNavProvider>
        <DiscoverStickyHeader pinned={false} scale={1} left={80} width={1360} />
      </DiscoverNavProvider>,
    );
    expect(rest.container.querySelector(".discover-sticky")).not.toHaveClass("pinned");
    expect(rest.getByPlaceholderText("搜索你想要的创意模板、素材与作品")).toBeInTheDocument();
    expect(rest.container.querySelector(".discover-sticky")).toHaveStyle({
      background: "rgba(0, 0, 0, 0)",
    });
    rest.unmount();

    const pinned = render(
      <DiscoverNavProvider>
        <DiscoverStickyHeader pinned scale={1} left={80} width={1360} />
      </DiscoverNavProvider>,
    );
    expect(pinned.container.querySelector(".discover-sticky")).toHaveClass("pinned");
    expect(pinned.getByPlaceholderText("搜索你想要的创意模板、素材与作品")).toBeInTheDocument();
    expect(pinned.container.querySelector(".discover-sticky")).toHaveStyle({
      background: "rgb(255, 255, 255)",
    });
  });
});
