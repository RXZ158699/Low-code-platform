package com.design.platform.asset.service;

import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;

import java.util.Locale;
import java.util.Map;
import java.util.Set;

public final class AssetTypeRules {

    private static final Map<String, Set<String>> ALLOWED = Map.of(
            "image", Set.of("jpg", "jpeg", "png", "webp", "gif"),
            "video", Set.of("mp4", "webm"),
            "font", Set.of("ttf", "otf", "woff2"),
            "audio", Set.of("mp3", "wav")
    );

    private AssetTypeRules() {
    }

    public static boolean match(String fileType, String filename) {
        if (fileType == null || fileType.isBlank()) {
            throw new BizException(ErrorCode.UNSUPPORTED_TYPE);
        }
        Set<String> extensions = ALLOWED.get(fileType.trim().toLowerCase(Locale.ROOT));
        if (extensions == null) {
            throw new BizException(ErrorCode.UNSUPPORTED_TYPE);
        }
        String ext = extensionOf(filename);
        return ext != null && extensions.contains(ext);
    }

    private static String extensionOf(String filename) {
        if (filename == null || filename.isBlank()) {
            return null;
        }
        String lower = filename.toLowerCase(Locale.ROOT);
        int dot = lower.lastIndexOf('.');
        if (dot < 0 || dot == lower.length() - 1) {
            return null;
        }
        return lower.substring(dot + 1);
    }
}
