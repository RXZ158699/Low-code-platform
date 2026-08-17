package com.design.platform.storage;

import java.time.LocalDate;
import java.util.Locale;

public final class ObjectKeys {

    private ObjectKeys() {
    }

    public static String of(String originalFilename, LocalDate date, String uuid) {
        String ext = "";
        if (originalFilename != null) {
            int dot = originalFilename.lastIndexOf('.');
            if (dot >= 0) {
                ext = originalFilename.substring(dot).toLowerCase(Locale.ROOT);
            }
        }
        return "%04d/%02d/%s%s".formatted(date.getYear(), date.getMonthValue(), uuid, ext);
    }
}
