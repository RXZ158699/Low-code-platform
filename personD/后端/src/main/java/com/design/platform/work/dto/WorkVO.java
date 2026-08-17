package com.design.platform.work.dto;

public record WorkVO(
        Long id,
        Long userId,
        Long templateId,
        String title,
        String status
) {
}
