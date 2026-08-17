package com.design.platform.work.dto;

public record WorkUpdateRequest(
        String title,
        String canvasJson,
        String status,
        Long teamId
) {
}
