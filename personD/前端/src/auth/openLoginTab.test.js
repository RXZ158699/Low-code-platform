import { afterEach, describe, expect, it, vi } from "vitest";
import { returnToOpenerOrHome } from "./openLoginTab.js";

describe("returnToOpenerOrHome", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: null,
    });
  });

  it("focuses the original window and closes the login tab", () => {
    const opener = { closed: false, focus: vi.fn() };
    Object.defineProperty(window, "opener", {
      configurable: true,
      writable: true,
      value: opener,
    });
    const close = vi.spyOn(window, "close").mockImplementation(() => {});
    const goHome = vi.fn();

    returnToOpenerOrHome(goHome);

    expect(opener.focus).toHaveBeenCalled();
    expect(close).toHaveBeenCalled();
    expect(goHome).not.toHaveBeenCalled();
  });

  it("goes home when the login page was not opened from another tab", () => {
    const goHome = vi.fn();
    returnToOpenerOrHome(goHome);
    expect(goHome).toHaveBeenCalled();
  });
});
