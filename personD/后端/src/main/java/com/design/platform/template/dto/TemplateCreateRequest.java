package com.design.platform.template.dto;

import java.util.List;

public record TemplateCreateRequest(
        String title,
        String category,
        String coverImageUrl,
        List<String> previewImages,
        String jsonData,
        List<String> tags,
        Boolean isPublic
) {
}
