import { describe, expect, it } from "vitest";
import {
  ROLE_ADMIN,
  ROLE_USER,
  roleOf,
  isAdmin,
  isLoggedIn,
  canAccess,
} from "./access.js";

describe("access", () => {
  const admin = { id: 1, role: ROLE_ADMIN };
  const user = { id: 2, role: ROLE_USER };
  const guest = null;

  it("roleOf 返回角色或 null", () => {
    expect(roleOf(admin)).toBe(ROLE_ADMIN);
    expect(roleOf(user)).toBe(ROLE_USER);
    expect(roleOf(guest)).toBeNull();
    expect(roleOf({ id: 3 })).toBeNull();
  });

  it("isAdmin / isLoggedIn", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(user)).toBe(false);
    expect(isAdmin(guest)).toBe(false);
    expect(isLoggedIn(user)).toBe(true);
    expect(isLoggedIn(guest)).toBe(false);
  });

  it("home 所有人可访问", () => {
    expect(canAccess("home", guest)).toBe(true);
    expect(canAccess("home", user)).toBe(true);
    expect(canAccess("home", admin)).toBe(true);
  });

  it("discover 仅管理员", () => {
    expect(canAccess("discover", guest)).toBe(false);
    expect(canAccess("discover", user)).toBe(false);
    expect(canAccess("discover", admin)).toBe(true);
  });

  it("mine 仅登录用户", () => {
    expect(canAccess("mine", guest)).toBe(false);
    expect(canAccess("mine", user)).toBe(true);
    expect(canAccess("mine", admin)).toBe(true);
  });

  it("editor 仅管理员", () => {
    expect(canAccess("editor", guest)).toBe(false);
    expect(canAccess("editor", user)).toBe(false);
    expect(canAccess("editor", admin)).toBe(true);
  });

  it("share 需登录", () => {
    expect(canAccess("share", guest)).toBe(false);
    expect(canAccess("share", user)).toBe(true);
    expect(canAccess("share", admin)).toBe(true);
  });

  it("login 仅访客", () => {
    expect(canAccess("login", guest)).toBe(true);
    expect(canAccess("login", user)).toBe(false);
    expect(canAccess("login", admin)).toBe(false);
  });
});
