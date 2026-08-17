package com.design.platform.storage;

import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ObjectKeyTest {

    @Test
    void ofLowercasesExtensionAndFormatsDateUuid() {
        String key = ObjectKeys.of("A.PNG", LocalDate.of(2026, 8, 17), "abc");
        assertEquals("2026/08/abc.png", key);
    }
}
