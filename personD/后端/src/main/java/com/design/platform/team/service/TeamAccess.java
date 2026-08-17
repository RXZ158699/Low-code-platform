package com.design.platform.team.service;

public final class TeamAccess {

    public static final String ROLE_OWNER = "OWNER";
    public static final String ROLE_ADMIN = "ADMIN";
    public static final String ROLE_MEMBER = "MEMBER";

    private TeamAccess() {
    }

    public static boolean canManageMembers(String role) {
        return ROLE_OWNER.equals(role) || ROLE_ADMIN.equals(role);
    }

    public static boolean canDeleteTeam(String role) {
        return ROLE_OWNER.equals(role);
    }

    public static boolean canRemoveMember(String actorRole, String targetRole) {
        if (ROLE_OWNER.equals(targetRole)) {
            return false;
        }
        return canManageMembers(actorRole);
    }
}
