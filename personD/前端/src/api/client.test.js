import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "./client.js";
import { getToken, saveTokens } from "./tokenStore.js";

function jsonResponse(payload) {
  return Promise.resolve({
    json: () => Promise.resolve(payload),
  });
}

describe("api client", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("unwraps Result data when code is 0", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({ code: 0, message: "ok", data: { id: 1 } })));

    const data = await apiFetch("/templates", { auth: false });
    expect(data).toEqual({ id: 1 });
  });

  it("throws ApiError with backend message when code is not 0", async () => {
    vi.stubGlobal("fetch", vi.fn(() => jsonResponse({ code: 404, message: "资源不存在" })));

    await expect(apiFetch("/templates/9", { auth: false })).rejects.toMatchObject({
      name: "ApiError",
      code: 404,
      message: "资源不存在",
    });
  });

  it("attaches Bearer token when logged in", async () => {
    saveTokens({ token: "t1", refreshToken: "r1" });
    const fetchMock = vi.fn(() => jsonResponse({ code: 0, data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/auth/me");
    const [, options] = fetchMock.mock.calls[0];
    expect(options.headers.Authorization).toBe("Bearer t1");
  });

  it("refreshes token on 401 and retries the original request", async () => {
    saveTokens({ token: "expired", refreshToken: "r1" });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 401, message: "未认证" }))
      .mockImplementationOnce(() =>
        jsonResponse({ code: 0, data: { token: "t2", refreshToken: "r2" } }),
      )
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiFetch("/auth/me");

    expect(data).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/refresh");
    expect(getToken()).toBe("t2");
    const [, retryOptions] = fetchMock.mock.calls[2];
    expect(retryOptions.headers.Authorization).toBe("Bearer t2");
  });

  it("refreshes token on 40100 and retries the original request", async () => {
    saveTokens({ token: "expired", refreshToken: "r1" });
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 40100, message: "未登录或 token 无效" }))
      .mockImplementationOnce(() =>
        jsonResponse({ code: 0, data: { token: "t2", refreshToken: "r2" } }),
      )
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: "ok" }));
    vi.stubGlobal("fetch", fetchMock);

    const data = await apiFetch("/auth/me");

    expect(data).toBe("ok");
    expect(getToken()).toBe("t2");
  });

  it("clears tokens and rethrows when refresh fails", async () => {
    saveTokens({ token: "expired", refreshToken: "r1" });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockImplementationOnce(() => jsonResponse({ code: 401, message: "未认证" }))
        .mockImplementationOnce(() => jsonResponse({ code: 401, message: "刷新令牌无效" })),
    );

    await expect(apiFetch("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBeNull();
  });
});
