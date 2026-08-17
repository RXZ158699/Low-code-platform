package com.design.platform.share.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.share.dto.ShareCreateRequest;
import com.design.platform.share.dto.ShareUpdateRequest;
import com.design.platform.share.dto.ShareVO;
import com.design.platform.share.entity.ShareLink;
import com.design.platform.share.mapper.ShareLinkMapper;
import com.design.platform.work.dto.WorkVO;
import com.design.platform.work.entity.Work;
import com.design.platform.work.mapper.WorkMapper;
import com.design.platform.work.service.WorkAccess;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Set;

@Service
public class ShareService {

    private static final Set<String> PERMISSIONS = Set.of("VIEW", "EDIT");
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final ShareLinkMapper shareLinkMapper;
    private final WorkMapper workMapper;

    public ShareService(ShareLinkMapper shareLinkMapper, WorkMapper workMapper) {
        this.shareLinkMapper = shareLinkMapper;
        this.workMapper = workMapper;
    }

    @Transactional
    public ShareVO create(Long workId, ShareCreateRequest request, AuthUser user) {
        requireLogin(user);
        Work work = requireWork(workId);
        if (!WorkAccess.canWrite(work, user.id())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }

        String permission = normalizePermission(request == null ? null : request.permission());
        Instant expireAt = request == null ? null : request.expireAt();

        ShareLink link = new ShareLink();
        link.setWorkId(workId);
        link.setToken(generateToken());
        link.setPermission(permission);
        link.setExpireAt(toLocalDateTime(expireAt));
        link.setCreatedBy(user.id());
        shareLinkMapper.insert(link);

        return toVo(link);
    }

    public WorkVO getByToken(String token) {
        ShareLink link = requireByToken(token);
        assertNotExpired(link);
        return toWorkVo(requireWork(link.getWorkId()));
    }

    @Transactional
    public WorkVO updateByToken(String token, ShareUpdateRequest request) {
        ShareLink link = requireByToken(token);
        assertNotExpired(link);
        if (!"EDIT".equals(link.getPermission())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }

        Work work = requireWork(link.getWorkId());
        boolean changed = false;
        if (request != null && request.title() != null) {
            String title = request.title().trim();
            if (title.isEmpty() || title.length() > 128) {
                throw new BizException(ErrorCode.BAD_REQUEST);
            }
            work.setTitle(title);
            changed = true;
        }
        if (request != null && request.canvasJson() != null) {
            work.setCanvasJson(request.canvasJson());
            changed = true;
        }
        if (changed) {
            workMapper.updateById(work);
        }
        return toWorkVo(work);
    }

    @Transactional
    public void delete(Long id, AuthUser user) {
        requireLogin(user);
        ShareLink link = shareLinkMapper.selectById(id);
        if (link == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        if (!user.id().equals(link.getCreatedBy())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        shareLinkMapper.deleteById(id);
    }

    private ShareLink requireByToken(String token) {
        if (token == null || token.isBlank()) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        ShareLink link = shareLinkMapper.selectOne(
                new LambdaQueryWrapper<ShareLink>().eq(ShareLink::getToken, token));
        if (link == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return link;
    }

    private void assertNotExpired(ShareLink link) {
        Instant expireAt = toInstant(link.getExpireAt());
        if (ShareExpiry.isExpired(expireAt, Instant.now())) {
            throw new BizException(ErrorCode.GONE);
        }
    }

    private Work requireWork(Long id) {
        if (id == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        Work work = workMapper.selectById(id);
        if (work == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return work;
    }

    private static String normalizePermission(String permission) {
        if (permission == null || permission.isBlank()) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        String normalized = permission.trim().toUpperCase(Locale.ROOT);
        if (!PERMISSIONS.contains(normalized)) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        return normalized;
    }

    private static String generateToken() {
        byte[] bytes = new byte[16];
        SECURE_RANDOM.nextBytes(bytes);
        return HexFormat.of().formatHex(bytes);
    }

    private static Instant toInstant(LocalDateTime value) {
        if (value == null) {
            return null;
        }
        return value.toInstant(ZoneOffset.UTC);
    }

    private static LocalDateTime toLocalDateTime(Instant value) {
        if (value == null) {
            return null;
        }
        return LocalDateTime.ofInstant(value, ZoneOffset.UTC);
    }

    private static ShareVO toVo(ShareLink link) {
        return new ShareVO(
                link.getId(),
                link.getToken(),
                "/api/shares/" + link.getToken(),
                link.getPermission(),
                toInstant(link.getExpireAt()));
    }

    private static WorkVO toWorkVo(Work work) {
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

    private static void requireLogin(AuthUser user) {
        if (user == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
    }
}
