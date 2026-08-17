package com.design.platform.user.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.design.platform.common.api.PageData;
import com.design.platform.common.api.Result;
import com.design.platform.security.SecurityUtils;
import com.design.platform.user.dto.UserVO;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
public class AdminUserController {

    private final UserMapper userMapper;

    public AdminUserController(UserMapper userMapper) {
        this.userMapper = userMapper;
    }

    @GetMapping
    public Result<PageData<UserVO>> list(
            @RequestParam(defaultValue = "1") long page,
            @RequestParam(defaultValue = "12") long size) {
        SecurityUtils.requireAdmin();
        if (page < 1) {
            page = 1;
        }
        if (size < 1) {
            size = 12;
        }
        if (size > 50) {
            size = 50;
        }
        Page<User> mpPage = userMapper.selectPage(
                new Page<>(page, size),
                new LambdaQueryWrapper<User>().orderByDesc(User::getCreatedAt));
        List<UserVO> records = mpPage.getRecords().stream().map(UserVO::from).toList();
        return Result.ok(PageData.of(mpPage.getTotal(), mpPage.getCurrent(), mpPage.getSize(), records));
    }
}
