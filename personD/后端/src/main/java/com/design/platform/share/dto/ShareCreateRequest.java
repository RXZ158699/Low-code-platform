package com.design.platform.share.dto;

import java.time.Instant;

public record ShareCreateRequest(
        Instant expireAt,
        String permission
) {
}
