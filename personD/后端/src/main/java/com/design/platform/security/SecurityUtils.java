package com.design.platform.security;

import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    public static AuthUser requireUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof AuthUser authUser)) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
        return authUser;
    }

    public static AuthUser requireAdmin() {
        AuthUser user = requireUser();
        if (!"ADMIN".equals(user.role())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        return user;
    }

    public static String extractBearerToken(String authorization) {
        if (authorization == null || authorization.isBlank()) {
            return null;
        }
        if (authorization.regionMatches(true, 0, "Bearer ", 0, 7)) {
            String token = authorization.substring(7).trim();
            return token.isEmpty() ? null : token;
        }
        return null;
    }
}
