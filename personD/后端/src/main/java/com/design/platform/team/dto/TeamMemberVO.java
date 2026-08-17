package com.design.platform.team.dto;

import java.time.LocalDateTime;

public record TeamMemberVO(
        Long id,
        Long teamId,
        Long userId,
        String username,
        String nickname,
        String role,
        LocalDateTime joinedAt
) {
}
