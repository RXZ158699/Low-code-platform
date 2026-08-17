package com.design.platform.work;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.design.platform.common.api.PageData;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.storage.StorageService;
import com.design.platform.storage.StoredObject;
import com.design.platform.template.entity.Template;
import com.design.platform.template.mapper.TemplateMapper;
import com.design.platform.work.dto.WorkCreateRequest;
import com.design.platform.work.dto.WorkQuery;
import com.design.platform.work.dto.WorkUpdateRequest;
import com.design.platform.work.dto.WorkVO;
import com.design.platform.work.entity.Work;
import com.design.platform.work.mapper.WorkMapper;
import com.design.platform.work.service.WorkService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkServiceTest {

    private WorkMapper workMapper;
    private TemplateMapper templateMapper;
    private StubStorageService storageService;
    private StringRedisTemplate redis;
    private WorkService workService;

    private final AuthUser owner = new AuthUser(1L, "alice", "USER");
    private final AuthUser other = new AuthUser(2L, "bob", "USER");

    @BeforeEach
    void setUp() {
        workMapper = mock(WorkMapper.class);
        templateMapper = mock(TemplateMapper.class);
        storageService = new StubStorageService();
        redis = new FakeStringRedisTemplate();
        workService = new WorkService(workMapper, templateMapper, storageService, redis, "works");
    }

    @Test
    @SuppressWarnings("unchecked")
    void listFiltersByCurrentUserAndOptionalStatus() {
        when(workMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenAnswer(invocation -> {
            Page<Work> page = invocation.getArgument(0);
            page.setTotal(1);
            page.setRecords(List.of(sampleWork()));
            return page;
        });

        WorkQuery query = new WorkQuery();
        query.setStatus("DRAFT");
        PageData<WorkVO> result = workService.list(query, owner);
        assertEquals(1, result.getTotal());
        assertEquals("我的海报", result.getRecords().get(0).title());
        assertEquals("DRAFT", result.getRecords().get(0).status());
    }

    @Test
    void getAllowsOwnerAndForbidsOtherWhenNotMember() {
        when(workMapper.selectById(10L)).thenReturn(sampleWork());

        WorkVO vo = workService.get(10L, owner, false);
        assertEquals(10L, vo.id());
        assertEquals("{\"w\":1}", vo.canvasJson());

        BizException ex = assertThrows(BizException.class, () -> workService.get(10L, other, false));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void getThrowsNotFoundWhenMissing() {
        when(workMapper.selectById(9L)).thenReturn(null);
        BizException ex = assertThrows(BizException.class, () -> workService.get(9L, owner, false));
        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void createBlankDraft() {
        when(workMapper.insert(any(Work.class))).thenAnswer(invocation -> {
            Work work = invocation.getArgument(0);
            work.setId(3L);
            return 1;
        });

        WorkVO vo = workService.create(new WorkCreateRequest(null, "空白稿", null, null), owner);
        assertEquals(3L, vo.id());
        assertEquals(owner.id(), vo.userId());
        assertEquals("空白稿", vo.title());
        assertEquals("DRAFT", vo.status());
        verify(templateMapper, never()).selectById(any());
    }

    @Test
    void createFromTemplateCopiesJsonAndIncrementsDownload() {
        Template template = publicTemplate();
        template.setDownloadCount(2L);
        when(templateMapper.selectById(1L)).thenReturn(template);
        when(templateMapper.updateById(any(Template.class))).thenReturn(1);
        when(workMapper.insert(any(Work.class))).thenAnswer(invocation -> {
            Work work = invocation.getArgument(0);
            work.setId(77L);
            return 1;
        });

        WorkVO vo = workService.createFromTemplate(1L, owner);
        assertEquals(77L, vo.id());
        assertEquals(owner.id(), vo.userId());
        assertEquals(1L, vo.templateId());
        assertEquals("夏日海报", vo.title());
        assertEquals("DRAFT", vo.status());
        assertEquals("{\"width\":800}", vo.canvasJson());
        assertEquals(3L, template.getDownloadCount());
        verify(templateMapper).updateById(any(Template.class));
    }

    @Test
    void createFromTemplateForbiddenWhenCannotRead() {
        Template template = publicTemplate();
        template.setIsPublic(false);
        when(templateMapper.selectById(1L)).thenReturn(template);

        BizException ex = assertThrows(BizException.class, () -> workService.createFromTemplate(1L, other));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        verify(workMapper, never()).insert(any(Work.class));
    }

    @Test
    void createWithTemplateIdUsesSharedPath() {
        Template template = publicTemplate();
        when(templateMapper.selectById(1L)).thenReturn(template);
        when(templateMapper.updateById(any(Template.class))).thenReturn(1);
        when(workMapper.insert(any(Work.class))).thenAnswer(invocation -> {
            Work work = invocation.getArgument(0);
            work.setId(8L);
            return 1;
        });

        WorkVO vo = workService.create(new WorkCreateRequest(1L, null, null, null), owner);
        assertEquals(8L, vo.id());
        assertEquals("夏日海报", vo.title());
        assertEquals("{\"width\":800}", vo.canvasJson());
    }

    @Test
    void updateAndDeleteOnlyOwner() {
        Work work = sampleWork();
        when(workMapper.selectById(10L)).thenReturn(work);
        when(workMapper.updateById(any(Work.class))).thenReturn(1);
        when(workMapper.deleteById(10L)).thenReturn(1);

        BizException forbidden = assertThrows(
                BizException.class,
                () -> workService.update(10L, new WorkUpdateRequest("x", null, null, null), other));
        assertEquals(ErrorCode.FORBIDDEN, forbidden.getErrorCode());

        WorkVO updated = workService.update(
                10L, new WorkUpdateRequest("新标题", "{\"a\":1}", "PUBLISHED", 9L), owner);
        assertEquals("新标题", updated.title());
        assertEquals("{\"a\":1}", updated.canvasJson());
        assertEquals("PUBLISHED", updated.status());
        assertEquals(9L, updated.teamId());

        workService.delete(10L, owner);
        verify(workMapper).deleteById(10L);
    }

    @Test
    void publishSetsPublished() {
        Work work = sampleWork();
        when(workMapper.selectById(10L)).thenReturn(work);
        when(workMapper.updateById(any(Work.class))).thenReturn(1);

        WorkVO vo = workService.publish(10L, owner);
        assertEquals("PUBLISHED", vo.status());
    }

    @Test
    void thumbnailRejectsUnsupportedType() {
        when(workMapper.selectById(10L)).thenReturn(sampleWork());
        MultipartFile file = mockFile("payload.exe", "application/octet-stream");

        BizException ex = assertThrows(BizException.class, () -> workService.uploadThumbnail(10L, file, owner));
        assertEquals(ErrorCode.UNSUPPORTED_TYPE, ex.getErrorCode());
        assertEquals(41500, ex.getErrorCode().getCode());
        assertFalse(storageService.uploaded);
    }

    @Test
    void thumbnailUploadsToWorksBucket() {
        Work work = sampleWork();
        when(workMapper.selectById(10L)).thenReturn(work);
        when(workMapper.updateById(any(Work.class))).thenReturn(1);
        MultipartFile file = mockFile("shot.png", "image/png");

        WorkVO vo = workService.uploadThumbnail(10L, file, owner);
        assertEquals("works", storageService.lastBucket);
        assertEquals("http://localhost:9000/works/2026/08/uuid.png", vo.thumbnailUrl());
    }

    private static Work sampleWork() {
        Work work = new Work();
        work.setId(10L);
        work.setUserId(1L);
        work.setTitle("我的海报");
        work.setCanvasJson("{\"w\":1}");
        work.setStatus("DRAFT");
        return work;
    }

    private static Template publicTemplate() {
        Template template = new Template();
        template.setId(1L);
        template.setTitle("夏日海报");
        template.setCategory("海报");
        template.setJsonData("{\"width\":800}");
        template.setAuthorId(1L);
        template.setIsPublic(true);
        template.setDownloadCount(0L);
        return template;
    }

    private static MultipartFile mockFile(String name, String contentType) {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn(name);
        when(file.getContentType()).thenReturn(contentType);
        when(file.getSize()).thenReturn(4L);
        try {
            when(file.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[] {1, 2, 3, 4}));
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return file;
    }

    static final class StubStorageService extends StorageService {
        boolean uploaded;
        String lastBucket;

        StubStorageService() {
            super(null, "http://localhost:9000", "templates", "assets", "works");
        }

        @Override
        public StoredObject upload(
                String bucket, String originalFilename, String contentType, InputStream in, long size) {
            uploaded = true;
            lastBucket = bucket;
            return new StoredObject(bucket, "2026/08/uuid.png", "http://localhost:9000/" + bucket + "/2026/08/uuid.png");
        }
    }

    static final class FakeStringRedisTemplate extends StringRedisTemplate {
        @Override
        @SuppressWarnings("unchecked")
        public Cursor<String> scan(ScanOptions options) {
            return mock(Cursor.class);
        }

        @Override
        public Boolean delete(String key) {
            return false;
        }
    }
}
