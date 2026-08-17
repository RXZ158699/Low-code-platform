package com.design.platform.security;

import java.time.Instant;

public record JwtPayload(Long userId, String username, String role, String jti, Instant expireAt) {
}
