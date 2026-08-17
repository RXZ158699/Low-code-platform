package com.design.platform.template;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.design.platform.common.api.PageData;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.storage.StorageService;
import com.design.platform.storage.StoredObject;
import com.design.platform.template.dto.TemplateCreateRequest;
import com.design.platform.template.dto.TemplateQuery;
import com.design.platform.template.dto.TemplateVO;
import com.design.platform.template.entity.Template;
import com.design.platform.template.mapper.TemplateMapper;
import com.design.platform.template.service.TemplateService;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.Cursor;
import org.springframework.data.redis.core.ScanOptions;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.lang.reflect.Proxy;
import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TemplateServiceTest {

    private TemplateMapper templateMapper;
    private UserMapper userMapper;
    private StubStorageService storageService;
    private FakeStringRedisTemplate redis;
    private TemplateService templateService;

    private final AuthUser author = new AuthUser(1L, "alice", "USER");
    private final AuthUser other = new AuthUser(2L, "bob", "USER");

    @BeforeEach
    void setUp() {
        templateMapper = mock(TemplateMapper.class);
        userMapper = mock(UserMapper.class);
        storageService = new StubStorageService();
        redis = new FakeStringRedisTemplate();
        ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        templateService = new TemplateService(
                templateMapper,
                userMapper,
                storageService,
                redis,
                objectMapper,
                "templates");
    }

    @Test
    void getThrowsNotFoundWhenMissing() {
        when(templateMapper.selectById(9L)).thenReturn(null);
        BizException ex = assertThrows(BizException.class, () -> templateService.get(9L, null));
        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void getThrowsForbiddenWhenPrivateAndNotAuthor() {
        Template template = publicTemplate();
        template.setIsPublic(false);
        when(templateMapper.selectById(1L)).thenReturn(template);
        BizException ex = assertThrows(BizException.class, () -> templateService.get(1L, other));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void getIncrementsViewCountForPublicTemplate() {
        Template template = publicTemplate();
        template.setViewCount(10L);
        when(templateMapper.selectById(1L)).thenReturn(template);
        when(templateMapper.updateById(any(Template.class))).thenReturn(1);

        TemplateVO vo = templateService.get(1L, null);
        assertEquals(11L, vo.viewCount());
        verify(templateMapper).updateById(any(Template.class));
    }

    @Test
    void createSetsAuthorId() {
        when(templateMapper.insert(any(Template.class))).thenAnswer(invocation -> {
            Template template = invocation.getArgument(0);
            template.setId(5L);
            return 1;
        });

        TemplateVO vo = templateService.create(
                new TemplateCreateRequest("海报一", "海报", null, null, "{}", List.of("热门"), true),
                author);
        assertEquals(5L, vo.id());
        assertEquals(author.id(), vo.authorId());
        assertEquals("海报一", vo.title());
    }

    @Test
    void coverRejectsUnsupportedType() {
        when(templateMapper.selectById(1L)).thenReturn(publicTemplate());
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("payload.exe");
        when(file.getContentType()).thenReturn("application/octet-stream");

        BizException ex = assertThrows(BizException.class,
                () -> templateService.uploadCover(1L, file, author));
        assertEquals(ErrorCode.UNSUPPORTED_TYPE, ex.getErrorCode());
        assertFalse(storageService.uploaded);
    }

    @Test
    void coverUploadsPngAndUpdatesUrl() throws Exception {
        Template template = publicTemplate();
        when(templateMapper.selectById(1L)).thenReturn(template);
        when(templateMapper.updateById(any(Template.class))).thenReturn(1);
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("cover.png");
        when(file.getContentType()).thenReturn("image/png");
        when(file.getSize()).thenReturn(3L);
        when(file.getInputStream()).thenReturn(new ByteArrayInputStream(new byte[]{1, 2, 3}));
        storageService.result = new StoredObject(
                "templates", "2026/08/abc.png", "http://localhost:9000/templates/2026/08/abc.png");

        TemplateVO vo = templateService.uploadCover(1L, file, author);
        assertEquals("http://localhost:9000/templates/2026/08/abc.png", vo.coverImageUrl());
    }

    @Test
    void listReturnsCachedPageWithoutHittingMapper() throws Exception {
        ObjectMapper mapper = new ObjectMapper().registerModule(new JavaTimeModule());
        PageData<TemplateVO> cached = PageData.of(1, 1, 12, List.of(
                new TemplateVO(1L, "cached", "海报", null, List.of(), "{}", List.of(), 1L, null, true, 0L, 0L, null, null)));
        redis.store.put("cache:templates::1:12::", mapper.writeValueAsString(cached));

        PageData<TemplateVO> result = templateService.list(new TemplateQuery(), null);
        assertEquals(1, result.getTotal());
        assertEquals("cached", result.getRecords().get(0).title());
        verify(templateMapper, never()).selectPage(any(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void listForLoggedInUserDoesNotUseAnonymousCache() {
        redis.store.put("cache:templates::1:12::", "{\"total\":1,\"page\":1,\"size\":12,\"records\":[]}");
        when(templateMapper.selectPage(any(Page.class), any())).thenAnswer(invocation -> {
            Page<Template> page = invocation.getArgument(0);
            page.setTotal(1);
            page.setRecords(List.of(publicTemplate()));
            return page;
        });

        PageData<TemplateVO> result = templateService.list(new TemplateQuery(), author);
        assertEquals("夏日海报", result.getRecords().get(0).title());
        verify(templateMapper).selectPage(any(), any());
    }

    @Test
    @SuppressWarnings("unchecked")
    void listQueriesPublicTemplatesWhenCacheMiss() {
        when(templateMapper.selectPage(any(Page.class), any())).thenAnswer(invocation -> {
            Page<Template> page = invocation.getArgument(0);
            page.setTotal(1);
            page.setRecords(List.of(publicTemplate()));
            return page;
        });
        User user = new User();
        user.setId(1L);
        user.setNickname("Alice");
        when(userMapper.selectById(1L)).thenReturn(user);

        PageData<TemplateVO> result = templateService.list(new TemplateQuery(), null);
        assertEquals(1, result.getTotal());
        assertEquals(1, result.getPage());
        assertEquals(12, result.getSize());
        assertEquals("夏日海报", result.getRecords().get(0).title());
        assertEquals("Alice", result.getRecords().get(0).authorNickname());
    }

    private Template publicTemplate() {
        Template template = new Template();
        template.setId(1L);
        template.setTitle("夏日海报");
        template.setCategory("海报");
        template.setJsonData("{\"width\":800}");
        template.setAuthorId(1L);
        template.setIsPublic(true);
        template.setViewCount(0L);
        template.setDownloadCount(0L);
        template.setPreviewImages(List.of());
        template.setTags(List.of());
        return template;
    }

    static final class StubStorageService extends StorageService {
        StoredObject result;
        boolean uploaded;

        StubStorageService() {
            super(null, "http://localhost:9000", "templates", "assets", "works");
        }

        @Override
        public StoredObject upload(
                String bucket, String originalFilename, String contentType, InputStream in, long size) {
            uploaded = true;
            return result != null
                    ? result
                    : new StoredObject(bucket, "key", "http://localhost:9000/" + bucket + "/key");
        }
    }

    static final class FakeStringRedisTemplate extends StringRedisTemplate {
        final Map<String, String> store = new HashMap<>();
        Duration lastTtl;

        @Override
        @SuppressWarnings("unchecked")
        public ValueOperations<String, String> opsForValue() {
            return (ValueOperations<String, String>) Proxy.newProxyInstance(
                    ValueOperations.class.getClassLoader(),
                    new Class<?>[]{ValueOperations.class},
                    (proxy, method, args) -> switch (method.getName()) {
                        case "get" -> store.get((String) args[0]);
                        case "set" -> {
                            store.put((String) args[0], (String) args[1]);
                            if (args.length >= 3 && args[2] instanceof Duration duration) {
                                lastTtl = duration;
                            }
                            yield null;
                        }
                        default -> throw new UnsupportedOperationException(method.getName());
                    });
        }

        @Override
        @SuppressWarnings("unchecked")
        public Cursor<String> scan(ScanOptions options) {
            return mock(Cursor.class);
        }

        @Override
        public Boolean delete(String key) {
            return store.remove(key) != null;
        }
    }
}
