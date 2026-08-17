package com.design.platform.share;

import com.design.platform.share.service.ShareExpiry;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ShareExpiryTest {

    @Test
    void nullExpireAtNeverExpires() {
        assertFalse(ShareExpiry.isExpired(null, Instant.now()));
    }

    @Test
    void pastExpireAtIsExpired() {
        assertTrue(ShareExpiry.isExpired(Instant.now().minusSeconds(1), Instant.now()));
    }

    @Test
    void futureExpireAtIsNotExpired() {
        assertFalse(ShareExpiry.isExpired(Instant.now().plusSeconds(60), Instant.now()));
    }
}
