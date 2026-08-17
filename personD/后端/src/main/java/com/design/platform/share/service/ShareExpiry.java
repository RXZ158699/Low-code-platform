package com.design.platform.share.service;

import java.time.Instant;

public final class ShareExpiry {

    private ShareExpiry() {
    }

    /**
     * @param expireAt null means never expires
     */
    public static boolean isExpired(Instant expireAt, Instant now) {
        if (expireAt == null) {
            return false;
        }
        return !expireAt.isAfter(now);
    }
}
