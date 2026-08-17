package com.design.platform.team;

import com.design.platform.team.service.TeamAccess;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TeamAccessTest {

    @Test
    void ownerCanManageMembers() {
        assertTrue(TeamAccess.canManageMembers("OWNER"));
    }

    @Test
    void memberCannotManageMembers() {
        assertFalse(TeamAccess.canManageMembers("MEMBER"));
    }

    @Test
    void adminCannotDeleteTeam() {
        assertFalse(TeamAccess.canDeleteTeam("ADMIN"));
    }

    @Test
    void ownerCanDeleteTeam() {
        assertTrue(TeamAccess.canDeleteTeam("OWNER"));
    }

    @Test
    void cannotRemoveOwnerRegardlessOfActorRole() {
        assertFalse(TeamAccess.canRemoveMember("OWNER", "OWNER"));
        assertFalse(TeamAccess.canRemoveMember("ADMIN", "OWNER"));
        assertFalse(TeamAccess.canRemoveMember("MEMBER", "OWNER"));
    }
}
