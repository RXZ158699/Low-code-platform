# 稿定风格在线设计平台 — 后端设计

日期：2026-08-17  
范围：`personD/后端` 独立 REST API（不实现前端编辑器）  
状态：已与需求对齐，待实现

## 1. 背景与目标

`personD` 已有一个稿定风格首页前端（静态模板展示，未接 API）。本项目在 `personD/后端` 实现一套可独立运行的后端，产品形态参考 [稿定设计](https://www.gaoding.com/)：模板广场、素材库、个人作品、团队空间、分享链接。

**目标**

- 个人练习作品：技术栈完整（Spring Boot 3.3 / MySQL / Redis / MinIO / JWT / Knife4j）
- 六个核心域一次做完：User、Template、Asset、Work、Team、Share
- 前端可稍后对接；本期不实现画布编辑器

**非目标**

- 实时协同编辑、WebSocket、CRDT
- 支付 / 会员 / AI 生成
- 视频转码、字体子集化等媒体处理流水线
- 多租户 SaaS 计费

## 2. 技术栈

| 层 | 选择 |
|---|---|
| 语言 / 框架 | Java 21 + Spring Boot 3.3.x |
| 构建 | Maven 单模块 |
| ORM | MyBatis-Plus 3.5.x |
| 数据库 | MySQL 8 |
| 缓存 / 会话 | Redis 7 |
| 对象存储 | MinIO |
| 认证授权 | JWT + Spring Security |
| API 文档 | Knife4j（OpenAPI 3） |
| 本地依赖 | `docker-compose.yml` 拉起 MySQL / Redis / MinIO |

包名：`com.design.platform`  
应用名：`design-platform`

## 3. 工程结构

单模块 + 按业务分包（方案 B）：

```
personD/后端/
  pom.xml
  docker-compose.yml
  README.md
  src/main/java/com/design/platform/
    DesignPlatformApplication.java
    common/          Result、错误码、全局异常、分页
    config/          Security、Redis、MinIO、Knife4j、CORS、MyBatis-Plus
    security/        JWT 签发/解析、过滤器、UserDetails
    storage/         MinIO 上传下载、bucket 初始化
    user/
    template/
    asset/
    work/
    team/
    share/
  src/main/resources/
    application.yml
    application-dev.yml
    db/schema.sql
    db/data.sql
  src/test/java/...
```

每个业务包内部固定分层：`controller` / `service` / `mapper` / `entity` / `dto`。公共能力不放进业务包。

## 4. 数据模型

主键一律 `BIGINT AUTO_INCREMENT`。时间字段 `DATETIME(3)`。JSON 列用 MySQL `JSON`，Java 侧 `List<String>` + Jackson TypeHandler。

### 4.1 user

| 列 | 类型 | 约束 |
|---|---|---|
| id | BIGINT | PK |
| username | VARCHAR(32) | UNIQUE NOT NULL |
| password | VARCHAR(128) | NOT NULL，BCrypt |
| nickname | VARCHAR(32) | NOT NULL |
| avatar | VARCHAR(512) | 可空，MinIO URL |
| role | VARCHAR(16) | USER / ADMIN |
| created_at | DATETIME(3) | NOT NULL |

### 4.2 template

| 列 | 类型 | 约束 |
|---|---|---|
| id | BIGINT | PK |
| title | VARCHAR(128) | NOT NULL |
| category | VARCHAR(32) | 海报 / 电商主图 / PPT / 视频封面 / 小红书种草 / 公众号封面 / 活动营销 |
| cover_image_url | VARCHAR(512) | 可空 |
| preview_images | JSON | URL 数组，默认 `[]` |
| json_data | LONGTEXT | 画布元素 JSON，后端只存不解析 |
| tags | JSON | 字符串数组，默认 `[]` |
| author_id | BIGINT | NOT NULL，逻辑关联 user.id |
| is_public | TINYINT(1) | 默认 1 |
| view_count | BIGINT | 默认 0 |
| download_count | BIGINT | 默认 0（「使用模板」时 +1） |
| created_at / updated_at | DATETIME(3) | |

索引：`category`，`is_public`，`author_id`。

### 4.3 asset

| 列 | 类型 | 约束 |
|---|---|---|
| id | BIGINT | PK |
| file_name | VARCHAR(255) | NOT NULL |
| file_type | VARCHAR(16) | image / video / font / audio |
| url | VARCHAR(512) | NOT NULL |
| object_key | VARCHAR(512) | MinIO object key，删除时用 |
| uploader_id | BIGINT | NOT NULL |
| team_id | BIGINT | 可空；非空表示团队共享素材 |
| category | VARCHAR(32) | 可空 |
| tags | JSON | 默认 `[]` |
| is_public | TINYINT(1) | 默认 0 |
| created_at | DATETIME(3) | |

索引：`uploader_id`，`team_id`，`file_type`。

### 4.4 work

| 列 | 类型 | 约束 |
|---|---|---|
| id | BIGINT | PK |
| user_id | BIGINT | NOT NULL，所有者 |
| template_id | BIGINT | 可空 |
| team_id | BIGINT | 可空；非空表示团队内共享 |
| title | VARCHAR(128) | NOT NULL |
| canvas_json | LONGTEXT | 画布数据，后端只存不解析 |
| thumbnail_url | VARCHAR(512) | 可空 |
| status | VARCHAR(16) | DRAFT / PUBLISHED |
| created_at / updated_at | DATETIME(3) | |

索引：`user_id`，`team_id`，`status`。

### 4.5 team / team_member

`members` 不用 JSON 列表，用关联表，便于权限查询。

**team**

| 列 | 类型 |
|---|---|
| id | BIGINT PK |
| name | VARCHAR(64) NOT NULL |
| owner_id | BIGINT NOT NULL |
| created_at | DATETIME(3) |

**team_member**

| 列 | 类型 |
|---|---|
| id | BIGINT PK |
| team_id | BIGINT NOT NULL |
| user_id | BIGINT NOT NULL |
| role | VARCHAR(16)：OWNER / ADMIN / MEMBER |
| joined_at | DATETIME(3) |

唯一约束：`(team_id, user_id)`。创建团队时插入一条 OWNER 成员（owner_id）。

### 4.6 share_link

表名 `share_link`，避免与 SQL 关键字冲突。

| 列 | 类型 |
|---|---|
| id | BIGINT PK |
| work_id | BIGINT NOT NULL |
| token | VARCHAR(64) UNIQUE NOT NULL |
| expire_at | DATETIME(3) 可空（空 = 永不过期） |
| permission | VARCHAR(16)：VIEW / EDIT |
| created_by | BIGINT NOT NULL |
| created_at | DATETIME(3) |

## 5. 权限规则

- **公开可读**：公开模板列表/详情；未过期的分享链接。
- **模板写**：作者本人或 ADMIN。
- **素材**：上传者可改删；`is_public=true` 所有登录用户可读；`team_id` 非空则该团队成员可读。
- **作品**：只有所有者可改删；`team_id` 非空时团队成员**只读**；EDIT 分享链接可改 `canvas_json` / `title`（不改变所有者）。
- **团队**：OWNER 可解散、转让、踢人；ADMIN 可拉人；MEMBER 只读成员列表并使用共享资源。
- **ADMIN 角色**：可管理任意模板上下架（`is_public`）、查看用户列表。本期不做完整后台运营台。

分享链接访问不强制登录：带 `token` 的 GET/PUT 走独立过滤器或 Security 白名单 + 业务校验过期与权限。

## 6. API 约定

统一前缀 `/api`。JSON 请求/响应。分页：`page` 从 1 开始，`size` 默认 12，最大 50。响应分页结构：

```json
{ "total": 100, "page": 1, "size": 12, "records": [] }
```

### 6.1 认证 ` /api/auth`

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| POST | /register | 匿名 | `{username, password, nickname}` |
| POST | /login | 匿名 | `{username, password}` → `{token, expiresIn, user}` |
| POST | /logout | 登录 | JWT 拉黑 |
| GET | /me | 登录 | 当前用户 |

密码 6–32 位；用户名 3–32，字母数字下划线。

### 6.2 用户 ` /api/users`

| 方法 | 路径 | 鉴权 |
|---|---|---|
| PUT | /me | 登录，改 nickname / avatar |
| GET | /{id} | 登录，公开资料（无 password） |
| GET | /api/admin/users | ADMIN，分页 |

### 6.3 模板 ` /api/templates`

| 方法 | 路径 | 鉴权 | 说明 |
|---|---|---|---|
| GET | / | 匿名 | `category` `keyword` `tag` 分页；只返回 `is_public=true`，登录作者可看自己的私有模板 |
| GET | /{id} | 匿名（私有需作者/ADMIN） | 浏览量 +1 |
| POST | / | 登录 | 创建 |
| PUT | /{id} | 作者/ADMIN | 更新 |
| DELETE | /{id} | 作者/ADMIN | 删除 |
| POST | /{id}/use | 登录 | 用模板创建作品，`download_count+1` |
| POST | /{id}/cover | 作者/ADMIN | multipart 封面图 → MinIO templates bucket |

### 6.4 素材 ` /api/assets`

| 方法 | 路径 | 鉴权 |
|---|---|---|
| GET | / | 登录；`scope=mine\|public\|team`，`teamId` `fileType` `keyword` |
| POST | / | 登录；multipart + `fileType` `category` `tags` `isPublic` `teamId` |
| GET | /{id} | 登录且有读权限 |
| PUT | /{id} | 上传者；改元数据 |
| DELETE | /{id} | 上传者；删 DB + MinIO 对象 |

上传限制：单文件 20MB；image 允许 jpeg/png/webp/gif；video mp4/webm；font ttf/otf/woff2；audio mp3/wav。

### 6.5 作品 ` /api/works`

| 方法 | 路径 | 鉴权 |
|---|---|---|
| GET | / | 登录；自己的作品，`status` 筛选 |
| GET | /{id} | 所有者或团队成员 |
| POST | / | 登录；可带 `templateId` 拷贝 `json_data` → `canvas_json` |
| PUT | /{id} | 所有者；改 title / canvasJson / status / teamId |
| DELETE | /{id} | 所有者 |
| POST | /{id}/publish | 所有者；status=PUBLISHED |
| POST | /{id}/thumbnail | 所有者；multipart 快照 → works bucket |

### 6.6 团队 ` /api/teams`

| 方法 | 路径 | 鉴权 |
|---|---|---|
| POST | / | 登录；创建并把自己写成 OWNER |
| GET | / | 登录；我加入的团队 |
| GET | /{id} | 成员 |
| PUT | /{id} | OWNER/ADMIN；改 name |
| DELETE | /{id} | OWNER |
| GET | /{id}/members | 成员 |
| POST | /{id}/members | OWNER/ADMIN；`{userId}` 或 `{username}` |
| DELETE | /{id}/members/{userId} | OWNER/ADMIN；不能移除 OWNER |
| GET | /{id}/works | 成员；`team_id` 匹配的作品 |
| GET | /{id}/assets | 成员；`team_id` 匹配的素材 |

### 6.7 分享 ` /api/shares`

| 方法 | 路径 | 鉴权 |
|---|---|---|
| POST | /api/works/{workId}/shares | 作品所有者；`{expireAt, permission}` → `{token, url}` |
| GET | /{token} | 匿名；过期返回 410；返回作品只读视图 |
| PUT | /{token} | 匿名但 permission=EDIT；更新 canvasJson/title |
| DELETE | /{id} | 创建者；作废链接 |

`token` 使用 32 位 hex（16 字节安全随机数），不使用自增 id 当公开标识。

## 7. 统一响应与错误

```json
{ "code": 0, "message": "ok", "data": {} }
```

`code = 0` 成功。HTTP 状态仍按语义返回（401/403/404），body 始终是 `Result`。

| code | 含义 |
|---|---|
| 0 | 成功 |
| 40000 | 参数校验失败 |
| 40100 | 未登录或 token 无效 |
| 40300 | 无权限 |
| 40400 | 资源不存在 |
| 40900 | 冲突（用户名已存在） |
| 41000 | 分享链接过期 |
| 41300 | 文件过大 |
| 41500 | 文件类型不支持 |
| 50000 | 服务器内部错误 |

`@RestControllerAdvice` 处理 `MethodArgumentNotValidException`、自定义 `BizException`、其余 Exception（不把堆栈返回给客户端）。

## 8. 认证与 Redis

- JWT：HS256，payload 含 `sub=userId`、`username`、`role`、`jti`。
- 访问令牌有效期 7 天。密钥放 `application.yml` 的 `app.jwt.secret`，compose 用环境变量覆盖。
- 登录成功后不把整段 token 当 Redis session；logout 把 `jti` 写入黑名单：`auth:blacklist:{jti}`，TTL = token 剩余寿命。
- 过滤器白名单：`POST /api/auth/register`、`POST /api/auth/login`、`GET /api/templates/**`、`GET /api/shares/{token}`、`PUT /api/shares/{token}`（EDIT 在业务层校验）、Knife4j 与 `/actuator/health`。其余请求必须带有效 JWT 且 `jti` 未拉黑。私有模板详情在业务层二次校验。
- 模板广场列表缓存：`cache:templates:{category}:{page}:{size}:{keyword}`，TTL 60s；模板写操作后按前缀删除。浏览量用 Redis `INCR template:view:{id}`，定时或读取时回写 DB（实现上采用：每次详情读取 DB +1，缓存只覆盖列表，避免练习项目把计数搞复杂）。

## 9. MinIO

三个 bucket（启动时若不存在则创建，public-read 策略仅用于生成可访问 URL；练习环境 MinIO 走 path-style）：

| bucket | 用途 |
|---|---|
| templates | 封面、预览图 |
| assets | 用户上传素材 |
| works | 作品缩略图 / 快照 |

对象 key：`{yyyy}/{MM}/{uuid}.{ext}`。  
返回给前端的 `url`：`http://localhost:9000/{bucket}/{key}`（`app.minio.public-base-url` 可配置）。  
删除素材/封面时按 `object_key` 删对象，DB 失败不留下孤儿记录优先于对象（先删 DB 再尽力删对象，删对象失败打日志）。

## 10. 本地运行

`docker-compose.yml` 服务：

- mysql:8.0 → 3306，库 `design_platform`，用户 `design` / `design123`
- redis:7 → 6379
- minio → 9000 API / 9001 Console，用户 `minioadmin` / `minioadmin123`

应用：`application-dev.yml` 指向以上地址，端口 **8080**。CORS 允许 `http://localhost:5173`。

启动种子（`data.sql` 或 CommandLineRunner）：

- 管理员 `admin` / `admin123`，角色 ADMIN
- 普通用户 `demo` / `demo123`
- 4 条公开模板，分类覆盖首页 Tab：主题海报、活动营销、小红书种草、公众号封面；`json_data` 用最小画布 JSON（宽高 + 空 elements）

Knife4j：`http://localhost:8080/doc.html`

## 11. 测试策略

- 单测：JWT 工具、密码校验、分享过期判断、权限判断（作品/团队/分享）。
- 切片测试：Auth 注册登录、模板列表分页、用模板创建作品。
- 不强制 Testcontainers（本机以 compose 为准）；测试可用 H2 会与 MySQL JSON 不兼容，故集成测试标注 `@DisabledIf` 无 MySQL 时跳过，或只对纯 Java 逻辑做单测，保证 `mvn test` 在无 Docker 时也能过。

**可测的完成标准**

1. `docker compose up -d` 后应用启动成功
2. 注册 / 登录拿到 JWT，访问 `/api/auth/me`
3. 匿名可拉模板列表；登录后 `/use` 得到作品
4. 上传一张图成为 Asset，MinIO 控制台能看到对象
5. 建团队、拉成员、作品挂 `teamId` 后成员可读
6. 生成分享链接，未登录用 token 能 GET 作品；过期返回 410
7. `/doc.html` 可调试全部接口

## 12. 实现顺序

1. Maven 骨架 + docker-compose + schema + Result/异常 + Knife4j
2. Security + JWT + User 注册登录
3. MinIO StorageService
4. Template CRUD + 列表筛选 + `/use`
5. Asset 上传删除
6. Work CRUD + 缩略图
7. Team + 成员 + 团队资源列表
8. Share 链接
9. 种子数据 + README

不引入 Flyway（练习项目一条 `schema.sql` 足够）。不解析 `json_data` / `canvas_json` 内部结构。
