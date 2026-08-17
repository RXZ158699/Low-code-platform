package com.design.platform.asset.dto;

import java.time.LocalDateTime;
import java.util.List;

public record AssetVO(
        Long id,
        String fileName,
        String fileType,
        String url,
        Long uploaderId,
        Long teamId,
        String category,
        List<String> tags,
        Boolean isPublic,
        LocalDateTime createdAt
) {
}
