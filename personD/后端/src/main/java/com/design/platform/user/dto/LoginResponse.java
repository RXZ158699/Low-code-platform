package com.design.platform.user.dto;

public record LoginResponse(String token, long expiresInSeconds, UserVO user) {
}
