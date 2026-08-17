package com.design.platform.asset.dto;

import java.util.List;

public record AssetUpdateRequest(
        String category,
        List<String> tags,
        Boolean isPublic,
        Long teamId
) {
}
