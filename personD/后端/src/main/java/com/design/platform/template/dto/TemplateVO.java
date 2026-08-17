package com.design.platform.template.dto;

import java.time.LocalDateTime;
import java.util.List;

public record TemplateVO(
        Long id,
        String title,
        String category,
        String coverImageUrl,
        List<String> previewImages,
        String jsonData,
        List<String> tags,
        Long authorId,
        String authorNickname,
        Boolean isPublic,
        Long viewCount,
        Long downloadCount,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
