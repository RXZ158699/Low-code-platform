package com.design.platform.team.service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.design.platform.asset.dto.AssetVO;
import com.design.platform.asset.entity.Asset;
import com.design.platform.asset.mapper.AssetMapper;
import com.design.platform.common.api.PageData;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import com.design.platform.security.AuthUser;
import com.design.platform.team.dto.AddMemberRequest;
import com.design.platform.team.dto.TeamCreateRequest;
import com.design.platform.team.dto.TeamMemberVO;
import com.design.platform.team.dto.TeamUpdateRequest;
import com.design.platform.team.dto.TeamVO;
import com.design.platform.team.entity.Team;
import com.design.platform.team.entity.TeamMember;
import com.design.platform.team.mapper.TeamMapper;
import com.design.platform.team.mapper.TeamMemberMapper;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import com.design.platform.work.dto.WorkVO;
import com.design.platform.work.entity.Work;
import com.design.platform.work.mapper.WorkMapper;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
public class TeamService {

    private final TeamMapper teamMapper;
    private final TeamMemberMapper teamMemberMapper;
    private final UserMapper userMapper;
    private final WorkMapper workMapper;
    private final AssetMapper assetMapper;

    public TeamService(
            TeamMapper teamMapper,
            TeamMemberMapper teamMemberMapper,
            UserMapper userMapper,
            WorkMapper workMapper,
            AssetMapper assetMapper) {
        this.teamMapper = teamMapper;
        this.teamMemberMapper = teamMemberMapper;
        this.userMapper = userMapper;
        this.workMapper = workMapper;
        this.assetMapper = assetMapper;
    }

    public boolean isMember(Long teamId, Long userId) {
        if (teamId == null || userId == null) {
            return false;
        }
        Long count = teamMemberMapper.selectCount(
                new LambdaQueryWrapper<TeamMember>()
                        .eq(TeamMember::getTeamId, teamId)
                        .eq(TeamMember::getUserId, userId));
        return count != null && count > 0;
    }

    public void assertMember(Long teamId, Long userId) {
        if (!isMember(teamId, userId)) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
    }

    @Transactional
    public TeamVO create(TeamCreateRequest request, AuthUser user) {
        requireLogin(user);
        String name = requireName(request == null ? null : request.name());

        Team team = new Team();
        team.setName(name);
        team.setOwnerId(user.id());
        teamMapper.insert(team);

        TeamMember membership = new TeamMember();
        membership.setTeamId(team.getId());
        membership.setUserId(user.id());
        membership.setRole(TeamAccess.ROLE_OWNER);
        teamMemberMapper.insert(membership);

        return toVo(team, membership.getRole());
    }

    public List<TeamVO> listMine(AuthUser user) {
        requireLogin(user);
        List<TeamMember> memberships = teamMemberMapper.selectList(
                new LambdaQueryWrapper<TeamMember>().eq(TeamMember::getUserId, user.id()));
        if (memberships.isEmpty()) {
            return List.of();
        }
        Map<Long, String> roleByTeamId = memberships.stream()
                .collect(Collectors.toMap(TeamMember::getTeamId, TeamMember::getRole, (a, b) -> a));
        List<Team> teams = teamMapper.selectList(
                new LambdaQueryWrapper<Team>().in(Team::getId, roleByTeamId.keySet()));
        return teams.stream()
                .map(team -> toVo(team, roleByTeamId.get(team.getId())))
                .toList();
    }

    public TeamVO get(Long id, AuthUser user) {
        requireLogin(user);
        Team team = requireTeam(id);
        TeamMember membership = requireMembership(id, user.id());
        return toVo(team, membership.getRole());
    }

    public TeamVO update(Long id, TeamUpdateRequest request, AuthUser user) {
        requireLogin(user);
        Team team = requireTeam(id);
        TeamMember actor = requireMembership(id, user.id());
        if (!TeamAccess.canManageMembers(actor.getRole())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        team.setName(requireName(request == null ? null : request.name()));
        teamMapper.updateById(team);
        return toVo(team, actor.getRole());
    }

    @Transactional
    public void delete(Long id, AuthUser user) {
        requireLogin(user);
        requireTeam(id);
        TeamMember actor = requireMembership(id, user.id());
        if (!TeamAccess.canDeleteTeam(actor.getRole())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }

        teamMemberMapper.delete(new LambdaQueryWrapper<TeamMember>().eq(TeamMember::getTeamId, id));

        workMapper.update(null, new UpdateWrapper<Work>()
                .eq("team_id", id)
                .set("team_id", null));
        assetMapper.update(null, new UpdateWrapper<Asset>()
                .eq("team_id", id)
                .set("team_id", null));

        teamMapper.deleteById(id);
    }

    public List<TeamMemberVO> listMembers(Long id, AuthUser user) {
        requireLogin(user);
        requireTeam(id);
        requireMembership(id, user.id());
        List<TeamMember> members = teamMemberMapper.selectList(
                new LambdaQueryWrapper<TeamMember>().eq(TeamMember::getTeamId, id));
        Map<Long, User> users = loadUsers(members.stream().map(TeamMember::getUserId).toList());
        return members.stream().map(member -> toMemberVo(member, users.get(member.getUserId()))).toList();
    }

    public TeamMemberVO addMember(Long id, AddMemberRequest request, AuthUser user) {
        requireLogin(user);
        requireTeam(id);
        TeamMember actor = requireMembership(id, user.id());
        if (!TeamAccess.canManageMembers(actor.getRole())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        User invited = resolveUser(request);
        Long already = teamMemberMapper.selectCount(
                new LambdaQueryWrapper<TeamMember>()
                        .eq(TeamMember::getTeamId, id)
                        .eq(TeamMember::getUserId, invited.getId()));
        if (already != null && already > 0) {
            throw new BizException(ErrorCode.CONFLICT);
        }

        TeamMember membership = new TeamMember();
        membership.setTeamId(id);
        membership.setUserId(invited.getId());
        membership.setRole(TeamAccess.ROLE_MEMBER);
        teamMemberMapper.insert(membership);
        return toMemberVo(membership, invited);
    }

    public void removeMember(Long id, Long userId, AuthUser user) {
        requireLogin(user);
        requireTeam(id);
        TeamMember actor = requireMembership(id, user.id());
        TeamMember target = teamMemberMapper.selectOne(
                new LambdaQueryWrapper<TeamMember>()
                        .eq(TeamMember::getTeamId, id)
                        .eq(TeamMember::getUserId, userId));
        if (target == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        if (!TeamAccess.canRemoveMember(actor.getRole(), target.getRole())) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        teamMemberMapper.deleteById(target.getId());
    }

    public PageData<WorkVO> listWorks(Long id, int page, int size, AuthUser user) {
        requireLogin(user);
        requireTeam(id);
        requireMembership(id, user.id());

        Page<Work> mpPage = new Page<>(normalizePage(page), normalizeSize(size));
        LambdaQueryWrapper<Work> wrapper = new LambdaQueryWrapper<Work>()
                .eq(Work::getTeamId, id)
                .orderByDesc(Work::getUpdatedAt);
        Page<Work> result = workMapper.selectPage(mpPage, wrapper);
        List<WorkVO> records = result.getRecords().stream().map(this::toWorkVo).toList();
        return PageData.of(result.getTotal(), result.getCurrent(), result.getSize(), records);
    }

    public PageData<AssetVO> listAssets(Long id, int page, int size, AuthUser user) {
        requireLogin(user);
        requireTeam(id);
        requireMembership(id, user.id());

        Page<Asset> mpPage = new Page<>(normalizePage(page), normalizeSize(size));
        LambdaQueryWrapper<Asset> wrapper = new LambdaQueryWrapper<Asset>()
                .eq(Asset::getTeamId, id)
                .orderByDesc(Asset::getCreatedAt);
        Page<Asset> result = assetMapper.selectPage(mpPage, wrapper);
        List<AssetVO> records = result.getRecords().stream().map(this::toAssetVo).toList();
        return PageData.of(result.getTotal(), result.getCurrent(), result.getSize(), records);
    }

    private User resolveUser(AddMemberRequest request) {
        boolean hasUserId = request != null && request.userId() != null;
        boolean hasUsername = request != null && hasText(request.username());
        if (hasUserId == hasUsername) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        User user;
        if (hasUserId) {
            user = userMapper.selectById(request.userId());
        } else {
            user = userMapper.selectOne(
                    new LambdaQueryWrapper<User>().eq(User::getUsername, request.username()));
        }
        if (user == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return user;
    }

    private Team requireTeam(Long id) {
        Team team = teamMapper.selectById(id);
        if (team == null) {
            throw new BizException(ErrorCode.NOT_FOUND);
        }
        return team;
    }

    private TeamMember requireMembership(Long teamId, Long userId) {
        TeamMember membership = teamMemberMapper.selectOne(
                new LambdaQueryWrapper<TeamMember>()
                        .eq(TeamMember::getTeamId, teamId)
                        .eq(TeamMember::getUserId, userId));
        if (membership == null) {
            throw new BizException(ErrorCode.FORBIDDEN);
        }
        return membership;
    }

    private Map<Long, User> loadUsers(List<Long> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        List<Long> distinct = userIds.stream().filter(Objects::nonNull).distinct().toList();
        if (distinct.isEmpty()) {
            return Map.of();
        }
        return userMapper.selectList(new LambdaQueryWrapper<User>().in(User::getId, distinct)).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }

    private static String requireName(String name) {
        if (!hasText(name) || name.length() > 64) {
            throw new BizException(ErrorCode.BAD_REQUEST);
        }
        return name;
    }

    private static void requireLogin(AuthUser user) {
        if (user == null) {
            throw new BizException(ErrorCode.UNAUTHORIZED);
        }
    }

    private static TeamVO toVo(Team team, String myRole) {
        return new TeamVO(team.getId(), team.getName(), team.getOwnerId(), myRole, team.getCreatedAt());
    }

    private static TeamMemberVO toMemberVo(TeamMember membership, User user) {
        return new TeamMemberVO(
                membership.getId(),
                membership.getTeamId(),
                membership.getUserId(),
                user == null ? null : user.getUsername(),
                user == null ? null : user.getNickname(),
                membership.getRole(),
                membership.getJoinedAt());
    }

    private WorkVO toWorkVo(Work work) {
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

    private AssetVO toAssetVo(Asset asset) {
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

    private static int normalizePage(int page) {
        return page < 1 ? 1 : page;
    }

    private static int normalizeSize(int size) {
        if (size < 1) {
            return 12;
        }
        return Math.min(size, 50);
    }

    private static boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
