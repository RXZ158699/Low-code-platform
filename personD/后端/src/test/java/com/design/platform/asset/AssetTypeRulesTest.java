package com.design.platform.asset;

import com.design.platform.asset.service.AssetTypeRules;
import com.design.platform.common.error.BizException;
import com.design.platform.common.error.ErrorCode;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AssetTypeRulesTest {

    @Test
    void matchImagePng() {
        assertTrue(AssetTypeRules.match("image", "a.png"));
    }

    @Test
    void matchImageExeRejected() {
        assertFalse(AssetTypeRules.match("image", "a.exe"));
    }

    @Test
    void matchVideoMp4() {
        assertTrue(AssetTypeRules.match("video", "a.mp4"));
    }

    @Test
    void matchFontWoff2() {
        assertTrue(AssetTypeRules.match("font", "a.woff2"));
    }

    @Test
    void matchAudioMp3() {
        assertTrue(AssetTypeRules.match("audio", "a.mp3"));
    }

    @Test
    void unknownFileTypeThrowsUnsupportedType() {
        BizException ex = assertThrows(BizException.class, () -> AssetTypeRules.match("doc", "a.pdf"));
        assertEquals(ErrorCode.UNSUPPORTED_TYPE, ex.getErrorCode());
    }

    @Test
    void matchAllowsAllDeclaredExtensions() {
        assertTrue(AssetTypeRules.match("image", "a.jpg"));
        assertTrue(AssetTypeRules.match("image", "a.jpeg"));
        assertTrue(AssetTypeRules.match("image", "a.webp"));
        assertTrue(AssetTypeRules.match("image", "a.gif"));
        assertTrue(AssetTypeRules.match("video", "a.webm"));
        assertTrue(AssetTypeRules.match("font", "a.ttf"));
        assertTrue(AssetTypeRules.match("font", "a.otf"));
        assertTrue(AssetTypeRules.match("audio", "a.wav"));
    }
}
