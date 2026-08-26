export const ROLE_ADMIN = 1;
export const ROLE_USER = 2;

export function roleOf(user) {
  if (!user) return null;
  const role = user.role;
  if (role === ROLE_ADMIN || role === "1" || role === "ADMIN" || role === "ROLE_ADMIN") {
    return ROLE_ADMIN;
  }
  if (role === ROLE_USER || role === "2" || role === "USER" || role === "ROLE_USER") {
    return ROLE_USER;
  }
  // 已登录但角色缺失/异常时按普通用户处理，避免侧边栏整体消失
  return ROLE_USER;
}

export function isAdmin(user) {
  return roleOf(user) === ROLE_ADMIN;
}

export function isLoggedIn(user) {
  return !!user;
}

export const PAGE_ACCESS = {
  home: [null, ROLE_USER, ROLE_ADMIN],
  discover: [ROLE_ADMIN],
  mine: [ROLE_USER, ROLE_ADMIN],
  editor: [ROLE_ADMIN],
  share: [ROLE_USER, ROLE_ADMIN],
  login: [null],
};

export function canAccess(page, user) {
  return (PAGE_ACCESS[page] || []).includes(roleOf(user));
}
