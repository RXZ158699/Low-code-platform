package com.design.platform.template.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.design.platform.common.api.PageData;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.storage.StorageService;
import com.design.platform.storage.StoredObject;
import com.design.platform.template.dto.TemplateCreateRequest;
import com.design.platform.template.dto.TemplateQuery;
import com.design.platform.template.dto.TemplateUpdateRequest;
import com.design.platform.template.dto.TemplateVO;
import com.design.platform.template.entity.Template;
import com.design.platform.template.mapper.TemplateMapper;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Duration;
import java.util.List;
import java.util.Locale;

@Service
public class TemplateService {

    static final String CACHE_KEY_PREFIX = "cache:templates:";
    private static final Duration CACHE_TTL = Duration.ofSeconds(60);
    private static final TypeReference<PageData<TemplateVO>> PAGE_TYPE = new TypeReference<>() {};

    private final TemplateMapper templateMapper;
    private final UserMapper userMapper;
    private final StorageService storageService;
    private final StringRedisTemplate stringRedisTemplate;
    private final ObjectMapper objectMapper;
    private final String templatesBucket;

    public TemplateService(
            TemplateMapper templateMapper,
            UserMapper userMapper,
            StorageService storageService,
            StringRedisTemplate stringRedisTemplate,
            ObjectMapper objectMapper,
            @Value("${app.minio.buckets.templates}") String templatesBucket) {
        this.templateMapper = templateMapper;
        this.userMapper = userMapper;
        this.storageService = storageService;
        this.stringRedisTemplate = stringRedisTemplate;
        this.objectMapper = objectMapper;
        this.templatesBucket = templatesBucket;
    }

    public PageData<TemplateVO> list(TemplateQuery query, AuthUser viewer) {
        if (query == null) {
            query = new TemplateQuery();
        }
        String cacheKey = cacheKey(query);
        if (viewer == null) {
            PageData<TemplateVO> cached = readCache(cacheKey);
            if (cached != null) {
                return cached;
            }
        }

        Page<Template> mpPage = new Page<>(query.getPage(), query.getSize());
        LambdaQueryWrapper<Template> wrapper = new LambdaQueryWrapper<>();
        if (viewer == null) {
            wrapper.eq(Template::getIsPublic, true);
        } else {
            wrapper.and(w -> w.eq(Template::getIsPublic, true).or().eq(Template::getAuthorId, viewer.id()));
        }
        if (hasText(query.getCategory())) {
            wrapper.eq(Template::getCategory, query.getCategory());
        }
        if (hasText(query.getKeyword())) {
            wrapper.like(Template::getTitle, query.getKeyword());
        }
        if (hasText(query.getTag())) {
            wrapper.apply("JSON_CONTAINS(tags, JSON_QUOTE({0}))", query.getTag());
        }
        wrapper.orderByDesc(Template::getCreatedAt);

        Page<Template> result = templateMapper.selectPage(mpPage, wrapper);
        List<TemplateVO> records = result.getRecords().stream().map(this::toVo).toList();
        PageData<TemplateVO> pageData = PageData.of(result.getTotal(), result.getCurrent(), result.getSize(), records);
        if (viewer == null) {
            writeCache(cacheKey, pageData);
        }
        return pageData;
    }

    public TemplateVO get(Long id, AuthUser viewer) {
        Template template = requireTemplate(id);
        if (!TemplateAccess.canRead(template, viewer)) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        long views = template.getViewCount() == null ? 0L : template.getViewCount();
        template.setViewCount(views + 1);
        templateMapper.updateById(template);
        return toVo(template);
    }

    public TemplateVO create(TemplateCreateRequest request, AuthUser user) {
        requireLogin(user);
        if (request == null || !hasText(request.title()) || !hasText(request.category())) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        if (request.title().length() > 128 || request.category().length() > 32) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        Template template = new Template();
        template.setTitle(request.title());
        template.setCategory(request.category());
        template.setCoverImageUrl(request.coverImageUrl());
        template.setPreviewImages(request.previewImages() != null ? request.previewImages() : List.of());
        template.setJsonData(request.jsonData());
        template.setTags(request.tags() != null ? request.tags() : List.of());
        template.setAuthorId(user.id());
        template.setIsPublic(request.isPublic() == null || request.isPublic());
        template.setViewCount(0L);
        template.setDownloadCount(0L);
        templateMapper.insert(template);
        evictListCache();
        return toVo(template);
    }

    public TemplateVO update(Long id, TemplateUpdateRequest request, AuthUser user) {
        requireLogin(user);
        Template template = requireWritable(id, user);
        if (request == null) {
            return toVo(template);
        }
        if (request.title() != null) {
            if (!hasText(request.title()) || request.title().length() > 128) {
                throw new BizException(ErrorCode.BAD_REQUEST);
            }
            template.setTitle(request.title());
        }
        if (request.category() != null) {
            if (!hasText(request.category()) || request.category().length() > 32) {
                throw new BizException(ErrorCode.BAD_REQUEST);
            }
            template.setCategory(request.category());
        }
        if (request.coverImageUrl() != null) {
            template.setCoverImageUrl(request.coverImageUrl());
        }
        if (request.previewImages() != null) {
            template.setPreviewImages(request.previewImages());
        }
        if (request.jsonData() != null) {
            template.setJsonData(request.jsonData());
        }
        if (request.tags() != null) {
            template.setTags(request.tags());
        }
        if (request.isPublic() != null) {
            template.setIsPublic(request.isPublic());
        }
        templateMapper.updateById(template);
        evictListCache();
        return toVo(template);
    }

    public void delete(Long id, AuthUser user) {
        requireLogin(user);
        requireWritable(id, user);
        templateMapper.deleteById(id);
        evictListCache();
    }

    public TemplateVO uploadCover(Long id, MultipartFile file, AuthUser user) {
        requireLogin(user);
        Template template = requireWritable(id, user);
        if (file == null || file.isEmpty()) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        if (!allowedImage(file.getOriginalFilename(), file.getContentType())) {
            throw new BizException(ErrorCode.UNSUPPORTED_TYPE);
        }
        try (InputStream in = file.getInputStream()) {
            StoredObject stored = storageService.upload(
                    templatesBucket,
                    file.getOriginalFilename(),
                    file.getContentType(),
                    in,
                    file.getSize());
            template.setCoverImageUrl(stored.url());
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException(ErrorCode.INTERNAL, "文件上传失败");
        }
        templateMapper.updateById(template);
        evictListCache();
        return toVo(template);
    }

    static boolean allowedImage(String filename, String contentType) {
        return allowedExtension(filename) || allowedContentType(contentType);
    }

    private Template requireTemplate(Long id) {
        Template template = templateMapper.selectById(id);
        if (template == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return template;
    }

    private Template requireWritable(Long id, AuthUser user) {
        Template template = requireTemplate(id);
        if (!TemplateAccess.canWrite(template, user)) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        return template;
    }

    private static void requireLogin(AuthUser user) {
        if (user == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
    }

    private TemplateVO toVo(Template template) {
        String nickname = null;
        if (template.getAuthorId() != null) {
            User author = userMapper.selectById(template.getAuthorId());
            if (author != null) {
                nickname = author.getNickname();
            }
        }
        List<String> previews = template.getPreviewImages() != null ? template.getPreviewImages() : List.of();
        List<String> tags = template.getTags() != null ? template.getTags() : List.of();
        return new TemplateVO(
                template.getId(),
                template.getTitle(),
                template.getCategory(),
                template.getCoverImageUrl(),
                previews,
                template.getJsonData(),
                tags,
                template.getAuthorId(),
                nickname,
                template.getIsPublic(),
                template.getViewCount(),
                template.getDownloadCount(),
                template.getCreatedAt(),
                template.getUpdatedAt());
    }

    private String cacheKey(TemplateQuery query) {
        return CACHE_KEY_PREFIX
                + nullToEmpty(query.getCategory()) + ":"
                + query.getPage() + ":"
                + query.getSize() + ":"
                + nullToEmpty(query.getKeyword()) + ":"
                + nullToEmpty(query.getTag());
    }

    private PageData<TemplateVO> readCache(String key) {
        try {
            String json = stringRedisTemplate.opsForValue().get(key);
            if (json == null || json.isBlank()) {
                return null;
            }
            return objectMapper.readValue(json, PAGE_TYPE);
        } catch (Exception e) {
            return null;
        }
    }

    private void writeCache(String key, PageData<TemplateVO> pageData) {
        try {
            stringRedisTemplate.opsForValue().set(key, objectMapper.writeValueAsString(pageData), CACHE_TTL);
        } catch (Exception ignored) {
            // cache is best-effort
        }
    }

    private void evictListCache() {
        ScanOptions options = ScanOptions.scanOptions().match(CACHE_KEY_PREFIX + "*").count(100).build();
        try (Cursor<String> cursor = stringRedisTemplate.scan(options)) {
            if (cursor == null) {
                return;
            }
            while (cursor.hasNext()) {
                stringRedisTemplate.delete(cursor.next());
            }
        } catch (Exception ignored) {
            // cache is best-effort
        }
    }

    private static boolean allowedExtension(String filename) {
        if (filename == null || filename.isBlank()) {
            return false;
        }
        String lower = filename.toLowerCase(Locale.ROOT);
        return lower.endsWith(".jpg")
                || lower.endsWith(".jpeg")
                || lower.endsWith(".png")
                || lower.endsWith(".webp")
                || lower.endsWith(".gif");
    }

    private static boolean allowedContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return false;
        }
        String lower = contentType.toLowerCase(Locale.ROOT);
        int semi = lower.indexOf(';');
        if (semi >= 0) {
            lower = lower.substring(0, semi).trim();
        }
        return "image/jpeg".equals(lower)
                || "image/jpg".equals(lower)
                || "image/png".equals(lower)
                || "image/webp".equals(lower)
                || "image/gif".equals(lower);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }
}
