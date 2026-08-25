# 稿定风格设计平台后端 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `personD/后端` 落地一套稿定风格在线设计平台 REST API（用户/模板/素材/作品/团队/分享），不实现前端编辑器。

**Architecture:** Maven 单模块，包名 `com.design.platform`，按业务分包（user/template/asset/work/team/share）+ common/security/storage/config。MyBatis-Plus 访问 MySQL，JWT + Redis 黑名单做认证，MinIO 存文件，Knife4j 出文档。画布 JSON 只存不解析。

**Tech Stack:** Java 21, Spring Boot 3.3.5, MyBatis-Plus 3.5.9, MySQL 8, Redis 7, MinIO, JJWT 0.12.6, Knife4j 4.5.0, Spring Security 6.

## Global Constraints

- 根目录：`E:\实训二\项目\low-code_platform\personD\后端`（下文路径均相对该目录）
- Java 21 + Spring Boot **3.3.5** + Maven 单模块；包名 **`com.design.platform`**
- ORM 用 MyBatis-Plus，不用 JPA
- 统一响应 `Result<T>`：`{code, message, data}`，成功 `code=0`
- 错误码：40000 / 40100 / 40300 / 40400 / 40900 / 41000 / 41300 / 41500 / 50000
- JWT HS256，7 天，logout 将 `jti` 写入 Redis 黑名单
- MinIO buckets：`templates` / `assets` / `works`
- 主键 `BIGINT AUTO_INCREMENT`；JSON 列用 MySQL JSON + `List<String>` TypeHandler
- 不解析 `json_data` / `canvas_json` 内部结构
- 不引入 Flyway；用 `schema.sql` + `data.sql`
- 单测不依赖 Docker/MySQL，保证无中间件时 `mvn test` 通过
- 提交信息用中文或 `feat:` 前缀均可；用户未要求时执行者可跳过 commit 步骤

**规格：** `personD/docs/superpowers/specs/2026-08-17-design-platform-backend-design.md`

## File Map

```
后端/
  pom.xml
  docker-compose.yml
  README.md
  src/main/resources/application.yml
  src/main/resources/application-dev.yml
  src/main/resources/db/schema.sql
  src/main/resources/db/data.sql
  src/main/java/com/design/platform/
    DesignPlatformApplication.java
    common/
      api/Result.java, PageData.java
      error/ErrorCode.java, BizException.java, GlobalExceptionHandler.java
      mybatis/ListStringTypeHandler.java
    config/
      MybatisPlusConfig.java, RedisConfig.java, Knife4jConfig.java
      CorsConfig.java, SecurityConfig.java, MinioConfig.java
      MetaTimeHandler.java
    security/
      JwtService.java, JwtAuthFilter.java, AuthUser.java, SecurityUtils.java
    storage/StorageService.java
    user/ entity, mapper, service, controller, dto
    template/ ...
    asset/ ...
    work/ ...
    team/ ...
    share/ ...
  src/test/java/com/design/platform/
    common/ErrorCodeTest.java
    security/JwtServiceTest.java
    share/ShareExpiryTest.java
    team/TeamAccessTest.java
    work/WorkAccessTest.java
    template/TemplateAccessTest.java
```

---

### Task 1: Maven 骨架、Compose、统一响应

**Files:**
- Create: `pom.xml`
- Create: `docker-compose.yml`
- Create: `src/main/resources/application.yml`
- Create: `src/main/resources/application-dev.yml`
- Create: `src/main/resources/db/schema.sql`
- Create: `src/main/java/com/design/platform/DesignPlatformApplication.java`
- Create: `src/main/java/com/design/platform/common/error/ErrorCode.java`
- Create: `src/main/java/com/design/platform/common/error/BizException.java`
- Create: `src/main/java/com/design/platform/common/error/GlobalExceptionHandler.java`
- Create: `src/main/java/com/design/platform/common/api/Result.java`
- Create: `src/main/java/com/design/platform/common/api/PageData.java`
- Create: `src/main/java/com/design/platform/common/mybatis/ListStringTypeHandler.java`
- Create: `src/main/java/com/design/platform/config/MybatisPlusConfig.java`
- Create: `src/main/java/com/design/platform/config/RedisConfig.java`
- Create: `src/main/java/com/design/platform/config/CorsConfig.java`
- Create: `src/main/java/com/design/platform/config/Knife4jConfig.java`
- Create: `src/main/java/com/design/platform/config/MetaTimeHandler.java`
- Create: `src/test/java/com/design/platform/common/ErrorCodeTest.java`

**Interfaces:**
- Consumes: 无
- Produces: `Result.ok(T)` / `Result.fail(ErrorCode)`；`ErrorCode.getCode()`；`BizException(ErrorCode)`；`PageData.of(total, page, size, records)`

- [ ] **Step 1: 写失败单测**

```java
package com.design.platform.common;

import com.design.platform.common.api.Result;
import com.design.platform.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ErrorCodeTest {
    @Test
    void okResultHasCodeZero() {
        Result<String> r = Result.ok("hi");
        assertEquals(0, r.getCode());
        assertEquals("ok", r.getMessage());
        assertEquals("hi", r.getData());
    }

    @Test
    void failResultUsesErrorCode() {
        Result<Void> r = Result.fail(ErrorCode.UNAUTHORIZED);
        assertEquals(40100, r.getCode());
        assertEquals("未登录或 token 无效", r.getMessage());
        assertNull(r.getData());
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `mvn -q -Dtest=ErrorCodeTest test`（在 `后端` 目录）  
Expected: 失败（包不存在或编译失败）

- [ ] **Step 3: 写 pom.xml**

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <parent>
        <groupId>org.springframework.boot</groupId>
        <artifactId>spring-boot-starter-parent</artifactId>
        <version>3.3.5</version>
        <relativePath/>
    </parent>
    <groupId>com.design</groupId>
    <artifactId>design-platform</artifactId>
    <version>0.1.0</version>
    <name>design-platform</name>
    <properties>
        <java.version>21</java.version>
        <mybatis-plus.version>3.5.9</mybatis-plus.version>
        <knife4j.version>4.5.0</knife4j.version>
        <jjwt.version>0.12.6</jjwt.version>
        <minio.version>8.5.12</minio.version>
    </properties>
    <dependencies>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-validation</artifactId>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-data-redis</artifactId>
        </dependency>
        <dependency>
            <groupId>com.baomidou</groupId>
            <artifactId>mybatis-plus-spring-boot3-starter</artifactId>
            <version>${mybatis-plus.version}</version>
        </dependency>
        <dependency>
            <groupId>com.mysql</groupId>
            <artifactId>mysql-connector-j</artifactId>
            <scope>runtime</scope>
        </dependency>
        <dependency>
            <groupId>com.github.xiaoymin</groupId>
            <artifactId>knife4j-openapi3-jakarta-spring-boot-starter</artifactId>
            <version>${knife4j.version}</version>
        </dependency>
        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
            <optional>true</optional>
        </dependency>
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-test</artifactId>
            <scope>test</scope>
        </dependency>
    </dependencies>
    <build>
        <plugins>
            <plugin>
                <groupId>org.springframework.boot</groupId>
                <artifactId>spring-boot-maven-plugin</artifactId>
                <configuration>
                    <excludes>
                        <exclude>
                            <groupId>org.projectlombok</groupId>
                            <artifactId>lombok</artifactId>
                        </exclude>
                    </excludes>
                </configuration>
            </plugin>
        </plugins>
    </build>
</project>
```

- [ ] **Step 4: 写 docker-compose.yml**

```yaml
services:
  mysql:
    image: mysql:8.0
    container_name: design-mysql
    ports:
      - "3306:3306"
    environment:
      MYSQL_ROOT_PASSWORD: root123
      MYSQL_DATABASE: design_platform
      MYSQL_USER: design
      MYSQL_PASSWORD: design123
    command: ["--character-set-server=utf8mb4", "--collation-server=utf8mb4_unicode_ci", "--default-time-zone=+08:00"]
    volumes:
      - design-mysql-data:/var/lib/mysql
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-udesign", "-pdesign123"]
      interval: 5s
      timeout: 5s
      retries: 20

  redis:
    image: redis:7
    container_name: design-redis
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 10

  minio:
    image: minio/minio:latest
    container_name: design-minio
    command: server /data --console-address ":9001"
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin123
    volumes:
      - design-minio-data:/data

volumes:
  design-mysql-data:
  design-minio-data:
```

- [ ] **Step 5: 写 schema.sql（完整六表）**

```sql
CREATE TABLE IF NOT EXISTS `user` (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(32) NOT NULL UNIQUE,
  password VARCHAR(128) NOT NULL,
  nickname VARCHAR(32) NOT NULL,
  avatar VARCHAR(512) NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'USER',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS template (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  title VARCHAR(128) NOT NULL,
  category VARCHAR(32) NOT NULL,
  cover_image_url VARCHAR(512) NULL,
  preview_images JSON NULL,
  json_data LONGTEXT NULL,
  tags JSON NULL,
  author_id BIGINT NOT NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 1,
  view_count BIGINT NOT NULL DEFAULT 0,
  download_count BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_template_category (category),
  INDEX idx_template_public (is_public),
  INDEX idx_template_author (author_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS asset (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(16) NOT NULL,
  url VARCHAR(512) NOT NULL,
  object_key VARCHAR(512) NOT NULL,
  uploader_id BIGINT NOT NULL,
  team_id BIGINT NULL,
  category VARCHAR(32) NULL,
  tags JSON NULL,
  is_public TINYINT(1) NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  INDEX idx_asset_uploader (uploader_id),
  INDEX idx_asset_team (team_id),
  INDEX idx_asset_type (file_type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS work (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  template_id BIGINT NULL,
  team_id BIGINT NULL,
  title VARCHAR(128) NOT NULL,
  canvas_json LONGTEXT NULL,
  thumbnail_url VARCHAR(512) NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'DRAFT',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  INDEX idx_work_user (user_id),
  INDEX idx_work_team (team_id),
  INDEX idx_work_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS team (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(64) NOT NULL,
  owner_id BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS team_member (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  team_id BIGINT NOT NULL,
  user_id BIGINT NOT NULL,
  role VARCHAR(16) NOT NULL DEFAULT 'MEMBER',
  joined_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE KEY uk_team_user (team_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS share_link (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  work_id BIGINT NOT NULL,
  token VARCHAR(64) NOT NULL UNIQUE,
  expire_at DATETIME(3) NULL,
  permission VARCHAR(16) NOT NULL,
  created_by BIGINT NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 6: 写 application.yml / application-dev.yml**

`application.yml`：

```yaml
server:
  port: 8080
spring:
  profiles:
    active: dev
  servlet:
    multipart:
      max-file-size: 20MB
      max-request-size: 20MB
  jackson:
    default-property-inclusion: non_null
  sql:
    init:
      mode: always
      schema-locations: classpath:db/schema.sql
      data-locations: classpath:db/data.sql
      continue-on-error: true
mybatis-plus:
  configuration:
    map-underscore-to-camel-case: true
  global-config:
    db-config:
      id-type: auto
springdoc:
  swagger-ui:
    path: /swagger-ui.html
  api-docs:
    path: /v3/api-docs
knife4j:
  enable: true
  setting:
    language: zh_cn
app:
  jwt:
    secret: "design-platform-dev-secret-change-me-32bytes!!"
    expire-days: 7
  minio:
    endpoint: http://localhost:9000
    public-base-url: http://localhost:9000
    access-key: minioadmin
    secret-key: minioadmin123
    buckets:
      templates: templates
      assets: assets
      works: works
```

`application-dev.yml`：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/design_platform?useUnicode=true&characterEncoding=utf8&serverTimezone=Asia/Shanghai
    username: design
    password: design123
  data:
    redis:
      host: localhost
      port: 6379
```

`sql.init.mode=always` 配合 `continue-on-error: true`：表已存在时 CREATE 失败可忽略。`data.sql` 本任务先建空文件（仅注释），种子放到 Task 10。

- [ ] **Step 7: 实现 Result / ErrorCode / 异常 / 分页 / TypeHandler / 基础配置**

`ErrorCode.java` 枚举字段：`OK(0,"ok")` `BAD_REQUEST(40000,"参数校验失败")` `UNAUTHORIZED(40100,"未登录或 token 无效")` `FORBIDDEN(40300,"无权限")` `NOT_FOUND(40400,"资源不存在")` `CONFLICT(40900,"冲突")` `GONE(41000,"分享链接过期")` `FILE_TOO_LARGE(41300,"文件过大")` `UNSUPPORTED_TYPE(41500,"文件类型不支持")` `INTERNAL(50000,"服务器内部错误")`。提供 `code`/`message` getter。

`Result<T>`：`code` `message` `data`；静态方法 `ok()` `ok(T)` `fail(ErrorCode)` `fail(ErrorCode, String overrideMessage)`。

`BizException`：持有 `ErrorCode` + 可选 message。

`GlobalExceptionHandler`：
- `BizException` → HTTP 按 code 映射（40100→401，40300→403，40400→404，40900→409，41000→410，41300→413，41500→415，其余 400），body 为 `Result.fail`
- `MethodArgumentNotValidException` / `BindException` / `ConstraintViolationException` → 400 + 40000，message 取第一条校验错误
- `MaxUploadSizeExceededException` → 413 + 41300
- `Exception` → 500 + 50000，日志打堆栈，body 不返回堆栈

`PageData<T>`：`total` `page` `size` `records`。

`ListStringTypeHandler`：`BaseTypeHandler<List<String>>`，用 Jackson `ObjectMapper` 读写 JSON 数组。

`DesignPlatformApplication`：`@SpringBootApplication` + `@MapperScan("com.design.platform.**.mapper")`。

`MybatisPlusConfig`：注册 `MybatisPlusInterceptor` + `PaginationInnerInterceptor(DbType.MYSQL)`。

`RedisConfig`：`RedisTemplate<String, String>`（StringRedisSerializer）。

`CorsConfig`：允许 `http://localhost:5173`，methods GET/POST/PUT/DELETE/PATCH/OPTIONS，headers `*`，credentials true。

`Knife4jConfig`：`OpenAPI` bean，title「设计平台 API」，version `0.1.0`。

`MetaTimeHandler`：实现 `MetaObjectHandler`，insert 填 `createdAt`/`updatedAt`，update 填 `updatedAt`（字段存在才填）。

空文件：`src/main/resources/db/data.sql` 内容为 `-- seed in task 10`。

- [ ] **Step 8: 跑单测通过**

Run: `mvn -q -Dtest=ErrorCodeTest test`  
Expected: `BUILD SUCCESS`，tests = 2 passed

- [ ] **Step 9: Commit（用户未要求可跳过）**

```bash
git add personD/后端 personD/docs
git commit -m "feat: 初始化设计平台后端骨架与统一响应"
```

---

### Task 2: JWT 工具

**Files:**
- Create: `src/main/java/com/design/platform/security/JwtService.java`
- Create: `src/test/java/com/design/platform/security/JwtServiceTest.java`

**Interfaces:**
- Consumes: 无
- Produces:
  - `JwtService(String secret, Duration ttl)`
  - `String issue(Long userId, String username, String role)`
  - `JwtPayload parse(String token)` — 无效或过期抛 `BizException(UNAUTHORIZED)`
  - `record JwtPayload(Long userId, String username, String role, String jti, Instant expireAt)`

- [ ] **Step 1: 写失败单测**

```java
package com.design.platform.security;

import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import org.junit.jupiter.api.Test;
import java.time.Duration;
import static org.junit.jupiter.api.Assertions.*;

class JwtServiceTest {
    private final JwtService jwt = new JwtService("test-secret-key-must-be-long-enough-32", Duration.ofHours(1));

    @Test
    void issueAndParseRoundTrip() {
        String token = jwt.issue(7L, "alice", "USER");
        JwtPayload p = jwt.parse(token);
        assertEquals(7L, p.userId());
        assertEquals("alice", p.username());
        assertEquals("USER", p.role());
        assertNotNull(p.jti());
        assertFalse(p.jti().isBlank());
    }

    @Test
    void expiredTokenThrowsUnauthorized() {
        JwtService shortLived = new JwtService("test-secret-key-must-be-long-enough-32", Duration.ofMillis(1));
        String token = shortLived.issue(1L, "bob", "USER");
        try { Thread.sleep(20); } catch (InterruptedException ignored) {}
        BizException ex = assertThrows(BizException.class, () -> shortLived.parse(token));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void garbageTokenThrowsUnauthorized() {
        assertThrows(BizException.class, () -> jwt.parse("not-a-jwt"));
    }
}
```

- [ ] **Step 2: 运行确认失败**

Run: `mvn -q -Dtest=JwtServiceTest test`  
Expected: 编译失败 `JwtService` 不存在

- [ ] **Step 3: 实现 JwtService**

pom 增加：

```xml
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-api</artifactId>
    <version>${jjwt.version}</version>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-impl</artifactId>
    <version>${jjwt.version}</version>
    <scope>runtime</scope>
</dependency>
<dependency>
    <groupId>io.jsonwebtoken</groupId>
    <artifactId>jjwt-jackson</artifactId>
    <version>${jjwt.version}</version>
    <scope>runtime</scope>
</dependency>
```

`JwtService` 用 `Keys.hmacShaKeyFor(secret.getBytes(UTF_8))`（secret 不足 32 字节则 SHA-256 扩展）。`issue` 写入 claims：`uid` `username` `role`，`id(jti)=UUID`，`subject=String.valueOf(userId)`。`parse` 捕获 `JwtException` 转 `BizException(UNAUTHORIZED)`。再提供无参 Spring 构造：`@Value("${app.jwt.secret}")` + `@Value("${app.jwt.expire-days}")` 转 `Duration.ofDays`。

- [ ] **Step 4: 跑单测通过**

Run: `mvn -q -Dtest=JwtServiceTest,ErrorCodeTest test`  
Expected: 全部 PASS

- [ ] **Step 5: Commit（可跳过）**

```bash
git add 后端
git commit -m "feat: 增加 JWT 签发与解析"
```

---

### Task 3: 用户注册登录与 Spring Security

**Files:**
- Create: `src/main/java/com/design/platform/user/entity/User.java`
- Create: `src/main/java/com/design/platform/user/mapper/UserMapper.java`
- Create: `src/main/java/com/design/platform/user/dto/RegisterRequest.java`
- Create: `src/main/java/com/design/platform/user/dto/LoginRequest.java`
- Create: `src/main/java/com/design/platform/user/dto/UpdateProfileRequest.java`
- Create: `src/main/java/com/design/platform/user/dto/UserVO.java`
- Create: `src/main/java/com/design/platform/user/dto/LoginResponse.java`
- Create: `src/main/java/com/design/platform/user/service/AuthService.java`
- Create: `src/main/java/com/design/platform/user/controller/AuthController.java`
- Create: `src/main/java/com/design/platform/user/controller/UserController.java`
- Create: `src/main/java/com/design/platform/user/controller/AdminUserController.java`
- Create: `src/main/java/com/design/platform/security/AuthUser.java`
- Create: `src/main/java/com/design/platform/security/SecurityUtils.java`
- Create: `src/main/java/com/design/platform/security/JwtAuthFilter.java`
- Create: `src/main/java/com/design/platform/config/SecurityConfig.java`
- Create: `src/test/java/com/design/platform/user/AuthValidationTest.java`

**Interfaces:**
- Consumes: `JwtService.issue/parse`；`Result`；`ErrorCode`
- Produces:
  - `AuthService.register(RegisterRequest): UserVO`
  - `AuthService.login(LoginRequest): LoginResponse`
  - `AuthService.logout(String token): void`
  - `SecurityUtils.requireUser(): AuthUser`
  - `record AuthUser(Long id, String username, String role)`
  - Redis key：`auth:blacklist:{jti}`

- [ ] **Step 1: 写失败单测（纯校验逻辑抽到 `AuthRules`）**

Create `src/main/java/com/design/platform/user/service/AuthRules.java` 与测试：

```java
class AuthValidationTest {
    @Test
    void usernameTooShort() {
        assertFalse(AuthRules.validUsername("ab"));
        assertTrue(AuthRules.validUsername("abc"));
    }
    @Test
    void passwordTooShort() {
        assertFalse(AuthRules.validPassword("12345"));
        assertTrue(AuthRules.validPassword("123456"));
    }
}
```

`AuthRules.validUsername`：`^[a-zA-Z0-9_]{3,32}$`  
`AuthRules.validPassword`：长度 6–32

- [ ] **Step 2: 运行确认失败后实现 AuthRules，再跑通**

- [ ] **Step 3: 加 Spring Security 依赖并实现领域代码**

pom 增加 `spring-boot-starter-security`。

`User` 实体：`@TableName("user")` 字段 `id, username, password, nickname, avatar, role, createdAt`。VO 不含 password。

`UserMapper extends BaseMapper<User>`。

`AuthService`：
- register：校验规则失败 → `BAD_REQUEST`；`username` 已存在 → `CONFLICT`（message「用户名已存在」）；`BCryptPasswordEncoder.encode`；role=`USER`；返回 VO
- login：用户不存在或密码不匹配 → `UNAUTHORIZED`（message「用户名或密码错误」）；签发 JWT；`LoginResponse(token, expiresInSeconds, user)`
- logout：`parse` 得到 jti 与 expireAt，`StringRedisTemplate.opsForValue().set("auth:blacklist:"+jti, "1", Duration.between(now, expireAt))`；已过期则忽略

`JwtAuthFilter`（OncePerRequestFilter）：
- 无 `Authorization: Bearer ` 则放行（交给 Security 决定是否要认证）
- 有 token：若 Redis 存在 `auth:blacklist:{jti}` → 401；否则 `parse` 成功后 `SecurityContext` 写入 `AuthUser`（`UsernamePasswordAuthenticationToken`）
- parse 失败：不设置 context，继续 filter chain（受保护接口由 Security 返回 401）

`SecurityConfig`：
- CSRF off，Session STATELESS
- `authorizeHttpRequests`：
  - permitAll：`/api/auth/register`、`/api/auth/login`、`GET /api/templates`、`GET /api/templates/*`、`GET /api/shares/*`、`PUT /api/shares/*`、`/doc.html`、`/webjars/**`、`/v3/api-docs/**`、`/favicon.ico`、`/swagger-ui/**`
  - `/api/admin/**` 需要 `hasRole("ADMIN")`
  - 其余 `authenticated`
- 自定义 `AuthenticationEntryPoint` 写 JSON `Result.fail(UNAUTHORIZED)`
- 自定义 `AccessDeniedHandler` 写 JSON `Result.fail(FORBIDDEN)`
- `PasswordEncoder` bean = `BCryptPasswordEncoder`
- 注册 `JwtAuthFilter` 在 `UsernamePasswordAuthenticationFilter` 之前

`AuthUser`：`record AuthUser(Long id, String username, String role) implements UserDetails`：`getAuthorities()` 返回 `ROLE_{role}`；password 空串；全部 account 状态 true。

`SecurityUtils.requireUser()`：从 `SecurityContext` 取 `AuthUser`，没有则 `BizException(UNAUTHORIZED)`。`requireAdmin()`：role 不是 ADMIN 则 FORBIDDEN。

`AuthController` 路径 `/api/auth`：POST register/login/logout，GET me。logout 从 Header 取 Bearer token。

`UserController` `/api/users`：PUT `/me`，GET `/{id}` 返回公开资料。

`AdminUserController` `/api/admin/users`：GET 分页，`PageData<UserVO>`。

- [ ] **Step 4: 跑单测**

Run: `mvn -q test`  
Expected: 全部 PASS（仍无 Spring 容器测试）

- [ ] **Step 5: Commit（可跳过）**

```bash
git commit -m "feat: 用户注册登录与 JWT 鉴权"
```

---

### Task 4: MinIO StorageService

**Files:**
- Create: `src/main/java/com/design/platform/config/MinioConfig.java`
- Create: `src/main/java/com/design/platform/storage/StorageService.java`
- Create: `src/test/java/com/design/platform/storage/ObjectKeyTest.java`

**Interfaces:**
- Consumes: `app.minio.*` 配置
- Produces:
  - `record StoredObject(String bucket, String objectKey, String url)`
  - `StoredObject upload(String bucket, String originalFilename, String contentType, InputStream in, long size)`
  - `void delete(String bucket, String objectKey)`
  - `void ensureBuckets()`
  - 启动时 `ApplicationRunner` 调用 `ensureBuckets()`

- [ ] **Step 1: 写 object key 单测**

把 key 生成抽到 `ObjectKeys`：

```java
public final class ObjectKeys {
    public static String of(String originalFilename, LocalDate date, String uuid) {
        String ext = "";
        int dot = originalFilename.lastIndexOf('.');
        if (dot >= 0) ext = originalFilename.substring(dot).toLowerCase(Locale.ROOT);
        return "%04d/%02d/%s%s".formatted(date.getYear(), date.getMonthValue(), uuid, ext);
    }
}
```

测试：`ObjectKeys.of("A.PNG", LocalDate.of(2026,8,17), "abc")` 等于 `2026/08/abc.png`。

- [ ] **Step 2: 实现 MinIO**

pom 增加：

```xml
<dependency>
    <groupId>io.minio</groupId>
    <artifactId>minio</artifactId>
    <version>${minio.version}</version>
</dependency>
```

`MinioConfig`：`MinioClient.builder().endpoint(endpoint).credentials(access, secret).build()`。

`StorageService.upload`：`objectKey = ObjectKeys.of(filename, LocalDate.now(), UUID.randomUUID().toString().replace("-", ""))`；`putObject`；`url = publicBaseUrl + "/" + bucket + "/" + objectKey`。

`ensureBuckets`：对 `templates` `assets` `works` 若不存在则 `makeBucket`。

文件大小在 Controller 层用 Spring multipart 限制；StorageService 不解析业务类型。

- [ ] **Step 3: `mvn -q test` 通过后 commit（可跳过）**

---

### Task 5: 模板 API

**Files:**
- Create: `src/main/java/com/design/platform/template/entity/Template.java`
- Create: `src/main/java/com/design/platform/template/mapper/TemplateMapper.java`
- Create: `src/main/java/com/design/platform/template/dto/TemplateQuery.java`
- Create: `src/main/java/com/design/platform/template/dto/TemplateCreateRequest.java`
- Create: `src/main/java/com/design/platform/template/dto/TemplateUpdateRequest.java`
- Create: `src/main/java/com/design/platform/template/dto/TemplateVO.java`
- Create: `src/main/java/com/design/platform/template/service/TemplateAccess.java`
- Create: `src/main/java/com/design/platform/template/service/TemplateService.java`
- Create: `src/main/java/com/design/platform/template/controller/TemplateController.java`
- Create: `src/test/java/com/design/platform/template/TemplateAccessTest.java`

**Interfaces:**
- Consumes: `StorageService`；`AuthUser`；`UserMapper`（作者信息可选）
- Produces:
  - `PageData<TemplateVO> list(TemplateQuery, AuthUser or null)`
  - `TemplateVO get(Long id, AuthUser or null)` — 成功则 `view_count+1`
  - `TemplateVO create(...)` `update` `delete`
  - `Work createFromTemplate(Long templateId, AuthUser)` 在 Task 7 由 WorkService 调用；本任务 Controller 的 `/use` 可先调一个 `TemplateService.incrementDownload` + 抛「Work 未就绪」**禁止**。本任务 `/use` 创建最小 Work 行：为此 **本任务同时创建 Work 实体/Mapper 的最小写入**（title=模板 title，canvasJson=jsonData，status=DRAFT），Work 完整 CRUD 在 Task 7 补齐。
  - `TemplateAccess.canRead(template, viewer)` `canWrite(template, viewer)`

- [ ] **Step 1: TemplateAccess 单测**

规则：
- `canRead`：`isPublic` 或 viewer 是作者或 ADMIN
- `canWrite`：viewer 是作者或 ADMIN
- viewer 为 null 时仅 public 可读、不可写

- [ ] **Step 2: 实现实体与 API**

`Template`：`previewImages`/`tags` 使用 `@TableField(typeHandler = ListStringTypeHandler.class)`，MyBatis-Plus 需 `@TableName(autoResultMap = true)`。

`TemplateQuery`：`category` `keyword` `tag` `page` 默认 1 `size` 默认 12（>50 截断为 50）。

列表：`is_public=1` 的记录；若已登录，额外 OR `author_id = currentUser.id`。keyword 对 title LIKE。tag 用 JSON 包含（`JSON_CONTAINS(tags, JSON_QUOTE(#{tag}))`），可用 `QueryWrapper.apply`。

`GET /{id}`：找不到 404；`canRead` 否则 403；然后 `view_count = view_count+1`。

`POST /` 登录即可，authorId=当前用户。

`POST /{id}/cover`：multipart `file`，仅 image jpeg/png/webp/gif，否则 41500；上传到 templates bucket，更新 `coverImageUrl`。

`POST /{id}/use`：登录；`canRead`；`download_count+1`；插入 `work`（userId=当前用户，templateId，title=模板 title，canvasJson=jsonData，status=DRAFT）；返回 WorkVO（本任务定义最小 WorkVO：id, userId, templateId, title, status）。

缓存：列表查询先读 Redis key `cache:templates:{category}:{page}:{size}:{keyword}:{tag}` TTL 60s；写模板后 `redis.keys("cache:templates:*")` 删除（练习项目可接受）。注意 keys 命令；实现用 `scan` 或直接省略精确 tag 维度用短 TTL。若 scan 复杂，**允许只设 TTL 60s 不主动删**，与规格「写后删前缀」相比以简单为准：实现 `deleteByPrefix` 用 `ScanOptions.scanOptions().match("cache:templates:*")`。

- [ ] **Step 3: `mvn -q test` PASS 后 commit（可跳过）**

---

### Task 6: 素材 API

**Files:**
- Create: `src/main/java/com/design/platform/asset/entity/Asset.java`
- Create: `src/main/java/com/design/platform/asset/mapper/AssetMapper.java`
- Create: `src/main/java/com/design/platform/asset/dto/*`（AssetVO, AssetQuery, AssetUpdateRequest）
- Create: `src/main/java/com/design/platform/asset/service/AssetTypeRules.java`
- Create: `src/main/java/com/design/platform/asset/service/AssetService.java`
- Create: `src/main/java/com/design/platform/asset/controller/AssetController.java`
- Create: `src/test/java/com/design/platform/asset/AssetTypeRulesTest.java`

**Interfaces:**
- Consumes: `StorageService.upload/delete`；后续 Task 8 的 team 成员校验 —— 本任务 `teamId` 非空时**仅允许上传者自己的 teamId 暂存**，成员校验在 Task 8 用 `TeamService.assertMember` 补上。Task 6 若 teamId 非空只记录，读权限：上传者 或 isPublic；team 读权限 Task 8 打开。
- Produces: CRUD + multipart POST `/api/assets`

- [ ] **Step 1: AssetTypeRules 单测**

```java
AssetTypeRules.match("image", "a.png") -> true
AssetTypeRules.match("image", "a.exe") -> false
AssetTypeRules.match("video", "a.mp4") -> true
AssetTypeRules.match("font", "a.woff2") -> true
AssetTypeRules.match("audio", "a.mp3") -> true
```

允许扩展：image=`jpg,jpeg,png,webp,gif`；video=`mp4,webm`；font=`ttf,otf,woff2`；audio=`mp3,wav`。fileType 不在枚举 → 41500。

- [ ] **Step 2: 实现**

`POST /api/assets`：参数 `file` + `fileType` + 可选 `category,tags,isPublic,teamId`。上传 assets bucket。删：仅 uploader；先删 DB 再 `storage.delete`，对象删除失败只打日志。

`GET /api/assets`：`scope=mine|public|team`（默认 mine）。mine=uploader_id；public=is_public=1；team=team_id 等值（Task 8 再校验成员）。

- [ ] **Step 3: `mvn -q test` PASS 后 commit（可跳过）**

---

### Task 7: 作品 API

**Files:**
- Modify: Task 5 已有的 Work 实体/Mapper，补全字段与 CRUD
- Create: `src/main/java/com/design/platform/work/dto/*`
- Create: `src/main/java/com/design/platform/work/service/WorkAccess.java`
- Create: `src/main/java/com/design/platform/work/service/WorkService.java`
- Create: `src/main/java/com/design/platform/work/controller/WorkController.java`
- Create: `src/test/java/com/design/platform/work/WorkAccessTest.java`

**Interfaces:**
- Consumes: `TemplateMapper`；`StorageService`；Task 8 前 team 读权限先按「仅所有者」
- Produces:
  - `WorkAccess.canRead(work, user, isTeamMember)`
  - `WorkAccess.canWrite(work, user)` — **仅所有者**（规格：团队成员只读）
  - REST `/api/works`

- [ ] **Step 1: WorkAccess 单测**

- 所有者：读写
- 非所有者非成员：不可读
- 非所有者但是成员：只读
- 非所有者：不可写

`canRead(work, userId, isTeamMember)`；`canWrite(work, userId)`。

- [ ] **Step 2: 实现 WorkService**

`GET /api/works`：仅 `user_id = 当前用户`，可选 `status`。  
`GET /{id}`：`canRead`，Task 8 前 `isTeamMember=false`。  
`POST /`：可带 `templateId` 拷贝 json。  
`PUT /{id}`：所有者改 title/canvasJson/status/teamId。  
`DELETE /{id}`：所有者。  
`POST /{id}/publish`：status=PUBLISHED。  
`POST /{id}/thumbnail`：multipart 图 → works bucket。

WorkController 与 TemplateController `/use` 共用 WorkService.createFromTemplate。

- [ ] **Step 3: `mvn -q test` PASS 后 commit（可跳过）**

---

### Task 8: 团队空间

**Files:**
- Create: `src/main/java/com/design/platform/team/entity/Team.java`
- Create: `src/main/java/com/design/platform/team/entity/TeamMember.java`
- Create: `src/main/java/com/design/platform/team/mapper/TeamMapper.java`
- Create: `src/main/java/com/design/platform/team/mapper/TeamMemberMapper.java`
- Create: `src/main/java/com/design/platform/team/dto/*`
- Create: `src/main/java/com/design/platform/team/service/TeamAccess.java`
- Create: `src/main/java/com/design/platform/team/service/TeamService.java`
- Create: `src/main/java/com/design/platform/team/controller/TeamController.java`
- Create: `src/test/java/com/design/platform/team/TeamAccessTest.java`
- Modify: `AssetService` 读权限加入团队成员
- Modify: `WorkService.get` 传入 `TeamService.isMember(teamId, userId)`

**Interfaces:**
- Produces:
  - `boolean isMember(Long teamId, Long userId)`
  - `void assertMember(Long teamId, Long userId)`
  - `TeamAccess.canManageMembers(role)` — OWNER 或 ADMIN
  - `TeamAccess.canDeleteTeam(role)` — 仅 OWNER
  - 不能移除 OWNER；不能把 OWNER 改成 MEMBER（本期无转让接口）

- [ ] **Step 1: TeamAccess 单测**

`canManageMembers("OWNER")` true；`MEMBER` false。  
`canDeleteTeam("ADMIN")` false；`OWNER` true。  
`canRemoveMember(actorRole, targetRole)`：target 为 OWNER 时恒 false。

- [ ] **Step 2: 实现 API**

`POST /api/teams`：插入 team + team_member(OWNER)。  
`GET /api/teams`：当前用户加入的团队。  
`GET /{id}` 成员可见。  
`PUT /{id}` OWNER/ADMIN 改 name。  
`DELETE /{id}` 仅 OWNER；同时删 team_member（作品/素材的 team_id 置 null，避免悬空）。  
`POST /{id}/members`：`{userId}` 或 `{username}` 二选一。  
`DELETE /{id}/members/{userId}`。  
`GET /{id}/works` `GET /{id}/assets`。

- [ ] **Step 3: 回填 Work/Asset 的团队读权限后 `mvn -q test`**

- [ ] **Step 4: Commit（可跳过）**

---

### Task 9: 分享链接

**Files:**
- Create: `src/main/java/com/design/platform/share/entity/ShareLink.java`
- Create: `src/main/java/com/design/platform/share/mapper/ShareLinkMapper.java`
- Create: `src/main/java/com/design/platform/share/dto/*`
- Create: `src/main/java/com/design/platform/share/service/ShareExpiry.java`
- Create: `src/main/java/com/design/platform/share/service/ShareService.java`
- Create: `src/main/java/com/design/platform/share/controller/ShareController.java`
- Create: `src/test/java/com/design/platform/share/ShareExpiryTest.java`

**Interfaces:**
- Consumes: `WorkMapper`；`WorkAccess.canWrite` 创建分享时必须是作品所有者
- Produces:
  - `ShareExpiry.isExpired(expireAt, now)` — `expireAt==null` 永不过期
  - `POST /api/works/{workId}/shares` → `{id, token, url, permission, expireAt}`，url 为 `/api/shares/{token}`
  - token = 16 字节 `SecureRandom` 转 32 hex
  - GET token：过期 41000；返回作品只读视图（含 canvasJson）
  - PUT token：permission 必须 EDIT 否则 403；过期 410；可改 canvasJson、title
  - DELETE `/api/shares/{id}` 仅 created_by

- [ ] **Step 1: ShareExpiry 单测**

```java
assertFalse(ShareExpiry.isExpired(null, Instant.now()));
assertTrue(ShareExpiry.isExpired(Instant.now().minusSeconds(1), Instant.now()));
assertFalse(ShareExpiry.isExpired(Instant.now().plusSeconds(60), Instant.now()));
```

- [ ] **Step 2: 实现 ShareService + Controller**

创建分享校验：当前用户 == work.userId，否则 403。  
GET/PUT 走 Security 白名单，业务层处理过期与权限。

- [ ] **Step 3: `mvn -q test` PASS 后 commit（可跳过）**

---

### Task 10: 种子数据、README、启动验收

**Files:**
- Modify: `src/main/resources/db/data.sql`
- Create: `README.md`
- Create: `src/main/java/com/design/platform/config/DataSeedRunner.java`（若 data.sql 的 BCrypt 不便手写，用 Runner 幂等插入）

**Interfaces:**
- Consumes: 全部已有 Service / Mapper
- Produces: 可启动的本地环境与文档

- [ ] **Step 1: 幂等种子**

`DataSeedRunner` implements `ApplicationRunner`：
- 若不存在 username=`admin`，插入 BCrypt(`admin123`) role=ADMIN nickname=管理员
- 若不存在 `demo`，插入 BCrypt(`demo123`) role=USER
- 若 template 表为空，插入 4 条公开模板：
  - 主题海报 / 活动营销 / 小红书种草 / 公众号封面
  - `json_data` 统一：`{"width":1080,"height":1440,"elements":[]}`
  - author_id = admin 的 id
  - tags 各给 1–2 个中文标签

不要把明文密码写进可被日志打印的 debug。

`data.sql` 保持空或删除 `data-locations`（避免和 Runner 重复）。**删除 application.yml 里的 `data-locations`**，只保留 schema.sql。

- [ ] **Step 2: README.md**

必须包含：
1. 技术栈与 JDK 21 要求
2. `docker compose up -d`
3. `mvn spring-boot:run`
4. 账号 admin/admin123、demo/demo123
5. Knife4j：http://localhost:8080/doc.html
6. MinIO 控制台：http://localhost:9001
7. 主要 API 列表（指向规格文档路径）

- [ ] **Step 3: 本地验收（有 Docker 时）**

```bash
docker compose up -d
mvn -q test
mvn spring-boot:run
```

用 curl 或 Knife4j 验证规格第 11 节 7 条完成标准。无 Docker 时至少 `mvn -q test` 全绿。

- [ ] **Step 4: Commit（可跳过）**

```bash
git commit -m "feat: 种子数据与后端 README"
```

---

## Spec coverage（自检）

| 规格章节 | 任务 |
|---|---|
| 技术栈 / 工程结构 | Task 1 |
| 六张表 DDL | Task 1 schema.sql |
| Result / 错误码 / 异常 | Task 1 |
| JWT / Redis 黑名单 / Security 白名单 | Task 2–3 |
| User API | Task 3 |
| MinIO 三 bucket | Task 4 |
| Template API + /use + 浏览量 | Task 5 |
| Asset 上传类型限制 | Task 6 |
| Work CRUD / publish / thumbnail | Task 7 |
| Team 关联表与共享 | Task 8 |
| Share token / 过期 410 / EDIT | Task 9 |
| docker-compose / 种子 / Knife4j / README | Task 1 + 10 |
| 团队成员对作品只读 | Task 7 WorkAccess + Task 8 |
| 不解析画布 JSON | 全程 |

无 TBD。类型名统一：`AuthUser` `JwtPayload` `StoredObject` `PageData` `BizException` `ErrorCode`。
