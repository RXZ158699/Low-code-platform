import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Sidebar from "./Sidebar.jsx";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";

vi.mock("../auth/openLoginTab.js", () => ({
  openLoginTab: vi.fn(),
  returnToOpenerOrHome: vi.fn(),
}));

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
}));

function renderSidebar(props = {}) {
  return render(
    <AntdApp>
      <AuthProvider>
        <CreatePopoverProvider>
          <Sidebar {...props} />
        </CreatePopoverProvider>
      </AuthProvider>
    </AntdApp>,
  );
}

describe("Sidebar", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("opens the login page when 我的 is clicked while logged out", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "我的" }));

    expect(openLoginTab).toHaveBeenCalledTimes(1);
  });

  it("does not open login when other nav items are clicked while logged out", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "发现" }));

    expect(openLoginTab).not.toHaveBeenCalled();
  });

  it("notifies parent when 发现 is clicked", async () => {
    const onNavigate = vi.fn();
    const user = userEvent.setup();
    renderSidebar({ active: "create", onNavigate });

    await user.click(screen.getByRole("button", { name: "发现" }));

    expect(onNavigate).toHaveBeenCalledWith("discover");
  });
});
