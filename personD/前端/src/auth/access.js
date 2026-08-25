export const ROLE_ADMIN = 1;
export const ROLE_USER = 2;

export function roleOf(user) {
  // 缺失角色（undefined/null）统一归一为 null，保证与测试断言一致
  return user?.role ?? null;
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
