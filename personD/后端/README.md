# 稿定风格设计平台 · 后端

## 1. 技术栈与环境要求

- **JDK 21**（必需）
- Spring Boot 3.3.5
- MyBatis-Plus 3.5.9
- MySQL 8、Redis 7、MinIO
- Spring Security 6 + JWT（JJWT）
- Knife4j（OpenAPI 3）

## 2. 启动依赖（Docker）

在本目录执行：

```bash
docker compose up -d
```

将启动：

| 服务 | 端口 | 说明 |
|---|---|---|
| MySQL | 3306 | 库 `design_platform`，用户 `design` / `design123` |
| Redis | 6379 | JWT 黑名单等 |
| MinIO | 9000 / 9001 | 对象存储 API / 控制台 |

## 3. 启动应用

工程路径含中文时（例如 `实训二`、`后端`），Windows 上 **`mvn spring-boot:run` 会失败**：子进程拿到的 classpath 被编码弄乱，报 `找不到或无法加载主类 DesignPlatformApplication`。请改用打包后的 jar：

```powershell
mvn -DskipTests package
java -jar target/design-platform-0.1.0.jar
```

或直接运行本目录的 `run.ps1`。

默认端口 **8080**，配置见 `application-dev.yml`。

首次启动时 `DataSeedRunner` 会幂等写入种子账号与公开模板。

启动前必须先有 MySQL 8（3306）、Redis 7（6379）、MinIO（9000）。本机若已安装 Docker Desktop，可先执行 `docker compose up -d`。没有 Docker 时，请自行安装这三项并保证账号与 `application-dev.yml` 一致。

## 4. 种子账号

| 用户名 | 密码 | 角色 |
|---|---|---|
| `admin` | `admin123` | ADMIN |
| `demo` | `demo123` | USER |

另有 4 条公开模板（主题海报 / 活动营销 / 小红书种草 / 公众号封面）。

## 5. Knife4j API 文档

http://localhost:8080/doc.html

## 6. MinIO 控制台

http://localhost:9001

- 用户：`minioadmin`
- 密码：`minioadmin123`

Buckets：`templates` / `assets` / `works`（应用启动时自动确保存在）。

## 7. 主要 API

统一前缀 `/api`，完整约定见规格文档：

[`../docs/superpowers/specs/2026-08-17-design-platform-backend-design.md`](../docs/superpowers/specs/2026-08-17-design-platform-backend-design.md)

概览：

| 模块 | 前缀 | 说明 |
|---|---|---|
| 认证 | `/api/auth` | 注册 / 登录 / 登出 / 当前用户 / `POST /refresh` 刷新令牌 |
| 用户 | `/api/users`、`/api/admin/users` | 资料、`POST /me/avatar` 上传头像、管理端分页 |
| 模板 | `/api/templates` | 广场、CRUD、封面、`/use` 创建作品 |
| 素材 | `/api/assets` | 上传 / 列表 / `GET /categories` 分类聚合 / 权限删除 |
| 作品 | `/api/works` | CRUD、`PUT /{id}/draft` 自动保存、`POST /{id}/status` 状态流转、发布、缩略图 |
| 团队 | `/api/teams` | 团队与成员（`PUT /{id}/members/{userId}` 角色变更）、团队作品/素材 |
| 分享 | `/api/shares`、`/api/works/{id}/shares` | 分享链接（可设提取码 `accessCode`，访问带 `?code=`）、列表、作废 |

### 第二轮新增（2026-08-18）

- **刷新 Token**：登录/注册响应新增 `refreshToken` + `refreshExpiresIn`（默认 30 天，`app.jwt.refresh-expire-days` 配置）。`POST /api/auth/refresh` 携带 `{refreshToken}` 旋转签发新对，旧刷新令牌进黑名单；刷新令牌无法当访问令牌使用。
- **上传头像**：`POST /api/users/me/avatar`（multipart `file`，仅图片），存 MinIO `assets` bucket 并回写 `user.avatar`。
- **作品状态机**：`DRAFT / PUBLISHED / ARCHIVED`。合法流转：DRAFT→PUBLISHED/ARCHIVED，PUBLISHED→DRAFT/ARCHIVED，ARCHIVED→DRAFT；非法流转返回 400。`PUT /{id}` 改状态与 `POST /{id}/status {target}` 均走状态机校验；`POST /{id}/publish` 对已发布幂等。
- **自动保存草稿**：`PUT /api/works/{id}/draft`（`{canvasJson?, title?}`，仅所有者，不改状态）。
- **素材分类**：`GET /api/assets/categories?scope=mine|public|team&teamId=` 返回 `[{name, count}]` 聚合。
- **成员权限管理**：`PUT /api/teams/{id}/members/{userId}` `{role: ADMIN|MEMBER}`，仅 OWNER 可改，不能改 OWNER；邀请成员时可选 `role`（默认 MEMBER）。
- **分享提取码**：创建分享可带 `accessCode`（4–8 位字母数字）；`GET/PUT /api/shares/{token}?code=` 校验，错误返回 403「提取码错误」；`GET /api/works/{workId}/shares` 所有者可查看分享列表。

> 注意：`share_link` 表新增 `access_code` 列。已有数据库请执行：
> `ALTER TABLE share_link ADD COLUMN access_code VARCHAR(16) NULL AFTER permission;`

## 测试

无中间件时也可跑通单元测试：

```bash
mvn -q test
```
