import { render, screen, waitFor } from "@testing-library/react";
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
