package com.design.platform.user.dto;

import com.design.platform.user.entity.User;

import java.time.LocalDateTime;

public record UserVO(
        Long id,
        String username,
        String nickname,
        String avatar,
        String role,
        LocalDateTime createdAt
) {
    public static UserVO from(User user) {
        return new UserVO(
                user.getId(),
                user.getUsername(),
                user.getNickname(),
                user.getAvatar(),
                user.getRole(),
                user.getCreatedAt()
        );
    }
}
