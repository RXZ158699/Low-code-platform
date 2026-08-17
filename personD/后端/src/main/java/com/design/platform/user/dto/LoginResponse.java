package com.design.platform.user.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record LoginResponse(
        String token,
        @JsonProperty("expiresIn") long expiresInSeconds,
        UserVO user) {
}
