package com.design.platform.user.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.security.JwtPayload;
import com.design.platform.security.JwtService;
import com.design.platform.security.SecurityUtils;
import com.design.platform.user.dto.LoginRequest;
import com.design.platform.user.dto.LoginResponse;
import com.design.platform.user.dto.RegisterRequest;
import com.design.platform.user.dto.UserVO;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

@Service
public class AuthService {

    public static final String BLACKLIST_KEY_PREFIX = "auth:blacklist:";

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final StringRedisTemplate stringRedisTemplate;
    private final long expireDays;

    public AuthService(
            UserMapper userMapper,
            PasswordEncoder passwordEncoder,
            JwtService jwtService,
            StringRedisTemplate stringRedisTemplate,
            @Value("${app.jwt.expire-days}") long expireDays) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.stringRedisTemplate = stringRedisTemplate;
        this.expireDays = expireDays;
    }

    public UserVO register(RegisterRequest request) {
        if (request == null
                || !AuthRules.validUsername(request.username())
                || !AuthRules.validPassword(request.password())
                || request.nickname() == null
                || request.nickname().isBlank()
                || request.nickname().length() > 32) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        Long exists = userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getUsername, request.username()));
        if (exists != null && exists > 0) {
            throw new BizException(ErrorCode.CONFLICT, "用户名已存在");
        }
        User user = new User();
        user.setUsername(request.username());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setNickname(request.nickname());
        user.setRole("USER");
        userMapper.insert(user);
        return UserVO.from(user);
    }

    public LoginResponse login(LoginRequest request) {
        if (request == null || request.username() == null || request.password() == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "用户名或密码错误");
        }
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getUsername, request.username()));
        if (user == null || !passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new BizException(ErrorCode.UNAUTHORIZED, "用户名或密码错误");
        }
        String token = jwtService.issue(user.getId(), user.getUsername(), user.getRole());
        long expiresInSeconds = expireDays * 86400L;
        return new LoginResponse(token, expiresInSeconds, UserVO.from(user));
    }

    public void logout(String token) {
        if (token == null || token.isBlank()) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        JwtPayload payload = jwtService.parse(token);
        Duration ttl = Duration.between(Instant.now(), payload.expireAt());
        if (ttl.isZero() || ttl.isNegative()) {
            return;
        }
        stringRedisTemplate.opsForValue().set(BLACKLIST_KEY_PREFIX + payload.jti(), "1", ttl);
    }

    public UserVO me() {
        AuthUser current = SecurityUtils.requireUser();
        User user = userMapper.selectById(current.id());
        if (user == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        return UserVO.from(user);
    }
}
