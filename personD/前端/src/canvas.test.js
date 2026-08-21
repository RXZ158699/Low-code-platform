import { describe, expect, it } from "vitest";
import {
  addRectElement,
  addTextElement,
  applyHandleResize,
  applyTextHandleResize,
  clampCanvasZoom,
  createEmptyCanvas,
  duplicateElement,
  fitTextBox,
  formatTextContent,
  getHighlightEllipses,
  getTextGlyphs,
  getTextProps,
  isBlankText,
  MIN_ELEMENT_SIZE,
  moveElementLayer,
  parseCanvas,
  patchTextElement,
  removeElement,
  stringifyCanvas,
  TEXT_BOX_MAX_WIDTH,
  textElementStyle,
  textFillPaint,
  textGlyphStyle,
  textStrokeLayerStyle,
  zoomByWheelDelta,
} from "./canvas.js";

describe("canvas helpers", () => {
  it("falls back to a default artboard when json is empty", () => {
    expect(parseCanvas(null)).toEqual({
      width: 1080,
      height: 1440,
      background: "#ffffff",
      backgroundOpacity: 100,
      elements: [],
    });
    expect(parseCanvas("{")).toEqual({
      width: 1080,
      height: 1440,
      background: "#ffffff",
      backgroundOpacity: 100,
      elements: [],
    });
  });

  it("builds an empty canvas with the given size", () => {
    expect(createEmptyCanvas(1242, 2208)).toEqual({
      width: 1242,
      height: 2208,
      background: "#ffffff",
      backgroundOpacity: 100,
      elements: [],
    });
  });

  it("round-trips text elements", () => {
    const next = addTextElement(parseCanvas('{"width":800,"height":600,"elements":[]}'));
    expect(next.width).toBe(800);
    expect(next.elements).toHaveLength(1);
    expect(JSON.parse(stringifyCanvas(next)).elements[0].type).toBe("text");
  });

  it("removes an element by id", () => {
    const withText = addTextElement(parseCanvas('{"width":800,"height":600,"elements":[]}'));
    const withRect = addRectElement(withText);
    const removed = removeElement(withRect, withText.elements[0].id);
    expect(removed.elements).toHaveLength(1);
    expect(removed.elements[0].type).toBe("rect");
  });

  it("resizes a box from each handle direction", () => {
    const box = { x: 10, y: 20, width: 100, height: 80 };
    expect(applyHandleResize(box, "se", 10, 20)).toEqual({ x: 10, y: 20, width: 110, height: 100 });
    expect(applyHandleResize(box, "nw", 10, 20)).toEqual({ x: 20, y: 40, width: 90, height: 60 });
    expect(applyHandleResize(box, "e", 30, 0).width).toBe(130);
    expect(applyHandleResize(box, "n", 0, 10).height).toBe(70);
  });

  it("keeps aspect ratio when lockAspect is on", () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    expect(applyHandleResize(box, "se", 50, 0, MIN_ELEMENT_SIZE, true)).toEqual({
      x: 10,
      y: 20,
      width: 150,
      height: 75,
    });
    const east = applyHandleResize(box, "e", 50, 0, MIN_ELEMENT_SIZE, true);
    expect(east).toEqual({ x: 10, y: 7.5, width: 150, height: 75 });
    const north = applyHandleResize(box, "n", 0, 10, MIN_ELEMENT_SIZE, true);
    expect(north).toEqual({ x: 20, y: 30, width: 80, height: 40 });
  });

  it("scales text font size with the box on handle resize", () => {
    const item = {
      type: "text",
      text: "Hi",
      x: 0,
      y: 0,
      width: 100,
      height: 40,
      fontSize: 20,
    };
    const next = applyTextHandleResize(item, "e", 50, 0);
    expect(next.width).toBe(150);
    expect(next.fontSize).toBe(30);
    expect(next.autoWidth).toBe(false);
  });

  it("clamps and steps canvas zoom from wheel delta", () => {
    expect(clampCanvasZoom(0)).toBe(0.05);
    expect(clampCanvasZoom(8)).toBe(4);
    expect(zoomByWheelDelta(1, -200)).toBeGreaterThan(1);
    expect(zoomByWheelDelta(1, 200)).toBeLessThan(1);
  });

  it("fills default text props for older canvas json", () => {
    const props = getTextProps({ type: "text", text: "Hi", fontSize: 20, color: "#000000" });
    expect(props.fontWeight).toBe(400);
    expect(props.textAlign).toBe("left");
    expect(props.fontSize).toBe(20);
    expect(props.locked).toBe(false);
    expect(props.autoWidth).toBe(true);
  });

  it("builds css for bold centered underlined text", () => {
    const style = textElementStyle({
      type: "text",
      fontWeight: 700,
      textAlign: "center",
      color: "#000000",
      underline: true,
    });
    expect(style.fontWeight).toBe(700);
    expect(style.textAlign).toBe("center");
    expect(style.justifyContent).toBe("center");
    expect(style.textDecoration).toContain("underline");
  });

  it("paints fill as glyph color instead of the text box background", () => {
    const box = textElementStyle({
      type: "text",
      color: "#111827",
      fillEnabled: true,
      fillColor: "#00ff00",
    });
    expect(box.background).toBe("transparent");
    expect(textGlyphStyle({ type: "text", color: "#ff3366" }).color).toBe("#ff3366");
  });

  it("keeps box background on the text box and does not fill highlight", () => {
    expect(textElementStyle({ type: "text", boxBackground: "#abcdef" }).background).toBe("#abcdef");
    expect(textElementStyle({ type: "text", highlight: "#fde047", boxBackground: "#abcdef" }).background).toBe(
      "#abcdef",
    );
    expect(textElementStyle({ type: "text", boxBackground: "#ff0000", boxBackgroundOpacity: 50 }).background).toBe(
      "rgba(255, 0, 0, 0.5)",
    );
  });

  it("circles the whole copy when highlight is on the text box", () => {
    const rings = getHighlightEllipses({
      type: "text",
      text: "你好",
      fontSize: 20,
      width: 200,
      height: 40,
      highlight: "#fde047",
    });
    expect(rings).toHaveLength(1);
    expect(rings[0].color).toBe("#fde047");
    expect(rings[0].rx).toBeGreaterThan(rings[0].ry);
    expect(rings[0].strokeWidth).toBeGreaterThan(0);
  });

  it("centers highlight ellipses on the CSS line box so they wrap the painted glyphs", () => {
    const item = {
      type: "text",
      text: "双击编辑文字",
      fontSize: 48,
      lineHeight: 1.4,
      width: 296,
      height: 76,
      highlight: "#ef4444",
    };
    const glyph = getTextGlyphs(item)[0];
    const ring = getHighlightEllipses(item)[0];
    expect(ring.cy).toBeCloseTo(glyph.y + glyph.height / 2);
    expect(ring.ry).toBeGreaterThan(item.fontSize / 2);
    const top = ring.cy - ring.ry;
    const bottom = ring.cy + ring.ry;
    expect(top).toBeLessThan(glyph.y + (glyph.height - item.fontSize) / 2);
    expect(bottom).toBeGreaterThan(glyph.y + (glyph.height - item.fontSize) / 2 + item.fontSize);
  });

  it("circles only the highlighted characters", () => {
    const rings = getHighlightEllipses({
      type: "text",
      text: "你好世界",
      fontSize: 20,
      width: 400,
      height: 40,
      spans: [
        { text: "你好" },
        { text: "世界", highlight: "#ef4444" },
      ],
    });
    expect(rings).toHaveLength(1);
    expect(rings[0].color).toBe("#ef4444");
    const whole = getHighlightEllipses({
      type: "text",
      text: "你好世界",
      fontSize: 20,
      width: 400,
      height: 40,
      highlight: "#ef4444",
    });
    expect(rings[0].rx).toBeLessThan(whole[0].rx);
  });

  it("paints a left-to-right glyph gradient", () => {
    const fill = textGlyphStyle({
      type: "text",
      gradientEnabled: true,
      gradientFrom: "#111111",
      gradientTo: "#eeeeee",
    });
    expect(fill.backgroundImage).toBe("linear-gradient(90deg, #111111 0%, #eeeeee 100%)");
    expect(fill.backgroundSize).toBe("100% 100%");
    expect(fill.WebkitTextFillColor).toBe("transparent");
    expect(fill.color).toBe("transparent");
    expect(textElementStyle({ type: "text", gradientEnabled: true, gradientFrom: "#111111", gradientTo: "#eeeeee" }).background).toBe(
      "transparent",
    );
  });

  it("keeps the same gradient box whether stroke is on or off", () => {
    const base = {
      type: "text",
      gradientEnabled: true,
      gradientFrom: "#ff0000",
      gradientTo: "#00ff00",
    };
    expect(textFillPaint({ ...base, strokeEnabled: false, strokeWidth: 0 })).toEqual({
      type: "gradient",
      from: "#ff0000",
      to: "#00ff00",
    });
    expect(textFillPaint({ ...base, strokeEnabled: true, strokeWidth: 1 })).toEqual({
      type: "gradient",
      from: "#ff0000",
      to: "#00ff00",
    });
  });

  it("keeps text stroke on a transparent back layer instead of the glyph fill", () => {
    const stroked = {
      type: "text",
      strokeEnabled: true,
      strokeWidth: 4,
      strokeColor: "#ff0000",
      color: "#111827",
    };
    expect(textElementStyle(stroked).WebkitTextStroke).toBeUndefined();
    expect(textGlyphStyle(stroked).WebkitTextStroke).toBeUndefined();
    expect(textStrokeLayerStyle({ type: "text", strokeEnabled: false, strokeWidth: 0 })).toBeNull();

    const stroke = textStrokeLayerStyle(stroked);
    expect(stroke.WebkitTextStroke).toBe("8px #ff0000");
    expect(stroke.WebkitTextFillColor).toBe("transparent");
    expect(stroke.color).toBe("transparent");
  });

  it("prefixes list markers without changing stored copy", () => {
    expect(formatTextContent({ text: "一\n二", listStyle: "decimal" })).toBe("1. 一\n2. 二");
    expect(formatTextContent({ text: "一", listStyle: "disc" })).toBe("• 一");
  });

  it("treats whitespace-only copy as blank", () => {
    expect(isBlankText("")).toBe(true);
    expect(isBlankText("   ")).toBe(true);
    expect(isBlankText("字")).toBe(false);
  });

  it("duplicates an element with an offset", () => {
    const canvas = addTextElement(createEmptyCanvas(800, 600));
    const next = duplicateElement(canvas, canvas.elements[0].id);
    expect(next.elements).toHaveLength(2);
    expect(next.elements[1].x).toBe(canvas.elements[0].x + 24);
    expect(next.elements[1].id).not.toBe(canvas.elements[0].id);
  });

  it("moves a layer toward the top of the stack", () => {
    let canvas = addTextElement(createEmptyCanvas(800, 600), { text: "a" });
    canvas = addTextElement(canvas, { text: "b" });
    const firstId = canvas.elements[0].id;
    const moved = moveElementLayer(canvas, firstId, "up");
    expect(moved.elements[1].id).toBe(firstId);
    expect(moveElementLayer(moved, firstId, "bottom").elements[0].id).toBe(firstId);
  });

  it("sizes a new text box to its copy and wraps at 1000px", () => {
    const short = addTextElement(createEmptyCanvas(1920, 1080));
    expect(short.elements[0].autoWidth).toBe(true);
    expect(short.elements[0].width).toBeGreaterThan(MIN_ELEMENT_SIZE);
    expect(short.elements[0].width).toBeLessThan(720);
    expect(short.elements[0].width).toBeLessThanOrEqual(TEXT_BOX_MAX_WIDTH);

    const long = addTextElement(createEmptyCanvas(1920, 1080), {
      text: "字".repeat(80),
      fontSize: 48,
    });
    expect(long.elements[0].width).toBe(TEXT_BOX_MAX_WIDTH);
    expect(long.elements[0].height).toBeGreaterThan(short.elements[0].height);
  });

  it("grows the box so every line stays inside", () => {
    const one = fitTextBox({ text: "标题", fontSize: 48, autoWidth: true });
    const two = fitTextBox({ text: "标题\n副标题\n正文", fontSize: 48, autoWidth: true });
    expect(two.height).toBeGreaterThan(one.height);
    expect(two.width).toBeLessThanOrEqual(TEXT_BOX_MAX_WIDTH);

    const next = patchTextElement(
      { type: "text", text: "标题", fontSize: 48, autoWidth: true, width: one.width, height: one.height },
      { text: "标题\n副标题" },
    );
    expect(next.height).toBeGreaterThan(one.height);
  });

  it("keeps every typed character inside the auto-width box", () => {
    const typed = fitTextBox({ text: "你好世界", fontSize: 48, autoWidth: true });
    expect(typed.width).toBeGreaterThanOrEqual(48 * 4);
    expect(typed.height).toBeGreaterThanOrEqual(48);

    const longer = patchTextElement(
      { type: "text", text: "你", fontSize: 48, autoWidth: true, width: 56, height: 76 },
      { text: "你好世界" },
    );
    expect(longer.width).toBeGreaterThan(56);
    expect(longer.width).toBeGreaterThanOrEqual(48 * 4);
  });

  it("grows the box while typing even if autoWidth was never stored", () => {
    const start = fitTextBox({ type: "text", text: "你", fontSize: 48 });
    const longer = patchTextElement(
      { type: "text", text: "你", fontSize: 48, width: start.width, height: start.height },
      { text: "你好世界你好世界" },
    );
    expect(longer.width).toBeGreaterThan(start.width);
    expect(longer.width).toBeLessThanOrEqual(TEXT_BOX_MAX_WIDTH);
  });

  it("lets a manually resized text box grow past the auto-wrap width", () => {
    const next = patchTextElement(
      { type: "text", text: "标题", fontSize: 48, autoWidth: false, width: 400, height: 80 },
      { width: 1400 },
    );
    expect(next.width).toBe(1400);
    expect(next.autoWidth).toBe(false);

    const fitted = fitTextBox({
      type: "text",
      text: "标题",
      fontSize: 48,
      autoWidth: false,
      width: 1400,
    });
    expect(fitted.width).toBe(1400);
  });
});
