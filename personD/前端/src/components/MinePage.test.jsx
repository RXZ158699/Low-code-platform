import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MinePage from "./MinePage.jsx";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import { AppPageProvider } from "../AppPageContext.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { listWorks, createWork } from "../api/works.js";
import { listAssets, uploadAsset } from "../api/assets.js";
import { fetchMe } from "../api/auth.js";
import { openLoginTab } from "../auth/openLoginTab.js";

vi.mock("../api/works.js", () => ({
  listWorks: vi.fn(),
  createWork: vi.fn(),
  deleteWork: vi.fn(),
}));

vi.mock("../api/assets.js", () => ({
  listAssets: vi.fn(),
  uploadAsset: vi.fn(),
  deleteAsset: vi.fn(),
}));

vi.mock("../api/teams.js", () => ({
  listTeams: vi.fn(() => Promise.resolve([])),
  createTeam: vi.fn(),
  inviteMember: vi.fn(),
}));

vi.mock("../api/shares.js", () => ({
  createShare: vi.fn(),
  sharePageUrl: vi.fn((token) => `http://localhost/share/${token}`),
}));

vi.mock("../auth/openLoginTab.js", () => ({
  openLoginTab: vi.fn(),
}));

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(() => Promise.resolve(null)),
}));

function renderMine(setPage = vi.fn()) {
  return render(
    <MemoryRouter>
      <AntdApp>
        <AuthProvider>
          <AppPageProvider page="mine" setPage={setPage}>
            <CreatePopoverProvider>
              <MinePage />
            </CreatePopoverProvider>
          </AppPageProvider>
        </AuthProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

function seedLogin() {
  localStorage.setItem("dp.token", "token");
  localStorage.setItem(
    "dp.user",
    JSON.stringify({ id: 2, username: "demo", nickname: "演示用户" }),
  );
  fetchMe.mockResolvedValue({ id: 2, username: "demo", nickname: "演示用户" });
}

describe("MinePage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    fetchMe.mockResolvedValue(null);
    listAssets.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
  });

  it("renders the my-space chrome and empty state", async () => {
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });

    renderMine();

    expect(screen.getByPlaceholderText("搜索你想要的创意模板、素材与作品")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "我的空间" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /邀请成员/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /添加$/ })).toBeInTheDocument();
    expect(await screen.findByText("拖放文件到这里，开始云端作图")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部 (0)" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "上传文件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "从「稿定设计」导入" })).toBeInTheDocument();
  });

  it("lists works from the API", async () => {
    seedLogin();
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "夏日海报作品",
          status: "DRAFT",
          updatedAt: "2026-08-19T10:00:00",
        },
      ],
    });

    renderMine();

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部 (1)" })).toBeInTheDocument();
    expect(screen.queryByText("拖放文件到这里，开始云端作图")).not.toBeInTheDocument();
    expect(listWorks).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 24 }));
    expect(listWorks.mock.calls[0][0].status).toBeUndefined();
  });

  it("shows hover actions on a work card", async () => {
    seedLogin();
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "夏日海报作品",
          status: "DRAFT",
          updatedAt: "2026-08-19T10:00:00",
        },
      ],
    });
    renderMine();

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建设计" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "选择 夏日海报作品" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "下载 夏日海报作品" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "更多操作 夏日海报作品" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "创建设计" }));
    expect(screen.queryByText("编辑器开发中")).not.toBeInTheDocument();
  });

  it("enters selection mode from the card checkbox", async () => {
    seedLogin();
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "夏日海报作品",
          status: "DRAFT",
          updatedAt: "2026-08-19T10:00:00",
        },
      ],
    });
    renderMine();

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "选择 夏日海报作品" }));

    expect(screen.getByRole("button", { name: "已选 1/1" })).toBeInTheDocument();
    const selectBar = screen.getByRole("toolbar", { name: "已选作品操作" });
    expect(selectBar).toBeInTheDocument();
    expect(selectBar.parentElement).toBe(document.body);
    expect(selectBar).toHaveStyle({ position: "fixed" });
    expect(screen.getByText("已选 1")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "全部 (1)" })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "取消选择" }));
    expect(screen.getByRole("button", { name: "全部 (1)" })).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.queryByRole("toolbar", { name: "已选作品操作" })).not.toBeInTheDocument();
    });
  });

  it("requests drafts when 草稿箱 is selected", async () => {
    seedLogin();
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: "草稿箱" }));

    await waitFor(() =>
      expect(listWorks).toHaveBeenCalledWith(expect.objectContaining({ status: "DRAFT" })),
    );
    expect(screen.getByRole("button", { name: "草稿箱" })).toHaveClass("active");
  });

  it("creates a work from the add button", async () => {
    seedLogin();
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    createWork.mockResolvedValue({
      id: 3,
      title: "未命名作品",
      status: "DRAFT",
      updatedAt: "2026-08-19T12:00:00",
    });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: /添加$/ }));

    expect(await screen.findByText("未命名作品")).toBeInTheDocument();
    expect(createWork).toHaveBeenCalledWith({ title: "未命名作品" });
  });

  it("opens login when 上传文件 is clicked while logged out", async () => {
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: "上传文件" }));

    expect(openLoginTab).toHaveBeenCalledTimes(1);
    expect(uploadAsset).not.toHaveBeenCalled();
  });

  it("opens the local file picker and uploads selected images", async () => {
    seedLogin();
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    uploadAsset.mockResolvedValue({
      id: 21,
      fileName: "海报.png",
      url: "http://localhost:9000/assets/海报.png",
      fileType: "image",
      createdAt: "2026-08-19T14:00:00",
    });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    const input = screen.getByLabelText("选择本地图片");
    const clickSpy = vi.spyOn(input, "click");
    await user.click(screen.getByRole("button", { name: "上传文件" }));
    expect(clickSpy).toHaveBeenCalled();

    const file = new File(["img"], "海报.png", { type: "image/png" });
    await user.upload(input, file);

    expect(uploadAsset).toHaveBeenCalledTimes(1);
    expect(uploadAsset.mock.calls[0][0]).toBe(file);
    expect(await screen.findByText("海报.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "我上传的" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "上传图片" })).toBeInTheDocument();
  });

  it("rejects non-image files without calling the upload API", async () => {
    seedLogin();
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    const input = screen.getByLabelText("选择本地图片");
    const file = new File(["pdf"], "说明.pdf", { type: "application/pdf" });
    await user.upload(input, file);

    expect(uploadAsset).not.toHaveBeenCalled();
  });

  it("returns to the homepage when importing from 稿定设计", async () => {
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const setPage = vi.fn();
    const user = userEvent.setup();
    renderMine(setPage);

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: "从「稿定设计」导入" }));

    expect(setPage).toHaveBeenCalledWith("create");
  });
});
