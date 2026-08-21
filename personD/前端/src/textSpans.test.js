import { describe, expect, it } from "vitest";
import { getSelectionRects, hitTestTextOffset } from "./canvas.js";
import { applyTextStyle, getTextSpans, itemForStylePanel, resolvedStyleAt } from "./textSpans.js";

const sample = {
  type: "text",
  text: "你好世界",
  color: "#111827",
  fontSize: 20,
  width: 400,
  height: 80,
};

describe("textSpans", () => {
  it("treats plain text as a single span", () => {
    expect(getTextSpans(sample)).toEqual([{ text: "你好世界" }]);
  });

  it("applies a color to the whole box and clears span overrides", () => {
    const mixed = applyTextStyle(sample, { start: 0, end: 2 }, { color: "#ff0000" });
    const next = applyTextStyle({ ...sample, ...mixed }, null, { color: "#00ff00" });
    expect(next.color).toBe("#00ff00");
    expect(next.spans).toEqual([{ text: "你好世界" }]);
  });

  it("applies a color only to the selected characters", () => {
    const next = applyTextStyle(sample, { start: 2, end: 4 }, { color: "#ff0000" });
    expect(next.color).toBeUndefined();
    expect(next.spans).toEqual([
      { text: "你好" },
      { text: "世界", color: "#ff0000" },
    ]);
  });

  it("merges adjacent spans that share the same style", () => {
    const first = applyTextStyle(sample, { start: 0, end: 2 }, { color: "#ff0000" });
    const second = applyTextStyle({ ...sample, ...first }, { start: 2, end: 4 }, { color: "#ff0000" });
    expect(second.spans).toEqual([{ text: "你好世界", color: "#ff0000" }]);
  });

  it("resolves the style at a caret for the properties panel", () => {
    const styled = { ...sample, ...applyTextStyle(sample, { start: 2, end: 4 }, { color: "#ff0000" }) };
    expect(resolvedStyleAt(styled, 0).color).toBe("#111827");
    expect(resolvedStyleAt(styled, 2).color).toBe("#ff0000");
    expect(itemForStylePanel(styled, { start: 2, end: 4 }).color).toBe("#ff0000");
  });

  it("applies bold italic underline and strike only to the selected characters", () => {
    const next = applyTextStyle(sample, { start: 2, end: 4 }, {
      fontWeight: 700,
      italic: true,
      underline: true,
      strikethrough: true,
    });
    expect(next.fontWeight).toBeUndefined();
    expect(next.spans).toEqual([
      { text: "你好" },
      { text: "世界", fontWeight: 700, italic: true, underline: true, strikethrough: true },
    ]);
    const styled = { ...sample, ...next };
    expect(resolvedStyleAt(styled, 0).fontWeight).not.toBe(700);
    expect(resolvedStyleAt(styled, 0).italic).not.toBe(true);
    expect(resolvedStyleAt(styled, 2).fontWeight).toBe(700);
    expect(resolvedStyleAt(styled, 2).italic).toBe(true);
    expect(itemForStylePanel(styled, { start: 2, end: 4 }).underline).toBe(true);
  });

  it("keeps span styles aligned when extra characters are appended", () => {
    const styled = { ...sample, ...applyTextStyle(sample, { start: 2, end: 4 }, { highlight: "#fde047" }) };
    const spans = getTextSpans({ ...styled, text: "你好世界啊" });
    expect(spans.map((span) => span.text).join("")).toBe("你好世界啊");
    expect(spans.find((span) => span.highlight === "#fde047").text).toBe("世界");
    expect(spans.at(-1)).toEqual({ text: "啊" });
  });

  it("hits a glyph from local coordinates", () => {
    const item = { ...sample, text: "AAAA", fontSize: 20, letterSpacing: 0, autoWidth: false, width: 400 };
    const offset = hitTestTextOffset(item, 4 + 11 * 0.5, 10);
    expect(offset).toBeGreaterThanOrEqual(0);
    expect(offset).toBeLessThanOrEqual(4);
    const rects = getSelectionRects(item, 0, 2);
    expect(rects.length).toBeGreaterThan(0);
    expect(rects[0].width).toBeGreaterThan(0);
  });
});
