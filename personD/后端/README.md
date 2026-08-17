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

```bash
mvn spring-boot:run
```

默认端口 **8080**，配置见 `application-dev.yml`。

首次启动时 `DataSeedRunner` 会幂等写入种子账号与公开模板。

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
| 认证 | `/api/auth` | 注册 / 登录 / 登出 / 当前用户 |
| 用户 | `/api/users`、`/api/admin/users` | 资料与管理端分页 |
| 模板 | `/api/templates` | 广场、CRUD、封面、`/use` 创建作品 |
| 素材 | `/api/assets` | 上传 / 列表 / 权限删除 |
| 作品 | `/api/works` | CRUD、发布、缩略图 |
| 团队 | `/api/teams` | 团队与成员、团队作品/素材 |
| 分享 | `/api/shares`、`/api/works/{id}/shares` | 分享链接读写与作废 |

## 测试

无中间件时也可跑通单元测试：

```bash
mvn -q test
```
