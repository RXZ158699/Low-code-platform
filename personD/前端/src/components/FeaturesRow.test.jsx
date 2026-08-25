import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import FeaturesRow from "./FeaturesRow.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(() => Promise.resolve(null)),
}));

function seedUser(user) {
  localStorage.setItem("dp.token", "token");
  localStorage.setItem("dp.user", JSON.stringify(user));
}

function renderWithProvider(ui) {
  return render(
    <MemoryRouter>
      <AntdApp>
        <AuthProvider>
          <CreatePopoverProvider>{ui}</CreatePopoverProvider>
        </AuthProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("FeaturesRow", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("renders all feature entries", () => {
    seedUser({ id: 1, role: 1 });
    renderWithProvider(<FeaturesRow />);

    expect(screen.getByText("AI 画布")).toBeInTheDocument();
    expect(screen.getByText("AI 电商")).toBeInTheDocument();
    expect(screen.getByText("视频创作")).toBeInTheDocument();
    expect(screen.getByText("图片创作")).toBeInTheDocument();
    expect(screen.getByText("SKILL HUB")).toBeInTheDocument();
    expect(screen.getByText("更多")).toBeInTheDocument();
  });

  it("toggles the shared create popover when clicking 更多", async () => {
    seedUser({ id: 1, role: 1 });
    const user = userEvent.setup();
    renderWithProvider(<FeaturesRow />);

    const moreButton = screen.getByRole("button", { name: /更多/ });
    expect(moreButton).toHaveAttribute("aria-expanded", "false");

    await user.click(moreButton);
    expect(moreButton).toHaveAttribute("aria-expanded", "true");

    await user.click(moreButton);
    expect(moreButton).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the create canvas modal from 图片创作", async () => {
    seedUser({ id: 1, role: 1 });
    const user = userEvent.setup();
    renderWithProvider(<FeaturesRow />);

    await user.click(screen.getByRole("button", { name: "图片创作" }));

    expect(screen.getByRole("dialog", { name: "创建设计" })).toBeInTheDocument();
  });

  it("普通用户隐藏 更多/图片创作", () => {
    localStorage.setItem("dp.token", "token");
    localStorage.setItem("dp.user", JSON.stringify({ id: 2, role: 2 }));
    renderWithProvider(<FeaturesRow />);
    expect(screen.queryByText("更多")).not.toBeInTheDocument();
    expect(screen.queryByText("图片创作")).not.toBeInTheDocument();
  });

  it("管理员显示 更多/图片创作", () => {
    localStorage.setItem("dp.token", "token");
    localStorage.setItem("dp.user", JSON.stringify({ id: 1, role: 1 }));
    renderWithProvider(<FeaturesRow />);
    expect(screen.getByText("更多")).toBeInTheDocument();
    expect(screen.getByText("图片创作")).toBeInTheDocument();
  });
});
