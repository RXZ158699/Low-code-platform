package com.design.platform.asset;

import com.design.platform.asset.dto.AssetQuery;
import com.design.platform.asset.dto.AssetUpdateRequest;
import com.design.platform.asset.dto.AssetVO;
import com.design.platform.asset.entity.Asset;
import com.design.platform.asset.mapper.AssetMapper;
import com.design.platform.asset.service.AssetService;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.storage.StorageService;
import com.design.platform.storage.StoredObject;
import com.design.platform.team.service.TeamService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AssetServiceTest {

    private AssetMapper assetMapper;
    private StubStorageService storageService;
    private TeamService teamService;
    private AssetService assetService;

    private final AuthUser uploader = new AuthUser(1L, "alice", "USER");
    private final AuthUser other = new AuthUser(2L, "bob", "USER");

    @BeforeEach
    void setUp() {
        assetMapper = mock(AssetMapper.class);
        storageService = new StubStorageService();
        teamService = new StubTeamService();
        assetService = new AssetService(assetMapper, storageService, teamService, "assets");
    }

    @Test
    void uploadRejectsMismatchedExtension() {
        MultipartFile file = mockFile("a.exe", "image/png");
        BizException ex = assertThrows(
                BizException.class,
                () -> assetService.upload(file, "image", null, null, false, null, uploader));
        assertEquals(ErrorCode.UNSUPPORTED_TYPE, ex.getErrorCode());
        assertFalse(storageService.uploaded);
    }

    @Test
    void uploadRejectsUnknownFileType() {
        MultipartFile file = mockFile("a.pdf", "application/pdf");
        BizException ex = assertThrows(
                BizException.class,
                () -> assetService.upload(file, "doc", null, null, false, null, uploader));
        assertEquals(ErrorCode.UNSUPPORTED_TYPE, ex.getErrorCode());
    }

    @Test
    void uploadStoresTagsFromCommaSeparatedAndRepeatedParams() {
        ((StubTeamService) teamService).member = true;
        MultipartFile file = mockFile("a.png", "image/png");
        when(assetMapper.insert(any(Asset.class))).thenAnswer(invocation -> {
            Asset asset = invocation.getArgument(0);
            asset.setId(10L);
            return 1;
        });

        AssetVO vo = assetService.upload(
                file, "image", "icon", List.of("a,b", "c"), true, 9L, uploader);

        assertEquals(List.of("a", "b", "c"), vo.tags());
        assertTrue(storageService.uploaded);
        assertEquals("assets", storageService.lastBucket);
    }

    @Test
    void uploadTeamIdForbiddenWhenNotMember() {
        MultipartFile file = mockFile("a.png", "image/png");
        BizException ex = assertThrows(
                BizException.class,
                () -> assetService.upload(file, "image", null, null, false, 9L, uploader));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        assertEquals(40300, ex.getErrorCode().getCode());
        assertFalse(storageService.uploaded);
    }

    @Test
    void getForbiddenWhenPrivateAndNotUploader() {
        Asset asset = sampleAsset(false);
        when(assetMapper.selectById(1L)).thenReturn(asset);
        BizException ex = assertThrows(BizException.class, () -> assetService.get(1L, other));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void getAllowsPublicForOtherUser() {
        Asset asset = sampleAsset(true);
        when(assetMapper.selectById(1L)).thenReturn(asset);
        AssetVO vo = assetService.get(1L, other);
        assertEquals(1L, vo.id());
    }

    @Test
    void getAllowsTeamMemberWhenTeamIdSet() {
        Asset asset = sampleAsset(false);
        asset.setTeamId(8L);
        when(assetMapper.selectById(1L)).thenReturn(asset);
        ((StubTeamService) teamService).member = true;

        AssetVO vo = assetService.get(1L, other);
        assertEquals(1L, vo.id());
    }

    @Test
    void updateAndDeleteOnlyUploader() {
        Asset asset = sampleAsset(false);
        when(assetMapper.selectById(1L)).thenReturn(asset);
        when(assetMapper.updateById(any(Asset.class))).thenReturn(1);
        when(assetMapper.deleteById(1L)).thenReturn(1);

        BizException forbidden = assertThrows(
                BizException.class,
                () -> assetService.update(1L, new AssetUpdateRequest("x", null, null, null), other));
        assertEquals(ErrorCode.FORBIDDEN, forbidden.getErrorCode());

        ((StubTeamService) teamService).member = true;
        AssetVO updated = assetService.update(1L, new AssetUpdateRequest("logo", List.of("t1"), true, 3L), uploader);
        assertEquals("logo", updated.category());
        assertEquals(List.of("t1"), updated.tags());
        assertTrue(updated.isPublic());
        assertEquals(3L, updated.teamId());

        assetService.delete(1L, uploader);
        assertTrue(storageService.deleted);
        verify(assetMapper).deleteById(1L);
    }

    @Test
    void updateTeamIdForbiddenWhenNotMember() {
        Asset asset = sampleAsset(false);
        when(assetMapper.selectById(1L)).thenReturn(asset);

        BizException ex = assertThrows(
                BizException.class,
                () -> assetService.update(1L, new AssetUpdateRequest(null, null, null, 3L), uploader));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        assertEquals(40300, ex.getErrorCode().getCode());
    }

    @Test
    void deleteLogsWhenStorageFails() {
        Asset asset = sampleAsset(false);
        when(assetMapper.selectById(1L)).thenReturn(asset);
        when(assetMapper.deleteById(1L)).thenReturn(1);
        storageService.failDelete = true;

        assetService.delete(1L, uploader);
        verify(assetMapper).deleteById(1L);
    }

    @Test
    void listTeamRequiresTeamId() {
        AssetQuery query = new AssetQuery();
        query.setScope("team");
        BizException ex = assertThrows(BizException.class, () -> assetService.list(query, uploader));
        assertEquals(ErrorCode.BAD_REQUEST, ex.getErrorCode());
    }

    @Test
    void listTeamAssertsMembership() {
        AssetQuery query = new AssetQuery();
        query.setScope("team");
        query.setTeamId(8L);

        BizException ex = assertThrows(BizException.class, () -> assetService.list(query, uploader));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        assertEquals(40300, ex.getErrorCode().getCode());
    }

    @Test
    void normalizeTagsHandlesCommaAndBlanks() {
        assertEquals(List.of("a", "b", "c"), AssetService.normalizeTags(List.of(" a,b ", "c", "")));
        assertEquals(List.of(), AssetService.normalizeTags(null));
    }

    private static Asset sampleAsset(boolean isPublic) {
        Asset asset = new Asset();
        asset.setId(1L);
        asset.setFileName("a.png");
        asset.setFileType("image");
        asset.setUrl("http://localhost:9000/assets/k");
        asset.setObjectKey("2026/08/key.png");
        asset.setUploaderId(1L);
        asset.setIsPublic(isPublic);
        asset.setTags(List.of());
        return asset;
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
        boolean deleted;
        boolean failDelete;
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

        @Override
        public void delete(String bucket, String objectKey) {
            if (failDelete) {
                throw new BizException(ErrorCode.INTERNAL, "文件删除失败");
            }
            deleted = true;
        }
    }

    static final class StubTeamService extends TeamService {
        boolean member;

        StubTeamService() {
            super(null, null, null, null, null);
        }

        @Override
        public boolean isMember(Long teamId, Long userId) {
            return member;
        }

        @Override
        public void assertMember(Long teamId, Long userId) {
            if (!isMember(teamId, userId)) {
                throw new BizException(ErrorCode.FORBIDDEN);
            }
        }
    }
}
