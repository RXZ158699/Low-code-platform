import { describe, expect, it } from "vitest";
import {
  addRectElement,
  addTextElement,
  applyHandleResize,
  clampCanvasZoom,
  createEmptyCanvas,
  duplicateElement,
  fitTextBox,
  formatTextContent,
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
});
