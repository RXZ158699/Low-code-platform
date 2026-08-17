package com.design.platform.work.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.design.platform.common.api.PageData;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.storage.StorageService;
import com.design.platform.storage.StoredObject;
import com.design.platform.team.service.TeamService;
import com.design.platform.template.entity.Template;
import com.design.platform.template.mapper.TemplateMapper;
import com.design.platform.template.service.TemplateAccess;
import com.design.platform.work.dto.WorkCreateRequest;
import com.design.platform.work.dto.WorkQuery;
import com.design.platform.work.dto.WorkUpdateRequest;
import com.design.platform.work.dto.WorkVO;
import com.design.platform.work.entity.Work;
import com.design.platform.work.mapper.WorkMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
public class WorkService {

    private static final String DEFAULT_TITLE = "未命名作品";
    private static final String STATUS_DRAFT = "DRAFT";
    private static final String STATUS_PUBLISHED = "PUBLISHED";
    private static final Set<String> STATUSES = Set.of(STATUS_DRAFT, STATUS_PUBLISHED);
    private static final String TEMPLATE_CACHE_PREFIX = "cache:templates:";

    private final WorkMapper workMapper;
    private final TemplateMapper templateMapper;
    private final StorageService storageService;
    private final StringRedisTemplate stringRedisTemplate;
    private final TeamService teamService;
    private final String worksBucket;

    public WorkService(
            WorkMapper workMapper,
            TemplateMapper templateMapper,
            StorageService storageService,
            StringRedisTemplate stringRedisTemplate,
            TeamService teamService,
            @Value("${app.minio.buckets.works}") String worksBucket) {
        this.workMapper = workMapper;
        this.templateMapper = templateMapper;
        this.storageService = storageService;
        this.stringRedisTemplate = stringRedisTemplate;
        this.teamService = teamService;
        this.worksBucket = worksBucket;
    }

    public PageData<WorkVO> list(WorkQuery query, AuthUser user) {
        requireLogin(user);
        if (query == null) {
            query = new WorkQuery();
        }
        Page<Work> mpPage = new Page<>(query.getPage(), query.getSize());
        LambdaQueryWrapper<Work> wrapper = new LambdaQueryWrapper<>();
        wrapper.eq(Work::getUserId, user.id());
        if (hasText(query.getStatus())) {
            wrapper.eq(Work::getStatus, normalizeStatus(query.getStatus()));
        }
        wrapper.orderByDesc(Work::getUpdatedAt);

        Page<Work> result = workMapper.selectPage(mpPage, wrapper);
        List<WorkVO> records = result.getRecords().stream().map(this::toVo).toList();
        return PageData.of(result.getTotal(), result.getCurrent(), result.getSize(), records);
    }

    public WorkVO get(Long id, AuthUser user) {
        requireLogin(user);
        Work work = requireWork(id);
        boolean isTeamMember = work.getTeamId() != null
                && teamService.isMember(work.getTeamId(), user.id());
        if (!WorkAccess.canRead(work, user.id(), isTeamMember)) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        return toVo(work);
    }

    @Transactional
    public WorkVO create(WorkCreateRequest request, AuthUser user) {
        requireLogin(user);
        if (request != null && request.templateId() != null) {
            String titleOverride = null;
            if (hasText(request.title())) {
                titleOverride = resolveTitle(request.title());
            }
            Template template = requireReadableTemplate(request.templateId(), user);
            return insertWorkFromTemplate(
                    template,
                    user,
                    titleOverride,
                    request.canvasJson(),
                    request.teamId());
        }

        Work work = new Work();
        work.setUserId(user.id());
        work.setTitle(resolveTitle(request == null ? null : request.title()));
        work.setCanvasJson(request == null ? null : request.canvasJson());
        work.setTeamId(request == null ? null : request.teamId());
        assertTeamMemberIfPresent(work.getTeamId(), user);
        work.setStatus(STATUS_DRAFT);
        workMapper.insert(work);
        return toVo(work);
    }

    @Transactional
    public WorkVO createFromTemplate(Long templateId, AuthUser user) {
        requireLogin(user);
        Template template = requireReadableTemplate(templateId, user);
        return insertWorkFromTemplate(template, user, null, null, null);
    }

    private Template requireReadableTemplate(Long templateId, AuthUser user) {
        Template template = templateMapper.selectById(templateId);
        if (template == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        if (!TemplateAccess.canRead(template, user)) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        return template;
    }

    private WorkVO insertWorkFromTemplate(
            Template template,
            AuthUser user,
            String titleOverride,
            String canvasJsonOverride,
            Long teamIdOverride) {
        assertTeamMemberIfPresent(teamIdOverride, user);
        long downloads = template.getDownloadCount() == null ? 0L : template.getDownloadCount();
        template.setDownloadCount(downloads + 1);
        templateMapper.updateById(template);
        evictTemplateListCache();

        Work work = new Work();
        work.setUserId(user.id());
        work.setTemplateId(template.getId());
        work.setTitle(titleOverride != null ? titleOverride : template.getTitle());
        work.setCanvasJson(canvasJsonOverride != null ? canvasJsonOverride : template.getJsonData());
        work.setTeamId(teamIdOverride);
        work.setStatus(STATUS_DRAFT);
        workMapper.insert(work);
        return toVo(work);
    }

    public WorkVO update(Long id, WorkUpdateRequest request, AuthUser user) {
        requireLogin(user);
        Work work = requireWritable(id, user);
        if (request == null) {
            return toVo(work);
        }
        if (request.title() != null) {
            if (!hasText(request.title()) || request.title().length() > 128) {
                throw new BizException(ErrorCode.BAD_REQUEST);
            }
            work.setTitle(request.title());
        }
        if (request.canvasJson() != null) {
            work.setCanvasJson(request.canvasJson());
        }
        if (request.status() != null) {
            work.setStatus(normalizeStatus(request.status()));
        }
        if (request.teamId() != null) {
            teamService.assertMember(request.teamId(), user.id());
            work.setTeamId(request.teamId());
        }
        workMapper.updateById(work);
        return toVo(work);
    }

    public void delete(Long id, AuthUser user) {
        requireLogin(user);
        requireWritable(id, user);
        workMapper.deleteById(id);
    }

    public WorkVO publish(Long id, AuthUser user) {
        requireLogin(user);
        Work work = requireWritable(id, user);
        work.setStatus(STATUS_PUBLISHED);
        workMapper.updateById(work);
        return toVo(work);
    }

    public WorkVO uploadThumbnail(Long id, MultipartFile file, AuthUser user) {
        requireLogin(user);
        Work work = requireWritable(id, user);
        if (file == null || file.isEmpty()) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        if (!allowedImage(file.getOriginalFilename(), file.getContentType())) {
            throw new BizException(ErrorCode.UNSUPPORTED_TYPE);
        }
        try (InputStream in = file.getInputStream()) {
            StoredObject stored = storageService.upload(
                    worksBucket,
                    file.getOriginalFilename(),
                    file.getContentType(),
                    in,
                    file.getSize());
            work.setThumbnailUrl(stored.url());
        } catch (BizException e) {
            throw e;
        } catch (Exception e) {
            throw new BizException(ErrorCode.INTERNAL, "文件上传失败");
        }
        workMapper.updateById(work);
        return toVo(work);
    }

    private Work requireWork(Long id) {
        Work work = workMapper.selectById(id);
        if (work == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return work;
    }

    private Work requireWritable(Long id, AuthUser user) {
        Work work = requireWork(id);
        if (!WorkAccess.canWrite(work, user.id())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        return work;
    }

    private static void requireLogin(AuthUser user) {
        if (user == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
    }

    private void assertTeamMemberIfPresent(Long teamId, AuthUser user) {
        if (teamId != null) {
            teamService.assertMember(teamId, user.id());
        }
    }

    private WorkVO toVo(Work work) {
        return new WorkVO(
                work.getId(),
                work.getUserId(),
                work.getTemplateId(),
                work.getTitle(),
                work.getStatus(),
                work.getTeamId(),
                work.getCanvasJson(),
                work.getThumbnailUrl(),
                work.getCreatedAt(),
                work.getUpdatedAt());
    }

    private void evictTemplateListCache() {
        ScanOptions options = ScanOptions.scanOptions().match(TEMPLATE_CACHE_PREFIX + "*").count(100).build();
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

    private static String resolveTitle(String title) {
        if (!hasText(title)) {
            return DEFAULT_TITLE;
        }
        if (title.length() > 128) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        return title;
    }

    private static String normalizeStatus(String status) {
        if (!hasText(status)) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        if (!STATUSES.contains(normalized)) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        return normalized;
    }

    static boolean allowedImage(String filename, String contentType) {
        return allowedExtension(filename) || allowedContentType(contentType);
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
}
