import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth } from "./AuthContext.jsx";
import { AUTH_SYNC_TYPE } from "./authSync.js";
import { fetchMe } from "../api/auth.js";

vi.mock("../api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(),
}));

function Probe() {
  const { user } = useAuth();
  return <div>{user ? user.nickname || user.username : "guest"}</div>;
}

describe("AuthProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    fetchMe.mockResolvedValue(null);
  });

  it("updates the homepage user after a login sync message", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByText("guest")).toBeInTheDocument();

    localStorage.setItem("dp.token", "token");
    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: AUTH_SYNC_TYPE, user: { id: 2, username: "demo", nickname: "演示用户" } },
      }),
    );

    await waitFor(() => expect(screen.getByText("演示用户")).toBeInTheDocument());
  });

  it("shows the cached user without waiting for /auth/me", () => {
    localStorage.setItem("dp.token", "token");
    localStorage.setItem(
      "dp.user",
      JSON.stringify({ id: 2, username: "demo", nickname: "演示用户" }),
    );

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    expect(screen.getByText("演示用户")).toBeInTheDocument();
  });

  it("does not treat a user sync without token as logged in", async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: AUTH_SYNC_TYPE, user: { id: 2, username: "demo", nickname: "演示用户" } },
      }),
    );

    await waitFor(() => expect(screen.getByText("guest")).toBeInTheDocument());
  });
});

function RoleProbe() {
  const { isAdmin, isLoggedIn } = useAuth();
  return <div>{isAdmin ? "admin" : "not-admin"}|{isLoggedIn ? "in" : "out"}</div>;
}

function RefreshProbe() {
  const { user, refreshMe } = useAuth();
  return (
    <button type="button" onClick={refreshMe}>
      {user?.nickname || user?.username || "guest"}
    </button>
  );
}

function renderRole(role) {
  if (role !== undefined) {
    localStorage.setItem("dp.token", "token");
    localStorage.setItem("dp.user", JSON.stringify({ id: 1, username: "u", role }));
  } else {
    localStorage.clear();
  }
  return render(
    <AuthProvider>
      <RoleProbe />
    </AuthProvider>,
  );
}

it("导出 isAdmin / isLoggedIn（role=1）", async () => {
  renderRole(1);
  expect(await screen.findByText("admin|in")).toBeInTheDocument();
});

it("导出 isAdmin / isLoggedIn（role=2）", async () => {
  renderRole(2);
  expect(await screen.findByText("not-admin|in")).toBeInTheDocument();
});

it("导出 isAdmin / isLoggedIn（未登录）", async () => {
  renderRole(undefined);
  expect(await screen.findByText("not-admin|out")).toBeInTheDocument();
});

it("refreshMe 从 /auth/me 刷新当前用户", async () => {
  localStorage.setItem("dp.token", "token");
  localStorage.setItem(
    "dp.user",
    JSON.stringify({ id: 1, username: "old", nickname: "旧昵称" }),
  );
  fetchMe.mockResolvedValue({
    id: 1,
    username: "old",
    nickname: "会员用户",
  });

  render(
    <AuthProvider>
      <RefreshProbe />
    </AuthProvider>,
  );

  fireEvent.click(screen.getByRole("button", { name: "旧昵称" }));

  await waitFor(() =>
    expect(screen.getByRole("button", { name: "会员用户" })).toBeInTheDocument(),
  );
});
