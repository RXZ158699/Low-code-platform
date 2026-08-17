package com.design.platform.template;

import com.design.platform.security.AuthUser;
import com.design.platform.template.entity.Template;
import com.design.platform.template.service.TemplateAccess;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class TemplateAccessTest {

    @Test
    void publicTemplateReadableByAnonymousButNotWritable() {
        Template template = template(true, 1L);
        assertTrue(TemplateAccess.canRead(template, null));
        assertFalse(TemplateAccess.canWrite(template, null));
    }

    @Test
    void privateTemplateNotAccessibleByAnonymous() {
        Template template = template(false, 1L);
        assertFalse(TemplateAccess.canRead(template, null));
        assertFalse(TemplateAccess.canWrite(template, null));
    }

    @Test
    void authorCanReadAndWritePrivateTemplate() {
        Template template = template(false, 1L);
        AuthUser author = new AuthUser(1L, "alice", "USER");
        assertTrue(TemplateAccess.canRead(template, author));
        assertTrue(TemplateAccess.canWrite(template, author));
    }

    @Test
    void otherUserCannotReadOrWritePrivateTemplate() {
        Template template = template(false, 1L);
        AuthUser other = new AuthUser(2L, "bob", "USER");
        assertFalse(TemplateAccess.canRead(template, other));
        assertFalse(TemplateAccess.canWrite(template, other));
    }

    @Test
    void otherUserCanReadPublicButCannotWrite() {
        Template template = template(true, 1L);
        AuthUser other = new AuthUser(2L, "bob", "USER");
        assertTrue(TemplateAccess.canRead(template, other));
        assertFalse(TemplateAccess.canWrite(template, other));
    }

    @Test
    void adminCanReadAndWritePrivateTemplate() {
        Template template = template(false, 1L);
        AuthUser admin = new AuthUser(99L, "root", "ADMIN");
        assertTrue(TemplateAccess.canRead(template, admin));
        assertTrue(TemplateAccess.canWrite(template, admin));
    }

    private static Template template(boolean isPublic, Long authorId) {
        Template template = new Template();
        template.setIsPublic(isPublic);
        template.setAuthorId(authorId);
        return template;
    }
}
