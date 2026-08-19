import { afterEach, describe, expect, it, vi } from "vitest";
import { AUTH_SYNC_TYPE, notifyAuthSync, subscribeAuthSync } from "./authSync.js";

describe("authSync", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: null,
    });
  });

  it("posts the user to the opener window", () => {
    const opener = { closed: false, postMessage: vi.fn(), dispatchEvent: vi.fn() };
    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: opener,
    });
    const user = { id: 2, username: "demo", nickname: "演示用户" };

    notifyAuthSync(user);

    expect(opener.postMessage).toHaveBeenCalledWith(
      { type: AUTH_SYNC_TYPE, user },
      window.location.origin,
    );
    expect(opener.dispatchEvent).toHaveBeenCalled();
  });

  it("invokes the subscriber for same-origin auth messages", () => {
    const onChange = vi.fn();
    const unsubscribe = subscribeAuthSync(onChange);

    window.dispatchEvent(
      new MessageEvent("message", {
        data: { type: AUTH_SYNC_TYPE, user: { username: "demo" } },
      }),
    );

    expect(onChange).toHaveBeenCalledWith({ username: "demo" });
    unsubscribe();
  });
});
