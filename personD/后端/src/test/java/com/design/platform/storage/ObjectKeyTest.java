package com.design.platform.storage;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ObjectKeyTest {

    @Test
    void ofLowercasesExtensionAndFormatsDateUuid() {
        String key = ObjectKeys.of("A.PNG", LocalDate.of(2026, 8, 17), "abc");
        assertEquals("2026/08/abc.png", key);
    }

    @Test
    void ofNullFilenameUsesEmptyExtension() {
        String key = ObjectKeys.of(null, LocalDate.of(2026, 8, 17), "abc");
        assertEquals("2026/08/abc", key);
    }

    @Test
    void publicReadPolicyAllowsGetObject() {
        String policy = StorageService.publicReadPolicy("works");
        assertTrue(policy.contains("s3:GetObject"));
        assertTrue(policy.contains("arn:aws:s3:::works/*"));
    }
}
