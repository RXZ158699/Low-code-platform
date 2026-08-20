import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar.jsx";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";
import { createWork } from "../api/works.js";

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

function renderSidebar() {
  return render(
    <MemoryRouter>
      <AntdApp>
        <AuthProvider>
          <CreatePopoverProvider>
            <Sidebar />
          </CreatePopoverProvider>
        </AuthProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("CreatePopover", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("asks logged-out users to sign in when clicking 新增画布", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "新增画布" }));

    expect(openLoginTab).toHaveBeenCalledTimes(1);
    expect(createWork).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog", { name: "创建设计" })).not.toBeInTheDocument();
  });

  it("opens the canvas size modal instead of creating immediately", async () => {
    localStorage.setItem("dp.token", "token");
    localStorage.setItem(
      "dp.user",
      JSON.stringify({ id: 2, username: "demo", nickname: "演示用户" }),
    );
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "新增画布" }));

    expect(createWork).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog", { name: "创建设计" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("搜索全部尺寸")).toBeInTheDocument();
  });
});
