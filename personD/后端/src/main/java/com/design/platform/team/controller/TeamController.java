package com.design.platform.team.controller;

import com.design.platform.asset.dto.AssetVO;
import com.design.platform.common.api.PageData;
import com.design.platform.common.api.Result;
import com.design.platform.security.SecurityUtils;
import com.design.platform.team.dto.AddMemberRequest;
import com.design.platform.team.dto.TeamCreateRequest;
import com.design.platform.team.dto.TeamMemberVO;
import com.design.platform.team.dto.TeamUpdateRequest;
import com.design.platform.team.dto.TeamVO;
import com.design.platform.team.service.TeamService;
import com.design.platform.work.dto.WorkVO;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/teams")
public class TeamController {

    private final TeamService teamService;

    public TeamController(TeamService teamService) {
        this.teamService = teamService;
    }

    @PostMapping
    public Result<TeamVO> create(@RequestBody TeamCreateRequest request) {
        return Result.ok(teamService.create(request, SecurityUtils.requireUser()));
    }

    @GetMapping
    public Result<List<TeamVO>> list() {
        return Result.ok(teamService.listMine(SecurityUtils.requireUser()));
    }

    @GetMapping("/{id}")
    public Result<TeamVO> get(@PathVariable Long id) {
        return Result.ok(teamService.get(id, SecurityUtils.requireUser()));
    }

    @PutMapping("/{id}")
    public Result<TeamVO> update(@PathVariable Long id, @RequestBody TeamUpdateRequest request) {
        return Result.ok(teamService.update(id, request, SecurityUtils.requireUser()));
    }

    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        teamService.delete(id, SecurityUtils.requireUser());
        return Result.ok();
    }

    @GetMapping("/{id}/members")
    public Result<List<TeamMemberVO>> listMembers(@PathVariable Long id) {
        return Result.ok(teamService.listMembers(id, SecurityUtils.requireUser()));
    }

    @PostMapping("/{id}/members")
    public Result<TeamMemberVO> addMember(@PathVariable Long id, @RequestBody AddMemberRequest request) {
        return Result.ok(teamService.addMember(id, request, SecurityUtils.requireUser()));
    }

    @DeleteMapping("/{id}/members/{userId}")
    public Result<Void> removeMember(@PathVariable Long id, @PathVariable Long userId) {
        teamService.removeMember(id, userId, SecurityUtils.requireUser());
        return Result.ok();
    }

    @GetMapping("/{id}/works")
    public Result<PageData<WorkVO>> listWorks(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size) {
        return Result.ok(teamService.listWorks(id, page, size, SecurityUtils.requireUser()));
    }

    @GetMapping("/{id}/assets")
    public Result<PageData<AssetVO>> listAssets(
            @PathVariable Long id,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "12") int size) {
        return Result.ok(teamService.listAssets(id, page, size, SecurityUtils.requireUser()));
    }
}
