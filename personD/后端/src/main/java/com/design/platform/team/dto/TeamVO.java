package com.design.platform.team.dto;

import java.time.LocalDateTime;

public record TeamVO(
        Long id,
        String name,
        Long ownerId,
        String myRole,
        LocalDateTime createdAt
) {
}
