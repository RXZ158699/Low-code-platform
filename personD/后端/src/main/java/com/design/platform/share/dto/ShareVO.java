package com.design.platform.share.dto;

import java.time.Instant;

public record ShareVO(
        Long id,
        String token,
        String url,
        String permission,
        Instant expireAt
) {
}
