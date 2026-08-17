package com.design.platform.template.controller;

import com.design.platform.common.api.PageData;
import com.design.platform.common.api.Result;
import com.design.platform.security.SecurityUtils;
import com.design.platform.template.dto.TemplateCreateRequest;
import com.design.platform.template.dto.TemplateQuery;
import com.design.platform.template.dto.TemplateUpdateRequest;
import com.design.platform.template.dto.TemplateVO;
import com.design.platform.template.service.TemplateService;
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
@RequestMapping("/api/templates")
public class TemplateController {

    private final TemplateService templateService;
    private final WorkService workService;

    public TemplateController(TemplateService templateService, WorkService workService) {
        this.templateService = templateService;
        this.workService = workService;
    }

    @GetMapping
    public Result<PageData<TemplateVO>> list(TemplateQuery query) {
        return Result.ok(templateService.list(query, SecurityUtils.currentUserOrNull()));
    }

    @GetMapping("/{id}")
    public Result<TemplateVO> get(@PathVariable Long id) {
        return Result.ok(templateService.get(id, SecurityUtils.currentUserOrNull()));
    }

    @PostMapping
    public Result<TemplateVO> create(@RequestBody TemplateCreateRequest request) {
        return Result.ok(templateService.create(request, SecurityUtils.requireUser()));
    }

    @PutMapping("/{id}")
    public Result<TemplateVO> update(@PathVariable Long id, @RequestBody TemplateUpdateRequest request) {
        return Result.ok(templateService.update(id, request, SecurityUtils.requireUser()));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        templateService.delete(id, SecurityUtils.requireUser());
        return Result.ok();
    }

    @PostMapping("/{id}/cover")
    public Result<TemplateVO> uploadCover(@PathVariable Long id, @RequestParam("file") MultipartFile file) {
        return Result.ok(templateService.uploadCover(id, file, SecurityUtils.requireUser()));
    }

    @PostMapping("/{id}/use")
    public Result<WorkVO> use(@PathVariable Long id) {
        return Result.ok(workService.createFromTemplate(id, SecurityUtils.requireUser()));
    }
}
