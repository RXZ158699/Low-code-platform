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
    expect(roleOf({ id: 1, role: "ADMIN" })).toBe(ROLE_ADMIN);
    expect(roleOf({ id: 2, role: "USER" })).toBe(ROLE_USER);
    expect(roleOf({ id: 1, role: "1" })).toBe(ROLE_ADMIN);
    expect(roleOf({ id: 2, role: "2" })).toBe(ROLE_USER);
  });

  it("已登录但角色异常时按普通用户处理", () => {
    const unknown = { id: 3, role: "SUPER" };
    expect(roleOf(unknown)).toBe(ROLE_USER);
    expect(isAdmin(unknown)).toBe(false);
    expect(canAccess("home", unknown)).toBe(true);
    expect(canAccess("mine", unknown)).toBe(true);
    expect(canAccess("discover", unknown)).toBe(false);
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
