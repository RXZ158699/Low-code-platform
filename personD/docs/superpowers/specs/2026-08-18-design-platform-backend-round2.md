# 稿定风格在线设计平台 — 后端第二轮增强

日期：2026-08-18
范围：`personD/后端` 在 [第一轮规格](2026-08-17-design-platform-backend-design.md) 基础上的增量
状态：已实现

## 1. 范围

对照第二轮需求清单逐项核对，第一轮已覆盖：模板分页查询（分类/标签/关键词）、模板详情、基于模板创建作品（复制 canvasJson）、素材上传 MinIO 与素材库查询、团队创建/邀请/团队空间作品与素材列表、分享链接生成与过期校验。

本轮补齐的缺口：

| 模块 | 增量 |
|---|---|
| 认证 | 刷新 Token（双 token + 旋转刷新） |
| 用户 | 上传头像（multipart → MinIO） |
| 作品 | 自动保存草稿端点；状态流转状态机（DRAFT/PUBLISHED/ARCHIVED） |
| 素材 | 分类聚合查询 |
| 团队 | 成员角色变更；邀请时指定角色 |
| 分享 | 访问提取码校验；作品分享列表 |

## 2. 认证：刷新 Token

- JWT 增加 `type` claim：`access` / `refresh`；旧 token 无该 claim 时按 access 处理（向后兼容）。
- `POST /api/auth/login` 响应扩展为 `{token, expiresIn, refreshToken, refreshExpiresIn, user}`。
- `POST /api/auth/refresh`（匿名白名单）body `{refreshToken}`：
  1. 解析失败 / 非 refresh 类型 / jti 已在黑名单 → 401；
  2. 用户已被删除 → 401；
  3. 通过后旧 refresh jti 写黑名单（TTL = 剩余寿命），旋转签发新 access + refresh 对。
- `JwtAuthFilter` 遇到 refresh 类型 token 不写入 SecurityContext（不能当访问令牌用）。
- 配置：`app.jwt.refresh-expire-days`（默认 30）。

## 3. 用户：上传头像

- `POST /api/users/me/avatar`（登录，multipart `file`）。
- 仅图片（jpg/jpeg/png/webp/gif，按扩展名或 content-type），否则 41500。
- 上传至 `assets` bucket，URL 回写 `user.avatar`，返回 UserVO。
- 图片校验抽到 `common/file/ImageRules`，作品缩略图逻辑同步复用。

## 4. 作品：草稿自动保存与状态流转

状态机 `WorkStatusFlow`：

```
DRAFT     → PUBLISHED | ARCHIVED
PUBLISHED → DRAFT     | ARCHIVED
ARCHIVED  → DRAFT
```

其余（含同态、ARCHIVED→PUBLISHED、未知状态）→ 400「非法状态流转」。

- `PUT /api/works/{id}/draft`：自动保存草稿，body `{canvasJson?, title?}`，仅所有者；只改画布/标题，不动状态；返回最新 WorkVO（前端以 `updatedAt` 做保存回显）。
- `POST /api/works/{id}/status`：body `{target}` 显式流转，仅所有者。
- `PUT /api/works/{id}` 中的 `status` 字段改为走状态机校验（原来任意写）。
- `POST /api/works/{id}/publish` 保持可用，对已发布作品幂等。
- 列表 `status` 筛选支持 ARCHIVED。

## 5. 素材：分类聚合

- `GET /api/assets/categories?scope=mine|public|team&teamId=`（登录），按可见范围聚合 `category`：
  返回 `[{name, count}]`，按 count 降序；scope=team 时必须带 teamId 且校验成员。
- 素材上传/更新的 `category` 字段保持自由文本（≤32 字），与第一轮一致。

## 6. 团队：成员权限管理

- `PUT /api/teams/{id}/members/{userId}` body `{role}`：
  - 仅 OWNER 可变更角色（`TeamAccess.canChangeRole`）；
  - 目标不能是 OWNER（本期无转让接口）；
  - 新角色仅允许 `ADMIN` / `MEMBER`，否则 400。
- `POST /api/teams/{id}/members` 请求体新增可选 `role`（默认 MEMBER，仅允许 ADMIN/MEMBER）。

## 7. 分享：访问权限校验

- `share_link` 新增列 `access_code VARCHAR(16) NULL`（已有库需手工 `ALTER TABLE`，见 README）。
- 创建分享 `POST /api/works/{workId}/shares` 可带 `accessCode`（4–8 位字母数字，否则 400）。
- `GET /api/shares/{token}?code=`、`PUT /api/shares/{token}?code=`：
  链接设置了提取码且 `code` 不匹配 → 403「提取码错误」；未设置则放行。过期仍返回 410；EDIT 校验在提取码之后。
- `GET /api/works/{workId}/shares`：作品所有者查看该作品全部分享链接（含提取码，便于管理）。
- `ShareAccess` 纯函数：格式校验 / 是否需要提取码 / 提取码比对。

## 8. 测试

新增/扩展 37 个用例，总计 159 个全部通过（`mvn test`，无中间件依赖）：

- `JwtServiceTest`：refresh 类型 claim、旧 token 兼容
- `AuthServiceTest`：refresh 旋转、黑名单、非 refresh 拒绝、用户删除
- `UserServiceTest`：头像上传/类型拒绝/空文件/用户不存在
- `WorkStatusFlowTest`：状态机全表
- `WorkServiceTest`：草稿保存、非法流转、publish 幂等
- `AssetServiceTest`：分类聚合、scope 校验
- `TeamAccessTest` / `TeamServiceTest`：角色变更规则
- `ShareAccessTest` / `ShareServiceTest`：提取码格式、校验顺序、作品分享列表
