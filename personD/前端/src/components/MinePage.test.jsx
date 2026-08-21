import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import MinePage from "./MinePage.jsx";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import { AppPageProvider } from "../AppPageContext.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { listWorks, createWork, getWork } from "../api/works.js";
import { listAssets, uploadAsset, getAsset, updateAsset } from "../api/assets.js";
import { fetchMe } from "../api/auth.js";
import { openLoginTab } from "../auth/openLoginTab.js";
import { listTeams, listMembers, removeMember, getTeam, listTeamWorks, listTeamAssets, updateTeam } from "../api/teams.js";
import { listWorkShares, deleteShare } from "../api/shares.js";

vi.mock("../api/works.js", () => ({
  listWorks: vi.fn(),
  createWork: vi.fn(),
  deleteWork: vi.fn(),
  getWork: vi.fn(),
}));

vi.mock("../api/assets.js", () => ({
  listAssets: vi.fn(),
  uploadAsset: vi.fn(),
  deleteAsset: vi.fn(),
  getAsset: vi.fn(),
  updateAsset: vi.fn(),
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

  it("lists existing share links and revokes one", async () => {
    seedLogin();
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
    seedLogin();
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

  it("loads team works after viewing a team", async () => {
    seedLogin();
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
    seedLogin();
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
    seedLogin();
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
    seedLogin();
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
    seedLogin();
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
    seedLogin();
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
});
