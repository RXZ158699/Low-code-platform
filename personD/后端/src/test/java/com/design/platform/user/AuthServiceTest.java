package com.design.platform.user;

import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.JwtPayload;
import com.design.platform.security.JwtService;
import com.design.platform.user.dto.LoginRequest;
import com.design.platform.user.dto.LoginResponse;
import com.design.platform.user.dto.RegisterRequest;
import com.design.platform.user.dto.UserVO;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import com.design.platform.user.service.AuthService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.lang.reflect.Proxy;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceTest {

    private UserMapper userMapper;
    private PasswordEncoder passwordEncoder;
    private StubJwtService jwtService;
    private FakeStringRedisTemplate redis;
    private AuthService authService;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        passwordEncoder = mock(PasswordEncoder.class);
        jwtService = new StubJwtService();
        redis = new FakeStringRedisTemplate();
        authService = new AuthService(userMapper, passwordEncoder, jwtService, redis, 7);
    }

    @Test
    void registerRejectsInvalidUsername() {
        BizException ex = assertThrows(BizException.class,
                () -> authService.register(new RegisterRequest("ab", "123456", "nick")));
        assertEquals(ErrorCode.BAD_REQUEST, ex.getErrorCode());
    }

    @Test
    void registerConflictWhenUsernameExists() {
        when(userMapper.selectCount(any())).thenReturn(1L);
        BizException ex = assertThrows(BizException.class,
                () -> authService.register(new RegisterRequest("abc", "123456", "nick")));
        assertEquals(ErrorCode.CONFLICT, ex.getErrorCode());
        assertEquals("用户名已存在", ex.getMessage());
    }

    @Test
    void registerEncodesPasswordAndSetsUserRole() {
        when(userMapper.selectCount(any())).thenReturn(0L);
        when(passwordEncoder.encode("123456")).thenReturn("hashed");
        when(userMapper.insert(any(User.class))).thenAnswer(invocation -> {
            User user = invocation.getArgument(0);
            user.setId(9L);
            return 1;
        });

        UserVO vo = authService.register(new RegisterRequest("abc", "123456", "nick"));
        assertEquals(9L, vo.id());
        assertEquals("abc", vo.username());
        assertEquals("nick", vo.nickname());
        assertEquals("USER", vo.role());
        verify(passwordEncoder).encode("123456");
    }

    @Test
    void loginFailsWhenUserMissing() {
        when(userMapper.selectOne(any())).thenReturn(null);
        BizException ex = assertThrows(BizException.class,
                () -> authService.login(new LoginRequest("abc", "123456")));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        assertEquals("用户名或密码错误", ex.getMessage());
    }

    @Test
    void loginFailsWhenPasswordMismatch() {
        User user = new User();
        user.setUsername("abc");
        user.setPassword("hashed");
        when(userMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("bad", "hashed")).thenReturn(false);
        BizException ex = assertThrows(BizException.class,
                () -> authService.login(new LoginRequest("abc", "bad")));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        assertEquals("用户名或密码错误", ex.getMessage());
    }

    @Test
    void loginIssuesTokenWithExpireDaysSeconds() {
        User user = new User();
        user.setId(3L);
        user.setUsername("abc");
        user.setPassword("hashed");
        user.setNickname("nick");
        user.setRole("USER");
        when(userMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("123456", "hashed")).thenReturn(true);

        LoginResponse response = authService.login(new LoginRequest("abc", "123456"));
        assertEquals("issued-token", response.token());
        assertEquals(7 * 86400L, response.expiresInSeconds());
        assertEquals("abc", response.user().username());
        assertEquals(3L, jwtService.lastIssuedUserId);
        assertEquals("abc", jwtService.lastIssuedUsername);
        assertEquals("USER", jwtService.lastIssuedRole);
    }

    @Test
    void logoutBlankTokenUnauthorized() {
        BizException ex = assertThrows(BizException.class, () -> authService.logout("  "));
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
        assertTrue(redis.store.isEmpty());
    }

    @Test
    void logoutSkipsRedisWhenTtlNonPositive() {
        jwtService.payload = new JwtPayload(1L, "abc", "USER", "jti-1", Instant.now().minusSeconds(1));
        authService.logout("tok");
        assertTrue(redis.store.isEmpty());
        assertNull(redis.lastTtl);
    }

    @Test
    void logoutWritesBlacklistWithRemainingTtl() {
        jwtService.payload = new JwtPayload(1L, "abc", "USER", "jti-1", Instant.now().plusSeconds(120));
        authService.logout("tok");
        assertEquals("1", redis.store.get("auth:blacklist:jti-1"));
        assertTrue(redis.lastTtl.getSeconds() > 0);
        assertTrue(redis.lastTtl.getSeconds() <= 120);
    }

    static final class StubJwtService extends JwtService {
        JwtPayload payload;
        Long lastIssuedUserId;
        String lastIssuedUsername;
        String lastIssuedRole;

        StubJwtService() {
            super("test-secret-key-must-be-long-enough-32", Duration.ofHours(1));
        }

        @Override
        public String issue(Long userId, String username, String role) {
            lastIssuedUserId = userId;
            lastIssuedUsername = username;
            lastIssuedRole = role;
            return "issued-token";
        }

        @Override
        public JwtPayload parse(String token) {
            if (payload != null) {
                return payload;
            }
            return super.parse(token);
        }
    }

    static final class FakeStringRedisTemplate extends StringRedisTemplate {
        final Map<String, String> store = new HashMap<>();
        Duration lastTtl;

        @Override
        @SuppressWarnings("unchecked")
        public ValueOperations<String, String> opsForValue() {
            return (ValueOperations<String, String>) Proxy.newProxyInstance(
                    ValueOperations.class.getClassLoader(),
                    new Class<?>[]{ValueOperations.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "get" -> store.get((String) args[0]);
                        case "set" -> {
                            store.put((String) args[0], (String) args[1]);
                            if (args.length >= 3 && args[2] instanceof Duration duration) {
                                lastTtl = duration;
                            }
                            yield null;
                        }
                        default -> throw new UnsupportedOperationException(method.getName());
                    });
        }
    }
}
