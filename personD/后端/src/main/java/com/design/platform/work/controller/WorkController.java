package com.design.platform.work.controller;

import com.design.platform.common.api.PageData;
import com.design.platform.common.api.Result;
import com.design.platform.security.SecurityUtils;
import com.design.platform.work.dto.WorkCreateRequest;
import com.design.platform.work.dto.WorkQuery;
import com.design.platform.work.dto.WorkUpdateRequest;
import com.design.platform.work.dto.WorkVO;
import com.design.platform.work.service.WorkService;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/works")
public class WorkController {

    private final WorkService workService;

    public WorkController(WorkService workService) {
        this.workService = workService;
    }

    @GetMapping
    public Result<PageData<WorkVO>> list(WorkQuery query) {
        return Result.ok(workService.list(query, SecurityUtils.requireUser()));
    }

    @GetMapping("/{id}")
    public Result<WorkVO> get(@PathVariable Long id) {
        return Result.ok(workService.get(id, SecurityUtils.requireUser(), false));
    }

    @PostMapping
    public Result<WorkVO> create(@RequestBody(required = false) WorkCreateRequest request) {
        return Result.ok(workService.create(request, SecurityUtils.requireUser()));
    }

    @PutMapping("/{id}")
    public Result<WorkVO> update(@PathVariable Long id, @RequestBody WorkUpdateRequest request) {
        return Result.ok(workService.update(id, request, SecurityUtils.requireUser()));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        workService.delete(id, SecurityUtils.requireUser());
        return Result.ok();
    }

    @PostMapping("/{id}/publish")
    public Result<WorkVO> publish(@PathVariable Long id) {
        return Result.ok(workService.publish(id, SecurityUtils.requireUser()));
    }

    @PostMapping("/{id}/thumbnail")
    public Result<WorkVO> uploadThumbnail(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return Result.ok(workService.uploadThumbnail(id, file, SecurityUtils.requireUser()));
    }
}
