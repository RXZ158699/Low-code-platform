package com.design.platform.template.service;

import com.design.platform.security.AuthUser;
import com.design.platform.template.entity.Template;

public final class TemplateAccess {

    private TemplateAccess() {
    }

    public static boolean canRead(Template template, AuthUser viewer) {
        if (template == null) {
            return false;
        }
        if (Boolean.TRUE.equals(template.getIsPublic())) {
            return true;
        }
        return isAuthorOrAdmin(template, viewer);
    }

    public static boolean canWrite(Template template, AuthUser viewer) {
        if (template == null) {
            return false;
        }
        return isAuthorOrAdmin(template, viewer);
    }

    private static boolean isAuthorOrAdmin(Template template, AuthUser viewer) {
        if (viewer == null) {
            return false;
        }
        if ("ADMIN".equals(viewer.role())) {
            return true;
        }
        return template.getAuthorId() != null && template.getAuthorId().equals(viewer.id());
    }
}
