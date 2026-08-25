# 前端账号角色权限设计

日期：2026-08-25
状态：已评审（用户确认）

## 背景

当前前端所有页面（首页 / 发现 / 个人空间 / 编辑器 / 分享页）都无访问控制，任何访客或登录用户都能访问任意路由。需要引入三档角色权限：

- **管理员**：可以浏览所有页面、进行所有操作
- **普通用户**：只能浏览首页和个人空间（个人空间严格只读，不能创建/编辑/删除/收藏）
- **访客（未登录）**：只能浏览首页

后端 `/auth/me`（及登录响应）返回的 `user` 对象已包含 `role` 字段，取值为数字：**`1` = 管理员，`2` = 普通用户**。前端只需读取并缓存该字段，不做本地判定。

## 角色模型

| 角色 | 判定 | 说明 |
|---|---|---|
| 管理员 | `user?.role === 1` | 全部页面 + 全部操作 |
| 普通用户 | `user?.role === 2` | 首页 + 个人空间（只读） |
| 访客 | `!user`（未登录） | 仅首页；可访问登录页 |

## 访问矩阵

| 页面 | 访客 | 普通用户 | 管理员 |
|---|---|---|---|
| `/` 首页（创作 create） | ✅ | ✅ | ✅ |
| `/login` 登录页 | ✅ | 已登录自动跳首页 | 已登录自动跳首页 |
| `/` 发现（discover） | ❌ | ❌ | ✅ |
| `/` 个人空间（mine） | ❌ | ✅ 严格只读 | ✅ |
| `/works/:id` 编辑器 | ❌ | ❌ | ✅ |
| `/share/:token` 分享页 | ❌ | ✅ | ✅ |

补充：
- 首页「更多」按钮、侧边栏「创建」按钮（都会弹出 CreatePopover 创建框）仅管理员可见。
- 访客在侧边栏只看到「创作」+ 登录按钮；点击被隐藏页面的入口不再出现。
- 普通用户在侧边栏看到「创作」「我的」；看不到「发现」「创建」。

## 架构

### 1. 单一事实来源：`src/auth/access.js`（新增）

```js
export const ROLE_ADMIN = 1;
export const ROLE_USER = 2;

export const roleOf = (user) => (user ? user.role : null);
export const isAdmin = (user) => roleOf(user) === ROLE_ADMIN;
export const isLoggedIn = (user) => !!user;

// 各页面允许的角色；null 代表访客
export const PAGE_ACCESS = {
  home:     [null, ROLE_USER, ROLE_ADMIN],
  discover: [ROLE_ADMIN],
  mine:     [ROLE_USER, ROLE_ADMIN],
  editor:   [ROLE_ADMIN],
  share:    [ROLE_USER, ROLE_ADMIN],
  login:    [null],
};

export const canAccess = (page, user) => PAGE_ACCESS[page].includes(roleOf(user));
```

### 2. AuthContext 扩展

- `value` 增加派生字段：`isAdmin`、`isLoggedIn`（基于 `user` 计算）。
- `sameUser` 比较加入 `role`，使角色变化能触发状态同步。

### 3. 路由守卫（`src/AppRoutes.jsx`）

- 新增守卫组件（放在 access.js 或 AppRoutes 内）：
  - `<RequireAccess page="editor" />`：`canAccess("editor", user)` 为假 → `<Navigate to="/" replace />`。
  - `<RequireAccess page="share" />`：访客 → `<Navigate to="/login" replace />`（需登录才能看分享页）。
  - `<RedirectIfLoggedIn />` 包裹 `/login`：`isLoggedIn(user)` 为真 → `<Navigate to="/" replace />`。
- 守卫需要 `user`，因此 AppRoutes 消费 `useAuth()`；`ready` 未就绪时先显示现有 `RouteFallback`（Suspense）或 Spin，避免角色未加载时的闪烁跳转。

### 4. Sidebar 导航过滤（`src/components/Sidebar.jsx`）

- 基于 `isAdmin` / `isLoggedIn` 过滤 `NAV_ITEMS`：
  - 访客：仅 `create`（创作）
  - 普通用户：`create`、`mine`
  - 管理员：全部（`create`、`discover`、`mine`、`new`）
- 「创建」（`new`）入口仅管理员显示，随之 CreatePopover 也只在管理员可见时渲染。

### 5. App.jsx 内部翻页守卫（纵深防御）

- `setPage` 包一层守卫：若 `!canAccess(targetPage, user)`，则不切换（保持当前页）。避免通过任何非侧边栏途径进入无权限内部页。
- 初始 `page` 状态不受影响（默认 create，人人可访问）。

### 6. MinePage 严格只读（普通用户）

- 组件内取 `const readOnly = !isAdmin(user)`。
- `readOnly` 时隐藏/禁用所有变更入口：
  - 创建作品、创建团队、创建分享
  - 编辑入口（本身被编辑器路由守卫兜底）
  - 删除 / 彻底删除 / 批量删除
  - 收藏 / 取消收藏
- 保留纯查看能力：作品列表、详情查看、各 Tab 切换（我的空间/最近/收藏夹/草稿箱/已归档/回收站/分享管理/发布）均只读展示。

### 7. 首页「更多」按钮（`src/components/DesignHomepage.jsx` / FeaturesRow）

- 触发 CreatePopover 的「更多」入口仅管理员显示；普通用户/访客隐藏。

### 8. 登录页（`src/pages/LoginPage.jsx`）

- 已登录用户访问 `/login` 由路由守卫跳回首页；登录页本身无需改动逻辑，仅依赖守卫。

## 数据流

```
user（login / fetchMe 响应，含 role）
  → AuthContext（缓存 + 派生 isAdmin/isLoggedIn）
  → access.canAccess(page, user)
  → Sidebar 过滤 / App 翻页守卫 / AppRoutes 路由守卫 / MinePage 只读 / 首页更多按钮
```

角色字段随 `saveUser` 一并写入 localStorage（`tokenStore`），刷新后 `fetchMe` 重新拉取并覆盖。

## 错误处理与边界

- 无权限访问路由：重定向（编辑器→首页，分享页→登录页），不做 403 页，保持简单。
- `ready` 未就绪：渲染加载态（沿用 RouteFallback / Spin），不提前重定向，避免登录态未恢复时误判为访客。
- 后端角色值异常（既非 1 也非 2，或缺失）：`roleOf` 按「非管理员」处理，即最严格解释（普通用户级）；不崩溃。
- 分享页需登录：访客点分享链接会被带到登录页，登录后如何回跳分享页——本期不做回跳（保持简单，后续可加）。

## 测试

- `src/auth/access.test.js`（新增）：`roleOf` / `isAdmin` / `isLoggedIn` / `canAccess` 全矩阵。
- `src/AppRoutes.test.jsx`：管理员可进编辑器、普通用户进编辑器被跳首页、访客进分享页被跳登录、已登录访问 /login 被跳首页。
- `src/components/Sidebar.test.jsx`：三种登录态下导航项过滤。
- 回归：跑全量 `npm test`（现有 244 用例须保持通过）+ `npm run build`。

## 涉及文件

| 文件 | 改动 |
|---|---|
| `src/auth/access.js` | 新增：角色常量、canAccess、守卫工具 |
| `src/auth/access.test.js` | 新增：规则矩阵测试 |
| `src/auth/AuthContext.jsx` | 增加 isAdmin/isLoggedIn，sameUser 加 role |
| `src/AppRoutes.jsx` | 路由守卫 + 登录重定向 |
| `src/components/Sidebar.jsx` | NAV_ITEMS 按角色过滤 |
| `src/App.jsx` | setPage 翻页守卫 |
| `src/components/MinePage.jsx` | 普通用户只读 |
| `src/components/DesignHomepage.jsx` | 「更多」入口仅管理员 |
| 相关测试 | AppRoutes / Sidebar 等测试补充 |
