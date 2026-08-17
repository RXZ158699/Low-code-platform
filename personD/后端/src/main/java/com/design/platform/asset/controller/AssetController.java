package com.design.platform.asset.controller;

import com.design.platform.asset.dto.AssetQuery;
import com.design.platform.asset.dto.AssetUpdateRequest;
import com.design.platform.asset.dto.AssetVO;
import com.design.platform.asset.service.AssetService;
import com.design.platform.common.api.PageData;
import com.design.platform.common.api.Result;
import com.design.platform.security.SecurityUtils;
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

import java.util.List;

@RestController
@RequestMapping("/api/assets")
public class AssetController {

    private final AssetService assetService;

    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    @GetMapping
    public Result<PageData<AssetVO>> list(AssetQuery query) {
        return Result.ok(assetService.list(query, SecurityUtils.requireUser()));
    }

    @GetMapping("/{id}")
    public Result<AssetVO> get(@PathVariable Long id) {
        return Result.ok(assetService.get(id, SecurityUtils.requireUser()));
    }

    @PostMapping
    public Result<AssetVO> upload(
            @RequestParam("file") MultipartFile file,
            @RequestParam("fileType") String fileType,
            @RequestParam(value = "category", required = false) String category,
            @RequestParam(value = "tags", required = false) List<String> tags,
            @RequestParam(value = "isPublic", required = false) Boolean isPublic,
            @RequestParam(value = "teamId", required = false) Long teamId) {
        return Result.ok(assetService.upload(
                file, fileType, category, tags, isPublic, teamId, SecurityUtils.requireUser()));
    }

    @PutMapping("/{id}")
    public Result<AssetVO> update(@PathVariable Long id, @RequestBody AssetUpdateRequest request) {
        return Result.ok(assetService.update(id, request, SecurityUtils.requireUser()));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        assetService.delete(id, SecurityUtils.requireUser());
        return Result.ok();
    }
}
