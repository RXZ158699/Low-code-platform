import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import LoginPage from "./LoginPage.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";
import { login } from "../api/auth.js";

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  register: vi.fn(),
  fetchMe: vi.fn(),
  logout: vi.fn(),
}));

const navigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

function renderLogin() {
  return render(
    <MemoryRouter>
      <AntdApp>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    login.mockResolvedValue({ id: 2, username: "demo", nickname: "演示用户" });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders the wechat and phone login layout", () => {
    renderLogin();

    expect(screen.getByText("欢迎使用稿定")).toBeInTheDocument();
    expect(screen.getByText("微信扫码登录")).toBeInTheDocument();
    expect(screen.getByText("手机号登录")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入手机号码")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("输入验证码")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "登录/注册" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "手机密码登录" })).toBeInTheDocument();
  });

  it("shows a 4-digit code at the top after sending", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1234);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("输入手机号码"), "13800138000");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));

    expect(await screen.findByText("短信验证码")).toBeInTheDocument();
    expect(screen.getByText("2110")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "60s" })).toBeDisabled();
  });

  it("logs in as demo after the matching code is submitted", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1234);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("输入手机号码"), "13800138000");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));
    await screen.findByText("2110");
    await user.type(screen.getByPlaceholderText("输入验证码"), "2110");
    await user.click(screen.getByRole("button", { name: "登录/注册" }));

    await waitFor(() => expect(login).toHaveBeenCalledWith("demo", "demo123"));
    expect(navigate).toHaveBeenCalledWith("/", { replace: true });
  });

  it("does not login when the code is wrong", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.1234);
    const user = userEvent.setup();
    renderLogin();

    await user.type(screen.getByPlaceholderText("输入手机号码"), "13800138000");
    await user.click(screen.getByRole("button", { name: "获取验证码" }));
    await screen.findByText("2110");
    await user.type(screen.getByPlaceholderText("输入验证码"), "0000");
    await user.click(screen.getByRole("button", { name: "登录/注册" }));

    expect(await screen.findByText("验证码错误")).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
