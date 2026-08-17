package com.design.platform.work.dto;

public record WorkCreateRequest(
        Long templateId,
        String title,
        String canvasJson,
        Long teamId
) {
}
