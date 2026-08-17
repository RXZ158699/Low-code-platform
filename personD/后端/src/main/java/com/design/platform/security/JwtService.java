package com.design.platform.security;

import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration ttl;

    public JwtService(String secret, Duration ttl) {
        this.key = Keys.hmacShaKeyFor(toKeyBytes(secret));
        this.ttl = ttl;
    }

    @Autowired
    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.expire-days}") long expireDays) {
        this(secret, Duration.ofDays(expireDays));
    }

    public String issue(Long userId, String username, String role) {
        Instant now = Instant.now();
        Instant expireAt = now.plus(ttl);
        String jti = UUID.randomUUID().toString();
        return Jwts.builder()
                .id(jti)
                .subject(String.valueOf(userId))
                .claim("uid", userId)
                .claim("username", username)
                .claim("role", role)
                .issuedAt(Date.from(now))
                .expiration(Date.from(expireAt))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public JwtPayload parse(String token) {
        try {
            Claims claims = Jwts.parser()
                    .verifyWith(key)
                    .sig()
                    .remove(Jwts.SIG.HS384)
                    .remove(Jwts.SIG.HS512)
                    .and()
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            Long userId = readUserId(claims);
            return new JwtPayload(
                    userId,
                    claims.get("username", String.class),
                    claims.get("role", String.class),
                    claims.getId(),
                    claims.getExpiration().toInstant()
            );
        } catch (JwtException | IllegalArgumentException ex) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
    }

    private static Long readUserId(Claims claims) {
        Object uid = claims.get("uid");
        if (uid instanceof Number number) {
            return number.longValue();
        }
        if (claims.getSubject() != null) {
            return Long.valueOf(claims.getSubject());
        }
        return null;
    }

    private static byte[] toKeyBytes(String secret) {
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length >= 32) {
            return bytes;
        }
        try {
            return MessageDigest.getInstance("SHA-256").digest(bytes);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 not available", e);
        }
    }
}
