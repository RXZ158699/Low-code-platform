package com.design.platform.share.controller;

import com.design.platform.common.api.Result;
import com.design.platform.security.SecurityUtils;
import com.design.platform.share.dto.ShareCreateRequest;
import com.design.platform.share.dto.ShareUpdateRequest;
import com.design.platform.share.dto.ShareVO;
import com.design.platform.share.service.ShareService;
import com.design.platform.work.dto.WorkVO;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class ShareController {

    private final ShareService shareService;

    public ShareController(ShareService shareService) {
        this.shareService = shareService;
    }

    @PostMapping("/api/works/{workId}/shares")
    public Result<ShareVO> create(@PathVariable Long workId, @RequestBody(required = false) ShareCreateRequest request) {
        return Result.ok(shareService.create(workId, request, SecurityUtils.requireUser()));
    }

    @GetMapping("/api/shares/{token}")
    public Result<WorkVO> getByToken(@PathVariable String token) {
        return Result.ok(shareService.getByToken(token));
    }

    @PutMapping("/api/shares/{token}")
    public Result<WorkVO> updateByToken(
            @PathVariable String token,
            @RequestBody(required = false) ShareUpdateRequest request) {
        return Result.ok(shareService.updateByToken(token, request));
    }

    @DeleteMapping("/api/shares/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        shareService.delete(id, SecurityUtils.requireUser());
        return Result.ok();
    }
}
