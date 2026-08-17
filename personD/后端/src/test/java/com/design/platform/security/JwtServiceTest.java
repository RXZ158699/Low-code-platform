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
