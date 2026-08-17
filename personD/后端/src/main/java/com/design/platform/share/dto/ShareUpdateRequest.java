package com.design.platform.share.dto;

public record ShareUpdateRequest(
        String title,
        String canvasJson
) {
}
