package com.design.platform.user;

import com.design.platform.user.service.AuthRules;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

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

    @Test
    void usernameRejectsInvalidCharsAndLength() {
        assertFalse(AuthRules.validUsername(null));
        assertFalse(AuthRules.validUsername("ab-c"));
        assertFalse(AuthRules.validUsername("ab c"));
        assertTrue(AuthRules.validUsername("a_1"));
        assertTrue(AuthRules.validUsername("a".repeat(32)));
        assertFalse(AuthRules.validUsername("a".repeat(33)));
    }

    @Test
    void passwordRejectsNullAndTooLong() {
        assertFalse(AuthRules.validPassword(null));
        assertTrue(AuthRules.validPassword("x".repeat(32)));
        assertFalse(AuthRules.validPassword("x".repeat(33)));
    }
}
