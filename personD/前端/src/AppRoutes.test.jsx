import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AppRoutes from "./AppRoutes.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";

vi.mock("./App.jsx", () => ({ default: () => <div>home-page</div> }));
vi.mock("./pages/LoginPage.jsx", () => ({ default: () => <div>login-page</div> }));
vi.mock("./pages/WorkEditorPage.jsx", () => ({ default: () => <div>editor-page</div> }));
vi.mock("./pages/ShareViewPage.jsx", () => ({ default: () => <div>share-page</div> }));

vi.mock("./api/auth.js", () => ({
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

function renderAt(path, user) {
  seedUser(user);
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("AppRoutes", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("访客可打开首页", async () => {
    renderAt("/");
    expect(await screen.findByText("home-page")).toBeInTheDocument();
  });

  it("访客可打开登录页", async () => {
    renderAt("/login");
    expect(await screen.findByText("login-page")).toBeInTheDocument();
  });

  it("已登录用户访问 /login 跳首页", async () => {
    renderAt("/login", { id: 1, role: 1 });
    expect(await screen.findByText("home-page")).toBeInTheDocument();
  });

  it("管理员可打开编辑器", async () => {
    renderAt("/works/9", { id: 1, role: 1 });
    expect(await screen.findByText("editor-page")).toBeInTheDocument();
  });

  it("普通用户访问编辑器跳首页", async () => {
    renderAt("/works/9", { id: 2, role: 2 });
    expect(await screen.findByText("home-page")).toBeInTheDocument();
  });

  it("访客访问编辑器跳首页", async () => {
    renderAt("/works/9");
    expect(await screen.findByText("home-page")).toBeInTheDocument();
  });

  it("登录用户可打开分享页", async () => {
    renderAt("/share/abc", { id: 2, role: 2 });
    expect(await screen.findByText("share-page")).toBeInTheDocument();
  });

  it("访客访问分享页跳登录页", async () => {
    renderAt("/share/abc");
    expect(await screen.findByText("login-page")).toBeInTheDocument();
  });
});
