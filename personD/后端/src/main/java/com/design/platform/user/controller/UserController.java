package com.design.platform.user.controller;

import com.design.platform.common.api.Result;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.security.SecurityUtils;
import com.design.platform.user.dto.UpdateProfileRequest;
import com.design.platform.user.dto.UserVO;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final UserMapper userMapper;

    public UserController(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @PutMapping("/me")
    public Result<UserVO> updateMe(@RequestBody UpdateProfileRequest request) {
        AuthUser current = SecurityUtils.requireUser();
        User user = userMapper.selectById(current.id());
        if (user == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        if (request != null && request.nickname() != null) {
            if (request.nickname().isBlank() || request.nickname().length() > 32) {
                throw new BizException(ErrorCode.BAD_REQUEST);
            }
            user.setNickname(request.nickname());
        }
        if (request != null && request.avatar() != null) {
            user.setAvatar(request.avatar());
        }
        userMapper.updateById(user);
        return Result.ok(UserVO.from(user));
    }

    @GetMapping("/{id}")
    public Result<UserVO> getById(@PathVariable Long id) {
        SecurityUtils.requireUser();
        User user = userMapper.selectById(id);
        if (user == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return Result.ok(UserVO.from(user));
    }
}
