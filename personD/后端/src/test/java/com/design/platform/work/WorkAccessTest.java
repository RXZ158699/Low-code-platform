package com.design.platform.work;

import com.design.platform.work.entity.Work;
import com.design.platform.work.service.WorkAccess;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class WorkAccessTest {

    @Test
    void ownerCanReadAndWrite() {
        Work work = work(1L);
        assertTrue(WorkAccess.canRead(work, 1L, false));
        assertTrue(WorkAccess.canWrite(work, 1L));
    }

    @Test
    void nonOwnerNonMemberCannotRead() {
        Work work = work(1L);
        assertFalse(WorkAccess.canRead(work, 2L, false));
    }

    @Test
    void nonOwnerMemberCanReadButNotWrite() {
        Work work = work(1L);
        assertTrue(WorkAccess.canRead(work, 2L, true));
        assertFalse(WorkAccess.canWrite(work, 2L));
    }

    @Test
    void nonOwnerCannotWrite() {
        Work work = work(1L);
        assertFalse(WorkAccess.canWrite(work, 2L));
    }

    private static Work work(Long ownerId) {
        Work work = new Work();
        work.setUserId(ownerId);
        return work;
    }
}
