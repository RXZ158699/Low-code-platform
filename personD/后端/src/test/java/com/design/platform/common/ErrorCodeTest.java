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
