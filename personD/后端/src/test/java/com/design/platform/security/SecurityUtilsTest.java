package com.design.platform.security;

import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class SecurityUtilsTest {

    @AfterEach
    void clear() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void requireUserThrowsWhenAnonymous() {
        BizException ex = assertThrows(BizException.class, SecurityUtils::requireUser);
        assertEquals(ErrorCode.UNAUTHORIZED, ex.getErrorCode());
    }

    @Test
    void requireAdminThrowsForbiddenForUserRole() {
        AuthUser user = new AuthUser(1L, "alice", "USER");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(user, null, user.getAuthorities()));
        BizException ex = assertThrows(BizException.class, SecurityUtils::requireAdmin);
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void requireAdminReturnsAdmin() {
        AuthUser admin = new AuthUser(2L, "root", "ADMIN");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(admin, null, admin.getAuthorities()));
        assertEquals(admin, SecurityUtils.requireAdmin());
    }

    @Test
    void extractBearerToken() {
        assertNull(SecurityUtils.extractBearerToken(null));
        assertNull(SecurityUtils.extractBearerToken(""));
        assertNull(SecurityUtils.extractBearerToken("Basic abc"));
        assertEquals("tok", SecurityUtils.extractBearerToken("Bearer tok"));
        assertEquals("tok", SecurityUtils.extractBearerToken("Bearer  tok"));
    }

    @Test
    void authUserExposesRoleAuthority() {
        AuthUser user = new AuthUser(1L, "alice", "ADMIN");
        assertEquals("ROLE_ADMIN", user.getAuthorities().iterator().next().getAuthority());
        assertEquals("", user.getPassword());
        assertEquals("alice", user.getUsername());
        assertEquals(true, user.isEnabled());
        assertEquals(true, user.isAccountNonExpired());
        assertEquals(true, user.isAccountNonLocked());
        assertEquals(true, user.isCredentialsNonExpired());
    }
}
