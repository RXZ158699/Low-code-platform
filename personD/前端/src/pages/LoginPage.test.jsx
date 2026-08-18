import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { describe, expect, it } from "vitest";
import LoginPage from "./LoginPage.jsx";
import { AuthProvider } from "../auth/AuthContext.jsx";

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
});
