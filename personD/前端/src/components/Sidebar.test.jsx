import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar.jsx";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";

vi.mock("../auth/openLoginTab.js", () => ({
  openLoginTab: vi.fn(),
  returnToOpenerOrHome: vi.fn(),
}));

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("../api/users.js", () => ({
  updateMe: vi.fn(),
  uploadAvatar: vi.fn(),
}));

vi.mock("../api/works.js", () => ({
  createWork: vi.fn(),
}));

function seedUser(user) {
  if (user) {
    localStorage.setItem("dp.token", "token");
    localStorage.setItem("dp.user", JSON.stringify(user));
  } else {
    localStorage.clear();
  }
}

function renderSidebar(props = {}) {
  return render(
    <MemoryRouter>
      <AntdApp>
        <AuthProvider>
          <CreatePopoverProvider>
            <Sidebar {...props} />
          </CreatePopoverProvider>
        </AuthProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("未登录仅显示 创作 和 登录按钮", () => {
    renderSidebar();
    expect(screen.getByRole("button", { name: "创作" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "发现" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "我的" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "创建" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录" })).toBeInTheDocument();
  });

  it("普通用户显示 创作/发现/我的/创建", () => {
    seedUser({ id: 2, role: 2 });
    renderSidebar();
    for (const name of ["创作", "发现", "我的", "创建"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("管理员显示全部导航", () => {
    seedUser({ id: 1, role: 1 });
    renderSidebar();
    for (const name of ["创作", "发现", "我的", "创建"]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("管理员点击 发现 通知父组件", async () => {
    seedUser({ id: 1, role: 1 });
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ active: "create", onNavigate });

    await user.click(screen.getByRole("button", { name: "发现" }));

    expect(onNavigate).toHaveBeenCalledWith("discover");
  });

  it("登录用户点击 我的 通知父组件", async () => {
    seedUser({ id: 2, role: 2 });
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ active: "create", onNavigate });

    await user.click(screen.getByRole("button", { name: "我的" }));

    expect(onNavigate).toHaveBeenCalledWith("mine");
  });

  it("点击用户信息按钮打开个人信息弹框", async () => {
    seedUser({
      id: 2,
      role: 2,
      username: "demo",
      nickname: "演示用户",
      membershipType: "FREE",
      createdAt: "2026-09-01T10:00:00",
    });
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "用户信息" }));

    expect(
      await screen.findByRole("dialog", { name: "个人信息" }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("演示用户").length).toBeGreaterThan(0);
    expect(screen.getByText(/普通用户 · 非会员/)).toBeInTheDocument();
    expect(screen.getByText("会员中心")).toBeInTheDocument();
    expect(screen.getByText("退出登录")).toBeInTheDocument();
  });
});
