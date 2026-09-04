import {
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UserInfoModal from "./UserInfoModal.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { updateMe } from "../api/users.js";
import { fetchMe } from "../api/auth.js";
import { cancelMembership } from "../api/membership.js";

vi.mock("../api/users.js", () => ({
  updateMe: vi.fn(),
  uploadAvatar: vi.fn(),
}));

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
}));

vi.mock("../api/membership.js", () => ({
  cancelMembership: vi.fn(),
}));

function renderModal(props = {}) {
  localStorage.setItem("dp.token", "token");
  localStorage.setItem(
    "dp.user",
    JSON.stringify({
      id: 2,
      username: "demo",
      nickname: "演示用户",
      role: "USER",
      membershipType: "BASIC",
      membershipExpireAt: "2026-10-01T10:00:00",
      createdAt: "2026-09-01T10:00:00",
    }),
  );
  fetchMe.mockResolvedValue(null);
  return render(
    <AntdApp>
      <AuthProvider>
        <UserInfoModal open onClose={vi.fn()} {...props} />
      </AuthProvider>
    </AntdApp>,
  );
}

describe("UserInfoModal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows account and membership info", () => {
    renderModal();

    expect(screen.getByText("演示用户")).toBeInTheDocument();
    expect(screen.getByText(/普通用户 · 普通会员/)).toBeInTheDocument();
    expect(screen.getByText("2026-10-01 10:00")).toBeInTheDocument();
    expect(screen.getByText("会员中心")).toBeInTheDocument();
  });

  it("edits nickname and saves", async () => {
    updateMe.mockResolvedValue({
      id: 2,
      username: "demo",
      nickname: "新昵称",
      role: "USER",
    });
    renderModal();

    fireEvent.click(screen.getByRole("button", { name: "编辑资料" }));
    const input = screen.getByRole("textbox", { name: /昵称/ });
    fireEvent.change(input, { target: { value: "新昵称" } });
    fireEvent.click(screen.getByRole("button", { name: /保\s*存/ }));

    await waitFor(() => expect(updateMe).toHaveBeenCalledWith({ nickname: "新昵称" }));
    expect(await screen.findByText("新昵称")).toBeInTheDocument();
  });

  it("shows cancel membership popover and cancels membership", async () => {
    const user = userEvent.setup();
    cancelMembership.mockResolvedValue(null);
    renderModal();
    fetchMe.mockResolvedValue({
      id: 2,
      username: "demo",
      nickname: "演示用户",
      role: "USER",
      membershipType: "FREE",
    });

    await user.hover(screen.getByText("普通会员"));
    const cancelButton = await screen.findByRole("button", {
      name: "取消会员",
    });
    await user.click(cancelButton);

    await waitFor(() => expect(cancelMembership).toHaveBeenCalled());
    await waitFor(() =>
      expect(screen.getAllByText("非会员").length).toBeGreaterThan(0),
    );
  });
});
