import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MinePage from "./MinePage.jsx";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import { AppPageProvider } from "../AppPageContext.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { archiveWork, listWorks, createWork, getWork, listTrashedWorks, restoreWork, purgeWork, listFavoriteWorks, favoriteWork, unarchiveWork, unfavoriteWork } from "../api/works.js";
import { listAssetCategories, listAssets, uploadAsset, getAsset, updateAsset, listTrashedAssets, restoreAsset, purgeAsset, listFavoriteAssets, favoriteAsset, unfavoriteAsset } from "../api/assets.js";
import { fetchMe } from "../api/auth.js";
import { openLoginTab } from "../auth/openLoginTab.js";
import { inviteMember, listTeams, listMembers, removeMember, updateMemberRole, getTeam, listTeamWorks, listTeamAssets, updateTeam } from "../api/teams.js";
import { createShare, listWorkShares, deleteShare } from "../api/shares.js";

vi.mock("../api/works.js", () => ({
  listWorks: vi.fn(),
  createWork: vi.fn(),
  deleteWork: vi.fn(),
  getWork: vi.fn(),
  archiveWork: vi.fn(),
  unarchiveWork: vi.fn(),
  listTrashedWorks: vi.fn(),
  restoreWork: vi.fn(),
  purgeWork: vi.fn(),
  listFavoriteWorks: vi.fn(),
  favoriteWork: vi.fn(),
  unfavoriteWork: vi.fn(),
}));

vi.mock("../api/assets.js", () => ({
  listAssets: vi.fn(),
  listAssetCategories: vi.fn(),
  uploadAsset: vi.fn(),
  deleteAsset: vi.fn(),
  getAsset: vi.fn(),
  updateAsset: vi.fn(),
  listTrashedAssets: vi.fn(),
  restoreAsset: vi.fn(),
  purgeAsset: vi.fn(),
  listFavoriteAssets: vi.fn(),
  favoriteAsset: vi.fn(),
  unfavoriteAsset: vi.fn(),
}));

vi.mock("../api/teams.js", () => ({
  listTeams: vi.fn(() => Promise.resolve([])),
  createTeam: vi.fn(),
  inviteMember: vi.fn(),
  getTeam: vi.fn(),
  updateTeam: vi.fn(),
  deleteTeam: vi.fn(),
  listMembers: vi.fn(() => Promise.resolve([])),
  removeMember: vi.fn(),
  updateMemberRole: vi.fn(),
  listTeamWorks: vi.fn(),
  listTeamAssets: vi.fn(),
}));

vi.mock("../api/shares.js", () => ({
  createShare: vi.fn(),
  sharePageUrl: vi.fn((token) => `http://localhost/share/${token}`),
  listWorkShares: vi.fn(() => Promise.resolve([])),
  deleteShare: vi.fn(),
}));

vi.mock("../auth/openLoginTab.js", () => ({
  openLoginTab: vi.fn(),
}));

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(() => Promise.resolve(null)),
}));

function seedUser(user) {
  if (user) {
    localStorage.setItem("dp.token", "token");
    localStorage.setItem("dp.user", JSON.stringify(user));
  } else {
    localStorage.clear();
  }
}

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
    listAssetCategories.mockResolvedValue([{ name: "海报", count: 2 }]);
    listTrashedWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listTrashedAssets.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    restoreWork.mockResolvedValue({ id: 9, title: "已删海报" });
    restoreAsset.mockResolvedValue({ id: 8, fileName: "a.png" });
    purgeWork.mockResolvedValue(null);
    purgeAsset.mockResolvedValue(null);
    listFavoriteWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listFavoriteAssets.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    favoriteWork.mockResolvedValue(null);
    favoriteAsset.mockResolvedValue(null);
    unfavoriteWork.mockResolvedValue(null);
    unfavoriteAsset.mockResolvedValue(null);
    archiveWork.mockResolvedValue({ id: 9, title: "夏日海报作品", status: "ARCHIVED" });
    unarchiveWork.mockResolvedValue({ id: 9, title: "夏日海报作品", status: "DRAFT" });
    getWork.mockResolvedValue({
      id: 9,
      title: "夏日海报作品",
      status: "DRAFT",
      canvasJson: '{"width":1080,"height":608,"background":"#ffffff","elements":[]}',
      createdAt: "2026-08-21T08:08:00",
      updatedAt: "2026-08-21T08:30:00",
    });
  });

  it("renders the my-space chrome and empty state", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });

    renderMine();

    expect(screen.getByPlaceholderText("搜索你想要的创意模板、素材与作品")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "我的空间" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /邀请成员/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /添加$/ })).toBeInTheDocument();
    expect(await screen.findByText("拖放文件到这里，开始云端作图")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "全部 (0)" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "上传文件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "从「一稿设计」导入" })).toBeInTheDocument();
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
          thumbnailUrl: "http://cdn/works/summer.png",
          updatedAt: "2026-08-19T10:00:00",
        },
      ],
    });

    renderMine();

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "夏日海报作品" })).toHaveAttribute(
      "src",
      "http://cdn/works/summer.png",
    );
    expect(screen.getByRole("button", { name: "全部 (1)" })).toBeInTheDocument();
    expect(screen.queryByText("拖放文件到这里，开始云端作图")).not.toBeInTheDocument();
    expect(listWorks).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 24 }));
    expect(listWorks.mock.calls[0][0].status).toBeUndefined();
  });

  it("shows hover actions on a work card", async () => {
    seedUser({ id: 1, role: 1 });
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
    seedUser({ id: 1, role: 1 });
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

  it("requests archived works when 已归档 is selected", async () => {
    seedLogin();
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: "已归档" }));

    await waitFor(() =>
      expect(listWorks).toHaveBeenCalledWith(expect.objectContaining({ status: "ARCHIVED" })),
    );
    expect(screen.getByRole("button", { name: "已归档" })).toHaveClass("active");
  });

  it("loads asset categories and filters assets by category", async () => {
    seedLogin();
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listAssets.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listAssetCategories.mockResolvedValue([{ name: "海报", count: 2 }]);
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    expect(listAssetCategories).toHaveBeenCalledWith({ scope: "mine" });

    await user.click(screen.getByRole("button", { name: "类别" }));
    await user.click(await screen.findByText("海报"));

    await waitFor(() =>
      expect(listAssets).toHaveBeenCalledWith(expect.objectContaining({ category: "海报" })),
    );
  });

  it("archives a work from the card menu", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        { id: 9, title: "夏日海报作品", status: "DRAFT", updatedAt: "2026-08-19T10:00:00" },
      ],
    });
    const user = userEvent.setup();
    renderMine();

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更多操作 夏日海报作品" }));
    await user.click(await screen.findByText("归档"));

    await waitFor(() => expect(archiveWork).toHaveBeenCalledWith(9));
    expect(screen.queryByText("夏日海报作品")).not.toBeInTheDocument();
  });

  it("unarchives a work from the archived tab", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        { id: 9, title: "夏日海报作品", status: "ARCHIVED", updatedAt: "2026-08-19T10:00:00" },
      ],
    });
    const user = userEvent.setup();
    renderMine();

    await user.click(screen.getByRole("button", { name: "已归档" }));

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "取消归档 夏日海报作品" }));

    await waitFor(() => expect(unarchiveWork).toHaveBeenCalledWith(9));
    expect(screen.queryByText("夏日海报作品")).not.toBeInTheDocument();
  });

  it("creates a work from the add button", async () => {
    seedUser({ id: 1, role: 1 });
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

  it("hides upload/import entries for logged-out visitors (read-only)", async () => {
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    expect(screen.queryByRole("button", { name: "上传文件" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "从「一稿设计」导入" })).not.toBeInTheDocument();
    expect(openLoginTab).not.toHaveBeenCalled();
  });

  it("opens the local file picker and uploads selected images", async () => {
    seedUser({ id: 1, role: 1 });
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

  it("returns to the homepage when importing from 一稿设计", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const setPage = vi.fn();
    const user = userEvent.setup();
    renderMine(setPage);

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: "从「一稿设计」导入" }));

    expect(setPage).toHaveBeenCalledWith("create");
  });

  it("lists existing share links and revokes one", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [{ id: 9, title: "夏日海报作品", status: "DRAFT", updatedAt: "2026-08-19T10:00:00" }],
    });
    listWorkShares.mockResolvedValue([{ id: 4, token: "abc", permission: "VIEW" }]);
    deleteShare.mockResolvedValue(null);
    const user = userEvent.setup();
    renderMine();

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更多操作 夏日海报作品" }));
    await user.click(await screen.findByText("分享"));

    expect(await screen.findByDisplayValue("http://localhost/share/abc")).toBeInTheDocument();
    expect(screen.getByText("只读")).toBeInTheDocument();
    expect(listWorkShares).toHaveBeenCalledWith(9);

    await user.click(screen.getByRole("button", { name: "撤销链接 abc" }));
    await waitFor(() => expect(deleteShare).toHaveBeenCalledWith(4));
  });

  it("creates a share link with an access code", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        { id: 9, title: "夏日海报作品", status: "DRAFT", updatedAt: "2026-08-19T10:00:00" },
      ],
    });
    createShare.mockResolvedValue({ id: 4, token: "abc", permission: "VIEW" });
    listWorkShares.mockResolvedValue([]);
    const user = userEvent.setup();
    renderMine();

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更多操作 夏日海报作品" }));
    await user.click(await screen.findByText("分享"));
    await user.type(screen.getByPlaceholderText("4-8 位字母数字"), "abcd");
    await user.click(screen.getByRole("button", { name: "创建只读链接" }));

    await waitFor(() =>
      expect(createShare).toHaveBeenCalledWith(
        9,
        expect.objectContaining({ permission: "VIEW", accessCode: "abcd" }),
      ),
    );
  });

  it("loads share links when 分享管理 is selected", async () => {
    seedLogin();
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [{ id: 9, title: "夏日海报作品", status: "DRAFT", updatedAt: "2026-08-19T10:00:00" }],
    });
    listWorkShares.mockResolvedValue([{ id: 4, token: "abc", permission: "EDIT" }]);
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("夏日海报作品");
    await user.click(screen.getByRole("button", { name: "分享管理" }));

    expect(await screen.findByText("可编辑")).toBeInTheDocument();
    expect(await screen.findByDisplayValue("http://localhost/share/abc")).toBeInTheDocument();
    expect(listWorkShares).toHaveBeenCalledWith(9);
  });

  it("shows team members and removes one", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listTeams.mockResolvedValue([{ id: 1, name: "设计组", myRole: "OWNER" }]);
    listMembers.mockResolvedValue([
      { userId: 2, username: "demo", nickname: "演示用户", role: "OWNER" },
      { userId: 3, username: "alice", nickname: "爱丽丝", role: "MEMBER" },
    ]);
    removeMember.mockResolvedValue(null);
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: /邀请成员/ }));

    expect(await screen.findByText("爱丽丝")).toBeInTheDocument();
    expect(listMembers).toHaveBeenCalledWith(1);
    await user.click(screen.getByRole("button", { name: "移除 爱丽丝" }));
    await waitFor(() => expect(removeMember).toHaveBeenCalledWith(1, 3));
  });

  it("invites a member with the selected role", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listTeams.mockResolvedValue([{ id: 1, name: "设计组", myRole: "OWNER" }]);
    listMembers.mockResolvedValue([]);
    inviteMember.mockResolvedValue({ userId: 3, username: "alice", role: "ADMIN" });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: /邀请成员/ }));
    await user.type(screen.getByPlaceholderText("对方用户名"), "alice");
    await user.click(screen.getByRole("combobox", { name: "邀请角色" }));
    await user.click(await screen.findByText("管理员"));
    await user.click(screen.getByRole("button", { name: "邀 请" }));

    await waitFor(() => expect(inviteMember).toHaveBeenCalledWith(1, "alice", "ADMIN"));
  });

  it("changes a member role from the member list", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listTeams.mockResolvedValue([{ id: 1, name: "设计组", myRole: "OWNER" }]);
    listMembers.mockResolvedValue([
      { userId: 3, username: "alice", nickname: "爱丽丝", role: "MEMBER" },
    ]);
    updateMemberRole.mockResolvedValue({
      userId: 3,
      username: "alice",
      nickname: "爱丽丝",
      role: "ADMIN",
    });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: /邀请成员/ }));
    expect(await screen.findByText("爱丽丝")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "设为管理员 爱丽丝" }));

    await waitFor(() => expect(updateMemberRole).toHaveBeenCalledWith(1, 3, "ADMIN"));
    expect(await screen.findByText("管理员")).toBeInTheDocument();
  });

  it("loads team works after viewing a team", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listTeams.mockResolvedValue([{ id: 1, name: "设计组", myRole: "OWNER" }]);
    listMembers.mockResolvedValue([]);
    getTeam.mockResolvedValue({ id: 1, name: "设计组", myRole: "OWNER" });
    listTeamWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [{ id: 11, title: "团队海报", status: "DRAFT", updatedAt: "2026-08-19T10:00:00" }],
    });
    listTeamAssets.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: /邀请成员/ }));
    await user.click(await screen.findByRole("button", { name: "查看团队内容" }));

    expect(await screen.findByText("团队海报")).toBeInTheDocument();
    expect(getTeam).toHaveBeenCalledWith(1);
    expect(listTeamWorks).toHaveBeenCalledWith(1, expect.objectContaining({ page: 1, size: 24 }));
    expect(listTeamAssets).toHaveBeenCalledWith(1, expect.objectContaining({ page: 1, size: 24 }));
  });

  it("renames the selected team", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listTeams.mockResolvedValue([{ id: 1, name: "设计组", myRole: "OWNER" }]);
    listMembers.mockResolvedValue([]);
    updateTeam.mockResolvedValue({ id: 1, name: "新组", myRole: "OWNER" });
    const user = userEvent.setup();
    renderMine();

    await screen.findByText("拖放文件到这里，开始云端作图");
    await user.click(screen.getByRole("button", { name: /邀请成员/ }));
    const renameInput = await screen.findByLabelText("团队名称");
    await user.clear(renameInput);
    await user.type(renameInput, "新组");
    await user.click(screen.getByRole("button", { name: "保存名称" }));

    await waitFor(() => expect(updateTeam).toHaveBeenCalledWith(1, "新组"));
  });

  it("saves asset visibility from 素材设置", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listAssets.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [{ id: 21, fileName: "海报.png", url: "http://cdn/a.png", isPublic: false, createdAt: "2026-08-19T14:00:00" }],
    });
    listTeams.mockResolvedValue([{ id: 1, name: "设计组" }]);
    getAsset.mockResolvedValue({ id: 21, fileName: "海报.png", isPublic: false, teamId: null, category: "" });
    updateAsset.mockResolvedValue({ id: 21, isPublic: true, teamId: 1 });
    const user = userEvent.setup();
    renderMine();

    expect(await screen.findByText("海报.png")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更多操作 海报.png" }));
    await user.click(await screen.findByText("素材设置"));

    expect(await screen.findByRole("dialog", { name: "素材设置" })).toBeInTheDocument();
    await waitFor(() => expect(getAsset).toHaveBeenCalledWith(21));
    await user.click(screen.getByRole("switch", { name: "公开" }));
    await user.click(screen.getByRole("button", { name: "保存设置" }));

    await waitFor(() => expect(updateAsset).toHaveBeenCalledWith(21, expect.objectContaining({ isPublic: true })));
  });

  it("opens a work detail view on the mine page instead of jumping to the editor", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "横版海报",
          status: "DRAFT",
          canvasJson: '{"width":1080,"height":608,"background":"#ffffff","elements":[]}',
          createdAt: "2026-08-21T08:08:00",
          updatedAt: "2026-08-21T08:30:00",
        },
      ],
    });
    getWork.mockResolvedValue({
      id: 9,
      title: "横版海报",
      status: "DRAFT",
      canvasJson: '{"width":1080,"height":608,"background":"#ffffff","elements":[]}',
      createdAt: "2026-08-21T08:08:00",
      updatedAt: "2026-08-21T09:15:00",
    });
    const user = userEvent.setup();
    renderMine();

    expect(await screen.findByText("横版海报")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".mine-card-hover"));

    expect(await screen.findByRole("button", { name: "返回" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "横版海报" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "编辑" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AI 编辑" })).toBeInTheDocument();
    expect(screen.getByText("基本信息")).toBeInTheDocument();
    expect(screen.getByText("文件位置")).toBeInTheDocument();
    expect(await screen.findByText("2026/08/21 08:08")).toBeInTheDocument();
    expect(await screen.findByText("2026/08/21 09:15")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ 添加标签" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "全部 (1)" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "返回" }));
    expect(await screen.findByRole("button", { name: "全部 (1)" })).toBeInTheDocument();
  });

  it("opens the editor from the work detail edit button", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "横版海报",
          status: "DRAFT",
          updatedAt: "2026-08-21T08:30:00",
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AntdApp>
          <AuthProvider>
            <AppPageProvider page="mine" setPage={vi.fn()}>
              <CreatePopoverProvider>
                <Routes>
                  <Route path="/" element={<MinePage />} />
                  <Route path="/works/:id" element={<div>编辑器页面</div>} />
                </Routes>
              </CreatePopoverProvider>
            </AppPageProvider>
          </AuthProvider>
        </AntdApp>
      </MemoryRouter>,
    );

    expect(await screen.findByText("横版海报")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".mine-card-hover"));
    fireEvent.click(await screen.findByRole("button", { name: "编辑" }));
    expect(await screen.findByText("编辑器页面")).toBeInTheDocument();
  });

  it("opens the editor from the card create-design button", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "横版海报",
          status: "DRAFT",
          updatedAt: "2026-08-21T08:30:00",
        },
      ],
    });
    render(
      <MemoryRouter initialEntries={["/"]}>
        <AntdApp>
          <AuthProvider>
            <AppPageProvider page="mine" setPage={vi.fn()}>
              <CreatePopoverProvider>
                <Routes>
                  <Route path="/" element={<MinePage />} />
                  <Route path="/works/:id" element={<div>编辑器页面</div>} />
                </Routes>
              </CreatePopoverProvider>
            </AppPageProvider>
          </AuthProvider>
        </AntdApp>
      </MemoryRouter>,
    );

    expect(await screen.findByText("横版海报")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "创建设计" }));
    expect(await screen.findByText("编辑器页面")).toBeInTheDocument();
  });

  it("lists trashed works in 回收站 and restores them", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listTrashedWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "已删海报",
          status: "DRAFT",
          deletedAt: "2026-08-21T10:00:00",
          updatedAt: "2026-08-21T10:00:00",
        },
      ],
    });
    listTrashedAssets.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 8,
          fileName: "旧图.png",
          url: "http://cdn/old.png",
          deletedAt: "2026-08-21T09:00:00",
        },
      ],
    });
    const user = userEvent.setup();
    renderMine();

    await user.click(screen.getByRole("button", { name: "回收站" }));
    expect(await screen.findByText("已删海报")).toBeInTheDocument();
    expect(screen.getByText("旧图.png")).toBeInTheDocument();
    expect(listTrashedWorks).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 24 }));
    expect(listTrashedAssets).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 24 }));
    expect(screen.getByRole("button", { name: "还原 已删海报" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "创建设计" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "还原 已删海报" }));
    await waitFor(() => expect(restoreWork).toHaveBeenCalledWith(9));
    expect(screen.queryByText("已删海报")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "还原 旧图.png" }));
    await waitFor(() => expect(restoreAsset).toHaveBeenCalledWith(8));
    expect(screen.queryByText("旧图.png")).not.toBeInTheDocument();
  });

  it("permanently deletes a trashed work", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listTrashedWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "已删海报",
          status: "DRAFT",
          deletedAt: "2026-08-21T10:00:00",
          updatedAt: "2026-08-21T10:00:00",
        },
      ],
    });
    const user = userEvent.setup();
    renderMine();

    await user.click(screen.getByRole("button", { name: "回收站" }));
    expect(await screen.findByText("已删海报")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更多操作 已删海报" }));
    await user.click(await screen.findByText("彻底删除"));
    await user.click(await screen.findByRole("button", { name: "彻底删除" }));
    await waitFor(() => expect(purgeWork).toHaveBeenCalledWith(9));
    expect(screen.queryByText("已删海报")).not.toBeInTheDocument();
  });

  it("shows an empty recycle bin message", async () => {
    seedLogin();
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const user = userEvent.setup();
    renderMine();

    await user.click(screen.getByRole("button", { name: "回收站" }));
    expect(await screen.findByText("回收站是空的")).toBeInTheDocument();
    expect(screen.queryByText("拖放文件到这里，开始云端作图")).not.toBeInTheDocument();
  });

  it("lists favorites in 收藏夹 and unfavorites them", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listFavoriteWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 9,
          title: "收藏海报",
          status: "DRAFT",
          updatedAt: "2026-08-21T10:00:00",
        },
      ],
    });
    listFavoriteAssets.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        {
          id: 8,
          fileName: "收藏图.png",
          url: "http://cdn/fav.png",
        },
      ],
    });
    const user = userEvent.setup();
    renderMine();

    await user.click(screen.getByRole("button", { name: "收藏夹" }));
    expect(await screen.findByText("收藏海报")).toBeInTheDocument();
    expect(screen.getByText("收藏图.png")).toBeInTheDocument();
    expect(listFavoriteWorks).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 24 }));
    expect(listFavoriteAssets).toHaveBeenCalledWith(expect.objectContaining({ page: 1, size: 24 }));

    await user.click(screen.getByRole("button", { name: "取消收藏 收藏海报" }));
    await waitFor(() => expect(unfavoriteWork).toHaveBeenCalledWith(9));
    expect(screen.queryByText("收藏海报")).not.toBeInTheDocument();
  });

  it("shows an empty favorites message", async () => {
    seedLogin();
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    const user = userEvent.setup();
    renderMine();

    await user.click(screen.getByRole("button", { name: "收藏夹" }));
    expect(await screen.findByText("收藏夹是空的")).toBeInTheDocument();
    expect(screen.queryByText("拖放文件到这里，开始云端作图")).not.toBeInTheDocument();
  });

  it("favorites a work from the card menu", async () => {
    seedUser({ id: 1, role: 1 });
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
    const user = userEvent.setup();
    renderMine();

    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "更多操作 夏日海报作品" }));
    await user.click(await screen.findByText("收藏"));
    await waitFor(() => expect(favoriteWork).toHaveBeenCalledWith(9));
    expect(screen.queryByRole("region", { name: "作品详情" })).not.toBeInTheDocument();
    expect(getWork).not.toHaveBeenCalled();
  });

  it("普通用户看不到 添加/邀请成员/更多操作", async () => {
    seedUser({ id: 2, role: 2 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        { id: 9, title: "夏日海报作品", status: "DRAFT", updatedAt: "2026-08-19T10:00:00" },
      ],
    });
    renderMine();
    await screen.findByText("已全部加载完成");
    expect(screen.queryByRole("button", { name: "添加" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "邀请成员" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /更多操作/ })).not.toBeInTheDocument();
  });

  it("管理员能看到 添加/邀请成员/上传/导入", async () => {
    seedUser({ id: 1, role: 1 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    renderMine();
    await screen.findByText("拖放文件到这里，开始云端作图");
    expect(screen.getByRole("button", { name: "添加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "邀请成员" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上传文件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "从「一稿设计」导入" })).toBeInTheDocument();
  });

  it("普通用户只读：空态无上传/导入入口", async () => {
    seedUser({ id: 2, role: 2 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    renderMine();
    await screen.findByText("拖放文件到这里，开始云端作图");
    expect(screen.queryByRole("button", { name: "上传文件" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "从「一稿设计」导入" })).not.toBeInTheDocument();
  });

  it("普通用户只读：无上传图片磁贴", async () => {
    seedUser({ id: 2, role: 2 });
    listWorks.mockResolvedValue({ total: 0, page: 1, size: 24, records: [] });
    listAssets.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [{ id: 21, fileName: "海报.png", url: "http://cdn/a.png", createdAt: "2026-08-19T14:00:00" }],
    });
    const user = userEvent.setup();
    renderMine();
    expect(await screen.findByText("海报.png")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "我上传的" }));
    expect(screen.queryByRole("button", { name: "上传图片" })).not.toBeInTheDocument();
  });

  it("普通用户只读：详情无编辑/分享/删除", async () => {
    seedUser({ id: 2, role: 2 });
    listWorks.mockResolvedValue({
      total: 1,
      page: 1,
      size: 24,
      records: [
        { id: 9, title: "夏日海报作品", status: "DRAFT", updatedAt: "2026-08-19T10:00:00" },
      ],
    });
    renderMine();
    expect(await screen.findByText("夏日海报作品")).toBeInTheDocument();
    fireEvent.click(document.querySelector(".mine-card-hover"));
    expect(await screen.findByRole("button", { name: "返回" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "编辑" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "分享" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "删除" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "更多操作" })).not.toBeInTheDocument();
  });
});
