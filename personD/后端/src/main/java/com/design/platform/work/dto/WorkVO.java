package com.design.platform.work.dto;

import java.time.LocalDateTime;

public record WorkVO(
        Long id,
        Long userId,
        Long templateId,
        String title,
        String status,
        Long teamId,
        String canvasJson,
        String thumbnailUrl,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
