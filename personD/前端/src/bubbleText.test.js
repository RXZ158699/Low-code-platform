import { describe, expect, it } from "vitest";
import {
  BUBBLE_TEXT_SECTIONS,
  bubblePath,
  findBubbleTextPreset,
  getBubbleProps,
} from "./bubbleText.js";

describe("bubble text presets", () => {
  it("contains all ten requested categories", () => {
    expect(BUBBLE_TEXT_SECTIONS.map((section) => section.title)).toEqual([
      "毕业季",
      "生日",
      "节气",
      "价格标签",
      "复古",
      "综艺",
      "杂质风",
      "爆炸贴",
      "印章",
      "开工大吉",
    ]);
  });

  it("provides three presets for every category", () => {
    for (const section of BUBBLE_TEXT_SECTIONS) {
      expect(section.presets).toHaveLength(3);
    }
  });

  it("finds a preset and normalizes bubble props", () => {
    const preset = findBubbleTextPreset("birthday-burst");
    expect(preset).toBeTruthy();
    expect(preset.textStyle).toMatchObject({ fontSize: 42 });

    const props = getBubbleProps({
      bubble: { kind: "speech", fill: "#ffffff", stroke: "#000000" },
    });
    expect(props.kind).toBe("speech");
    expect(props.strokeWidth).toBeGreaterThan(0);
    expect(getBubbleProps({})).toBeNull();
  });

  it("generates a path for every bubble kind", () => {
    const kinds = [
      "rounded",
      "speech",
      "cloud",
      "ribbon",
      "sticker",
      "burst",
      "tag",
      "card",
      "halo",
      "stamp",
    ];
    for (const kind of kinds) {
      expect(bubblePath(kind, 200, 120, { radius: 16 })).toContain("M");
    }
  });
});
