package com.design.platform.asset.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.design.platform.asset.dto.AssetQuery;
import com.design.platform.asset.dto.AssetUpdateRequest;
import com.design.platform.asset.dto.AssetVO;
import com.design.platform.asset.entity.Asset;
import com.design.platform.asset.mapper.AssetMapper;
import com.design.platform.common.api.PageData;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.storage.StorageService;
import com.design.platform.storage.StoredObject;
import com.design.platform.team.service.TeamService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Service
public class AssetService {

    private static final Logger log = LoggerFactory.getLogger(AssetService.class);

    private final AssetMapper assetMapper;
    private final StorageService storageService;
    private final TeamService teamService;
    private final String assetsBucket;

    public AssetService(
            AssetMapper assetMapper,
            StorageService storageService,
            TeamService teamService,
            @Value("${app.minio.buckets.assets}") String assetsBucket) {
        this.assetMapper = assetMapper;
        this.storageService = storageService;
        this.teamService = teamService;
        this.assetsBucket = assetsBucket;
    }

    public PageData<AssetVO> list(AssetQuery query, AuthUser user) {
        requireLogin(user);
        if (query == null) {
            query = new AssetQuery();
        }

        Page<Asset> mpPage = new Page<>(query.getPage(), query.getSize());
        LambdaQueryWrapper<Asset> wrapper = new LambdaQueryWrapper<>();
        String scope = query.getScope().trim().toLowerCase(Locale.ROOT);
        switch (scope) {
            case "mine" -> wrapper.eq(Asset::getUploaderId, user.id());
            case "public" -> wrapper.eq(Asset::getIsPublic, true);
            case "team" -> {
                if (query.getTeamId() == null) {
                    throw new BizException(ErrorCode.BAD_REQUEST);
                }
                teamService.assertMember(query.getTeamId(), user.id());
                wrapper.eq(Asset::getTeamId, query.getTeamId());
            }
            default -> throw new BizException(ErrorCode.BAD_REQUEST);
        }
        if (hasText(query.getFileType())) {
            wrapper.eq(Asset::getFileType, query.getFileType().trim().toLowerCase(Locale.ROOT));
        }
        if (hasText(query.getCategory())) {
            wrapper.eq(Asset::getCategory, query.getCategory());
        }
        if (hasText(query.getKeyword())) {
            wrapper.like(Asset::getFileName, query.getKeyword());
        }
        wrapper.orderByDesc(Asset::getCreatedAt);

        Page<Asset> result = assetMapper.selectPage(mpPage, wrapper);
        List<AssetVO> records = result.getRecords().stream().map(this::toVo).toList();
        return PageData.of(result.getTotal(), result.getCurrent(), result.getSize(), records);
    }

    public AssetVO get(Long id, AuthUser user) {
        requireLogin(user);
        Asset asset = requireAsset(id);
        if (!canRead(asset, user)) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        return toVo(asset);
    }

    public AssetVO upload(
            MultipartFile file,
            String fileType,
            String category,
            List<String> tags,
            Boolean isPublic,
            Long teamId,
            AuthUser user) {
        requireLogin(user);
        if (file == null || file.isEmpty()) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        if (!hasText(fileType)) {
            throw new BizException(ErrorCode.UNSUPPORTED_TYPE);
        }
        String normalizedType = fileType.trim().toLowerCase(Locale.ROOT);
        if (!AssetTypeRules.match(normalizedType, file.getOriginalFilename())) {
            throw new BizException(ErrorCode.UNSUPPORTED_TYPE);
        }
        if (category != null && category.length() > 32) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        if (teamId != null) {
            teamService.assertMember(teamId, user.id());
        }

        StoredObject stored;
        try (InputStream in = file.getInputStream()) {
            stored = storageService.upload(
                    assetsBucket,
                    file.getOriginalFilename(),
                    file.getContentType(),
                    in,
                    file.getSize());
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException(ErrorCode.INTERNAL, "文件上传失败");
        }

        Asset asset = new Asset();
        asset.setFileName(file.getOriginalFilename());
        asset.setFileType(normalizedType);
        asset.setUrl(stored.url());
        asset.setObjectKey(stored.objectKey());
        asset.setUploaderId(user.id());
        asset.setTeamId(teamId);
        asset.setCategory(category);
        asset.setTags(normalizeTags(tags));
        asset.setIsPublic(isPublic != null && isPublic);
        assetMapper.insert(asset);
        return toVo(asset);
    }

    public AssetVO update(Long id, AssetUpdateRequest request, AuthUser user) {
        requireLogin(user);
        Asset asset = requireUploader(id, user);
        if (request == null) {
            return toVo(asset);
        }
        if (request.category() != null) {
            if (request.category().length() > 32) {
                throw new BizException(ErrorCode.BAD_REQUEST);
            }
            asset.setCategory(request.category());
        }
        if (request.tags() != null) {
            asset.setTags(normalizeTags(request.tags()));
        }
        if (request.isPublic() != null) {
            asset.setIsPublic(request.isPublic());
        }
        if (request.teamId() != null) {
            asset.setTeamId(request.teamId());
        }
        assetMapper.updateById(asset);
        return toVo(asset);
    }

    public void delete(Long id, AuthUser user) {
        requireLogin(user);
        Asset asset = requireUploader(id, user);
        String objectKey = asset.getObjectKey();
        assetMapper.deleteById(id);
        if (objectKey == null || objectKey.isBlank()) {
            return;
        }
        try {
            storageService.delete(assetsBucket, objectKey);
        } catch (Exception e) {
            log.warn("对象删除失败 bucket={} objectKey={}", assetsBucket, objectKey, e);
        }
    }

    boolean canRead(Asset asset, AuthUser user) {
        if (asset == null || user == null) {
            return false;
        }
        if (user.id().equals(asset.getUploaderId())) {
            return true;
        }
        if (Boolean.TRUE.equals(asset.getIsPublic())) {
            return true;
        }
        return asset.getTeamId() != null && teamService.isMember(asset.getTeamId(), user.id());
    }

    public static List<String> normalizeTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return List.of();
        }
        List<String> result = new ArrayList<>();
        for (String raw : tags) {
            if (raw == null || raw.isBlank()) {
                continue;
            }
            if (raw.contains(",")) {
                Arrays.stream(raw.split(","))
                        .map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .forEach(result::add);
            } else {
                result.add(raw.trim());
            }
        }
        return List.copyOf(result);
    }

    private Asset requireAsset(Long id) {
        Asset asset = assetMapper.selectById(id);
        if (asset == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return asset;
    }

    private Asset requireUploader(Long id, AuthUser user) {
        Asset asset = requireAsset(id);
        if (!user.id().equals(asset.getUploaderId())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        return asset;
    }

    private static void requireLogin(AuthUser user) {
        if (user == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
    }

    private AssetVO toVo(Asset asset) {
        List<String> tags = asset.getTags() != null ? asset.getTags() : List.of();
        return new AssetVO(
                asset.getId(),
                asset.getFileName(),
                asset.getFileType(),
                asset.getUrl(),
                asset.getUploaderId(),
                asset.getTeamId(),
                asset.getCategory(),
                tags,
                asset.getIsPublic(),
                asset.getCreatedAt());
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
