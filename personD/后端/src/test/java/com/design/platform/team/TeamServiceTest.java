package com.design.platform.team;

import com.baomidou.mybatisplus.core.conditions.Wrapper;
import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
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
import com.design.platform.team.service.TeamService;
import com.design.platform.user.entity.User;
import com.design.platform.user.mapper.UserMapper;
import com.design.platform.work.dto.WorkVO;
import com.design.platform.work.entity.Work;
import com.design.platform.work.mapper.WorkMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TeamServiceTest {

    private TeamMapper teamMapper;
    private TeamMemberMapper teamMemberMapper;
    private UserMapper userMapper;
    private WorkMapper workMapper;
    private AssetMapper assetMapper;
    private TeamService teamService;

    private final AuthUser owner = new AuthUser(1L, "alice", "USER");
    private final AuthUser admin = new AuthUser(2L, "bob", "USER");
    private final AuthUser member = new AuthUser(3L, "carol", "USER");
    private final AuthUser stranger = new AuthUser(4L, "dave", "USER");

    @BeforeEach
    void setUp() {
        teamMapper = mock(TeamMapper.class);
        teamMemberMapper = mock(TeamMemberMapper.class);
        userMapper = mock(UserMapper.class);
        workMapper = mock(WorkMapper.class);
        assetMapper = mock(AssetMapper.class);
        teamService = new TeamService(teamMapper, teamMemberMapper, userMapper, workMapper, assetMapper);
    }

    @Test
    void createInsertsTeamAndOwnerMember() {
        when(teamMapper.insert(any(Team.class))).thenAnswer(invocation -> {
            Team team = invocation.getArgument(0);
            team.setId(10L);
            return 1;
        });
        when(teamMemberMapper.insert(any(TeamMember.class))).thenAnswer(invocation -> {
            TeamMember membership = invocation.getArgument(0);
            membership.setId(1L);
            return 1;
        });

        TeamVO vo = teamService.create(new TeamCreateRequest("设计组"), owner);

        assertEquals(10L, vo.id());
        assertEquals("设计组", vo.name());
        assertEquals(owner.id(), vo.ownerId());
        assertEquals("OWNER", vo.myRole());
        verify(teamMapper).insert(any(Team.class));
        verify(teamMemberMapper).insert(any(TeamMember.class));
    }

    @Test
    void getForbiddenForNonMember() {
        when(teamMapper.selectById(10L)).thenReturn(sampleTeam());
        when(teamMemberMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(null);

        BizException ex = assertThrows(BizException.class, () -> teamService.get(10L, stranger));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    void updateNameRequiresOwnerOrAdmin() {
        when(teamMapper.selectById(10L)).thenReturn(sampleTeam());
        when(teamMemberMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(memberOf(member.id(), "MEMBER"));

        BizException ex = assertThrows(
                BizException.class,
                () -> teamService.update(10L, new TeamUpdateRequest("新名字"), member));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        verify(teamMapper, never()).updateById(any(Team.class));
    }

    @Test
    void deleteTeamOnlyOwnerAndNullsTeamIds() {
        when(teamMapper.selectById(10L)).thenReturn(sampleTeam());
        when(teamMemberMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(memberOf(admin.id(), "ADMIN"));

        BizException adminDenied = assertThrows(BizException.class, () -> teamService.delete(10L, admin));
        assertEquals(ErrorCode.FORBIDDEN, adminDenied.getErrorCode());
        verify(teamMapper, never()).deleteById(10L);

        when(teamMemberMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(memberOf(owner.id(), "OWNER"));
        when(teamMemberMapper.delete(any(Wrapper.class))).thenReturn(3);
        when(workMapper.update(isNull(), any(Wrapper.class))).thenReturn(2);
        when(assetMapper.update(isNull(), any(Wrapper.class))).thenReturn(1);
        when(teamMapper.deleteById(10L)).thenReturn(1);

        teamService.delete(10L, owner);

        verify(teamMemberMapper).delete(any(Wrapper.class));
        verify(workMapper).update(isNull(), any(Wrapper.class));
        verify(assetMapper).update(isNull(), any(Wrapper.class));
        verify(teamMapper).deleteById(10L);
    }

    @Test
    void addMemberByUserIdOrUsername() {
        stubActor(owner.id(), "OWNER");
        User invited = user(5L, "erin", "Erin");
        when(userMapper.selectById(5L)).thenReturn(invited);
        when(teamMemberMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
        when(teamMemberMapper.insert(any(TeamMember.class))).thenAnswer(invocation -> {
            TeamMember membership = invocation.getArgument(0);
            membership.setId(9L);
            return 1;
        });

        TeamMemberVO byId = teamService.addMember(10L, new AddMemberRequest(5L, null), owner);
        assertEquals(5L, byId.userId());
        assertEquals("MEMBER", byId.role());
        assertEquals("erin", byId.username());

        when(userMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(invited);
        TeamMemberVO byName = teamService.addMember(10L, new AddMemberRequest(null, "erin"), owner);
        assertEquals(5L, byName.userId());
    }

    @Test
    void addMemberMissingUserReturnsNotFound() {
        stubActor(owner.id(), "OWNER");
        when(userMapper.selectById(99L)).thenReturn(null);

        BizException ex = assertThrows(
                BizException.class,
                () -> teamService.addMember(10L, new AddMemberRequest(99L, null), owner));
        assertEquals(ErrorCode.NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void addMemberAlreadyMemberConflicts() {
        stubActor(owner.id(), "OWNER");
        when(userMapper.selectById(3L)).thenReturn(user(3L, "carol", "Carol"));
        when(teamMemberMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);

        BizException ex = assertThrows(
                BizException.class,
                () -> teamService.addMember(10L, new AddMemberRequest(3L, null), owner));
        assertEquals(ErrorCode.CONFLICT, ex.getErrorCode());
    }

    @Test
    void cannotRemoveOwner() {
        stubActor(owner.id(), "OWNER");
        when(teamMemberMapper.selectOne(any(LambdaQueryWrapper.class)))
                .thenReturn(memberOf(owner.id(), "OWNER"))
                .thenReturn(memberOf(owner.id(), "OWNER"));

        BizException ex = assertThrows(BizException.class, () -> teamService.removeMember(10L, owner.id(), owner));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
        verify(teamMemberMapper, never()).deleteById(owner.id());
    }

    @Test
    void isMemberAndAssertMember() {
        when(teamMemberMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(1L);
        assertTrue(teamService.isMember(10L, owner.id()));
        teamService.assertMember(10L, owner.id());

        when(teamMemberMapper.selectCount(any(LambdaQueryWrapper.class))).thenReturn(0L);
        assertFalse(teamService.isMember(10L, stranger.id()));
        BizException ex = assertThrows(BizException.class, () -> teamService.assertMember(10L, stranger.id()));
        assertEquals(ErrorCode.FORBIDDEN, ex.getErrorCode());
    }

    @Test
    @SuppressWarnings("unchecked")
    void listWorksRequiresMember() {
        stubActor(member.id(), "MEMBER");
        when(workMapper.selectPage(any(Page.class), any(LambdaQueryWrapper.class))).thenAnswer(invocation -> {
            Page<Work> page = invocation.getArgument(0);
            Work work = new Work();
            work.setId(7L);
            work.setUserId(1L);
            work.setTitle("共享海报");
            work.setStatus("DRAFT");
            work.setTeamId(10L);
            page.setTotal(1);
            page.setRecords(List.of(work));
            return page;
        });

        PageData<WorkVO> result = teamService.listWorks(10L, 1, 12, member);
        assertEquals(1, result.getTotal());
        assertEquals("共享海报", result.getRecords().get(0).title());
    }

    private void stubActor(Long userId, String role) {
        when(teamMapper.selectById(10L)).thenReturn(sampleTeam());
        when(teamMemberMapper.selectOne(any(LambdaQueryWrapper.class))).thenReturn(memberOf(userId, role));
    }

    private static Team sampleTeam() {
        Team team = new Team();
        team.setId(10L);
        team.setName("设计组");
        team.setOwnerId(1L);
        return team;
    }

    private static TeamMember memberOf(Long userId, String role) {
        TeamMember membership = new TeamMember();
        membership.setId(userId);
        membership.setTeamId(10L);
        membership.setUserId(userId);
        membership.setRole(role);
        return membership;
    }

    private static User user(Long id, String username, String nickname) {
        User user = new User();
        user.setId(id);
        user.setUsername(username);
        user.setNickname(nickname);
        user.setRole("USER");
        return user;
    }
}
