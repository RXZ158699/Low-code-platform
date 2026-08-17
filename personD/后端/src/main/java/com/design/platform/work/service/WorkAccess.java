package com.design.platform.work.service;

import com.design.platform.work.entity.Work;

public final class WorkAccess {

    private WorkAccess() {
    }

    public static boolean canRead(Work work, Long userId, boolean isTeamMember) {
        if (work == null || userId == null) {
            return false;
        }
        if (userId.equals(work.getUserId())) {
            return true;
        }
        return isTeamMember;
    }

    public static boolean canWrite(Work work, Long userId) {
        if (work == null || userId == null) {
            return false;
        }
        return userId.equals(work.getUserId());
    }
}
