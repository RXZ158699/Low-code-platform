import { fireEvent, render, screen } from "@testing-library/react";
import { App as AntdApp } from "antd";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import MemberModal from "./MemberModal.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import {
  createMembershipOrder,
  getMembershipOrder,
  getMembershipPlans,
} from "../api/membership.js";
import { fetchMe } from "../api/auth.js";

vi.mock("../api/membership.js", () => ({
  getMembershipPlans: vi.fn(),
  createMembershipOrder: vi.fn(),
  getMembershipOrder: vi.fn(),
}));

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
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
      membershipType: "FREE",
    }),
  );
  fetchMe.mockResolvedValue({
    id: 2,
    username: "demo",
    nickname: "演示用户",
    role: "USER",
    membershipType: "FREE",
  });
  return render(
    <AntdApp>
      <AuthProvider>
        <MemberModal open onClose={vi.fn()} reason="今日导出次数已用完" {...props} />
      </AuthProvider>
    </AntdApp>,
  );
}

describe("MemberModal", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    getMembershipPlans.mockResolvedValue([
      { code: "BASIC", name: "普通会员", amountCents: 990, benefits: "每日 10 次导出" },
      { code: "PREMIUM", name: "高级会员", amountCents: 2990, benefits: "不限次导出" },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows current membership and plan prices", async () => {
    renderModal();

    expect(await screen.findByText(/普通会员 · ¥9\.90/)).toBeInTheDocument();
    expect(screen.getByText(/高级会员 · ¥29\.90/)).toBeInTheDocument();
    expect(screen.getByText("今日导出次数已用完")).toBeInTheDocument();
    expect(screen.getByText("非会员")).toBeInTheDocument();
  });

  it("creates an order and closes after payment is confirmed", async () => {
    const onClose = vi.fn();
    createMembershipOrder.mockResolvedValue({
      orderNo: "M1",
      payForm: "<form action='https://pay'>",
    });
    getMembershipOrder.mockResolvedValue({ status: "PAID" });
    const openSpy = vi
      .spyOn(window, "open")
      .mockReturnValue({
        document: { write: vi.fn(), close: vi.fn() },
      });

    renderModal({ onClose });
    await screen.findByText(/高级会员 · ¥29\.90/);

    vi.useFakeTimers();
    fireEvent.click(screen.getByRole("button", { name: "立即支付" }));
    await vi.advanceTimersByTimeAsync(0);
    await vi.advanceTimersByTimeAsync(2100);
    await vi.advanceTimersByTimeAsync(1000);

    expect(createMembershipOrder).toHaveBeenCalledWith("PREMIUM");
    expect(onClose).toHaveBeenCalled();
    openSpy.mockRestore();
  });
});
