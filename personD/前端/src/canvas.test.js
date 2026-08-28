import { describe, expect, it } from "vitest";
import {
  addCollageElement,
  addMagnifierElement,
  addMediaElement,
  appendElements,
  addRectElement,
  addShapeElement,
  addTextElement,
  applyCollageLayout,
  applyHandleResize,
  applyTextHandleResize,
  boxFromDrag,
  canvasBackgroundStyle,
  clampCanvasZoom,
  createEmptyCanvas,
  duplicateElement,
  fillCollageCells,
  collageCellOffset,
  localDragDelta,
  panCollageCell,
  panMagnifierFocus,
  setMagnifierFocus,
  setCollageCellOffset,
  fitCollageToCanvas,
  fitTextBox,
  flipLine,
  flipShape,
  formatTextContent,
  getCollageProps,
  getMagnifierProps,
  getLineProps,
  getShapeProps,
  getHighlightEllipses,
  getTextGlyphs,
  getTextProps,
  getWarpProps,
  isBlankText,
  isCornerHandle,
  isLineKind,
  isMagnifierElement,
  isShapeElement,
  lineStrokeProps,
  MAGNIFIER_MAX_SCALE,
  MAGNIFIER_MIN_SCALE,
  MAGNIFIER_SIZE,
  MIN_ELEMENT_SIZE,
  moveElementLayer,
  parseCanvas,
  patchTextElement,
  pointerAngle,
  removeElement,
  clearCanvasElements,
  resizeCanvas,
  rotateFromDrag,
  scaledShapePoints,
  setCollageCellSrc,
  setCollageSize,
  setLineEndpoint,
  setLineLength,
  setLineOrigin,
  setLineStrokeWidth,
  setMagnifierScale,
  shapeKind,
  shapePathD,
  SNAP_GUIDE_DISTANCE,
  snapMoveRect,
  snapResizeRect,
  stringifyCanvas,
  TEXT_BOX_MAX_WIDTH,
  textElementStyle,
  textFillPaint,
  textGlyphStyle,
  textStrokeLayerStyle,
  warpGlyphPlacement,
  zoomByWheelDelta,
} from "./canvas.js";

describe("canvas helpers", () => {
  it("falls back to a default artboard when json is empty", () => {
    expect(parseCanvas(null)).toEqual({
      width: 1080,
      height: 1440,
      background: "#ffffff",
      backgroundOpacity: 100,
      backgroundImage: "",
      backgroundImageFit: "cover",
      elements: [],
    });
    expect(parseCanvas("{")).toEqual({
      width: 1080,
      height: 1440,
      background: "#ffffff",
      backgroundOpacity: 100,
      backgroundImage: "",
      backgroundImageFit: "cover",
      elements: [],
    });
  });

  it("builds an empty canvas with the given size", () => {
    expect(createEmptyCanvas(1242, 2208)).toEqual({
      width: 1242,
      height: 2208,
      background: "#ffffff",
      backgroundOpacity: 100,
      backgroundImage: "",
      backgroundImageFit: "cover",
      elements: [],
    });
  });

  it("reads and renders a canvas background image", () => {
    const canvas = parseCanvas(
      '{"width":800,"height":600,"background":"#111827","backgroundImage":"data:image/svg+xml,abc","elements":[]}',
    );
    expect(canvas.backgroundImage).toBe("data:image/svg+xml,abc");
    expect(canvasBackgroundStyle(canvas).backgroundImage).toContain("data:image/svg+xml,abc");
    expect(canvasBackgroundStyle(canvas).backgroundSize).toBe("cover");
    expect(canvasBackgroundStyle({ ...canvas, backgroundImageFit: "contain" }).backgroundSize).toBe("contain");
  });

  it("round-trips text elements", () => {
    const next = addTextElement(
      parseCanvas('{"width":800,"height":600,"elements":[]}'),
    );
    expect(next.width).toBe(800);
    expect(next.elements).toHaveLength(1);
    expect(JSON.parse(stringifyCanvas(next)).elements[0].type).toBe("text");
  });

  it("centers a new text element on the artboard", () => {
    const canvas = createEmptyCanvas(1000, 800);
    const next = addTextElement(canvas);
    const element = next.elements[0];
    expect(Math.abs(element.x + element.width / 2 - canvas.width / 2)).toBeLessThanOrEqual(1);
    expect(Math.abs(element.y + element.height / 2 - canvas.height / 2)).toBeLessThanOrEqual(1);
  });

  it("normalizes warp props", () => {
    const text = addTextElement(createEmptyCanvas(1000, 800), {
      text: "变形文字",
      warp: { type: "arc", strength: 999 },
    });
    const warp = getWarpProps(text.elements[0]);
    expect(warp.type).toBe("arc");
    expect(warp.strength).toBe(120);
    expect(getWarpProps({})).toBeNull();
    expect(getWarpProps({ warp: { type: "wave", strength: 30 } }).strength).toBe(30);
    expect(getWarpProps({ warp: { type: "spin" } })).toBeNull();
  });

  it("warps glyphs with finite offsets and rotation", () => {
    const text = addTextElement(createEmptyCanvas(1000, 800), {
      text: "变形文字",
      fontSize: 48,
      warp: { type: "arc", strength: 44 },
    });
    const placements = warpGlyphPlacement(text.elements[0]);
    expect(placements).toHaveLength(getTextGlyphs(text.elements[0]).length);
    for (const placement of placements) {
      expect(Number.isFinite(placement.dx)).toBe(true);
      expect(Number.isFinite(placement.dy)).toBe(true);
      expect(Number.isFinite(placement.rotate)).toBe(true);
    }
    expect(placements[0].dy).toBeCloseTo(placements[placements.length - 1].dy, 0);
  });

  it("applies a wave offset that changes across glyphs", () => {
    const text = addTextElement(createEmptyCanvas(1000, 800), {
      text: "变形文字",
      fontSize: 48,
      warp: { type: "wave", strength: 30 },
    });
    const placements = warpGlyphPlacement(text.elements[0]);
    expect(new Set(placements.map((p) => p.dy)).size).toBeGreaterThan(1);
  });

  it("adds an image element fitted to the artboard", () => {
    const next = addMediaElement(
      parseCanvas('{"width":800,"height":600,"elements":[]}'),
      {
        type: "image",
        src: "http://cdn/a.png",
        name: "a.png",
        width: 1600,
        height: 900,
      },
    );
    expect(next.elements).toHaveLength(1);
    expect(next.elements[0]).toMatchObject({
      type: "image",
      src: "http://cdn/a.png",
      name: "a.png",
    });
    expect(next.elements[0].width).toBeLessThanOrEqual(800 * 0.62);
    expect(next.elements[0].height).toBeLessThanOrEqual(600 * 0.62);
  });

  it("adds a collage fitted to the artboard from a layout id", () => {
    const next = addCollageElement(createEmptyCanvas(800, 600), "2-v");
    expect(next.elements).toHaveLength(1);
    expect(next.elements[0]).toMatchObject({
      type: "collage",
      layoutId: "2-v",
      rowCount: 1,
      colCount: 2,
    });
    expect(next.elements[0].cells).toHaveLength(2);
    expect(next.elements[0].gap).toBeGreaterThan(0);
    expect(next.elements[0].width).toBeLessThanOrEqual(800 * 0.62);
    expect(next.elements[0].height).toBeLessThanOrEqual(600 * 0.62);
    expect(getCollageProps(next.elements[0])).toMatchObject({
      gap: 8,
      padding: 0,
      radius: 0,
      opacity: 100,
      seamless: false,
      aspectLocked: true,
    });
  });

  it("switches collage layout while keeping cell images", () => {
    const item = {
      type: "collage",
      layoutId: "2-v",
      rowCount: 1,
      colCount: 2,
      cells: [
        { r: 1, c: 1, rs: 1, cs: 1, src: "a.png" },
        { r: 1, c: 2, rs: 1, cs: 1, src: "b.png" },
      ],
    };
    const next = applyCollageLayout(item, "2-h");
    expect(next).toMatchObject({
      layoutId: "2-h",
      rowCount: 2,
      colCount: 1,
    });
    expect(next.cells.map((cell) => cell.src)).toEqual(["a.png", "b.png"]);
  });

  it("fits a collage to the artboard and fills empty cells", () => {
    const canvas = createEmptyCanvas(800, 600);
    const item = addCollageElement(canvas, "2-v").elements[0];
    expect(fitCollageToCanvas(canvas, item)).toEqual({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });
    const filled = fillCollageCells(item, ["one.png", "two.png"]);
    expect(filled.cells.map((cell) => cell.src)).toEqual(["one.png", "two.png"]);
  });

  it("writes an image onto one collage cell", () => {
    const item = addCollageElement(createEmptyCanvas(800, 600), "2-v")
      .elements[0];
    const patched = setCollageCellSrc(item, 1, "http://cdn/b.png");
    expect(patched.cells.map((cell) => cell.src)).toEqual([
      undefined,
      "http://cdn/b.png",
    ]);
  });

  it("pans a collage cell image inside its frame", () => {
    const item = {
      ...addCollageElement(createEmptyCanvas(800, 600), "2-v").elements[0],
      cells: [
        { r: 1, c: 1, rs: 1, cs: 1, src: "a.png", ox: 50, oy: 50 },
        { r: 1, c: 2, rs: 1, cs: 1 },
      ],
    };
    expect(collageCellOffset(item.cells[0])).toEqual({ ox: 50, oy: 50 });
    expect(localDragDelta(10, 0, 0)).toEqual({ dx: 10, dy: 0 });
    const panned = panCollageCell(item, 0, item.cells[0], 40, 0, {
      width: 200,
      height: 100,
    });
    expect(panned.cells[0].ox).toBe(30);
    expect(panned.cells[0].oy).toBe(50);
    expect(panned.cells[1].src).toBeUndefined();
    const clamped = setCollageCellOffset(item, 0, { ox: 200, oy: -20 });
    expect(clamped.cells[0]).toMatchObject({ ox: 100, oy: 0 });
  });

  it("keeps collage aspect ratio when resizing one side", () => {
    const sized = setCollageSize(
      { width: 200, height: 100, aspectLocked: true },
      { width: 400 },
    );
    expect(sized).toEqual({ width: 400, height: 200 });
  });

  it("computes free rotation around a center point", () => {
    expect(pointerAngle(400, 300, 400, 500)).toBeCloseTo(90);
    expect(pointerAngle(400, 300, 600, 300)).toBeCloseTo(0);
    expect(rotateFromDrag(0, 90, 0)).toBeCloseTo(-90);
    expect(rotateFromDrag(15, 90, 180)).toBeCloseTo(105);
  });

  it("ignores unknown collage layouts", () => {
    const canvas = createEmptyCanvas(800, 600);
    expect(addCollageElement(canvas, "missing-layout").elements).toHaveLength(
      0,
    );
  });

  it("removes an element by id", () => {
    const withText = addTextElement(
      parseCanvas('{"width":800,"height":600,"elements":[]}'),
    );
    const withRect = addRectElement(withText);
    const removed = removeElement(withRect, withText.elements[0].id);
    expect(removed.elements).toHaveLength(1);
    expect(removed.elements[0].type).toBe("rect");
  });

  it("clears all artboard elements and keeps canvas size", () => {
    const withText = addTextElement(
      parseCanvas('{"width":800,"height":600,"background":"#abcdef","elements":[]}'),
    );
    const withRect = addRectElement(withText);
    const cleared = clearCanvasElements(withRect);
    expect(cleared.elements).toEqual([]);
    expect(cleared.width).toBe(800);
    expect(cleared.height).toBe(600);
    expect(cleared.background).toBe("#abcdef");
    expect(clearCanvasElements(cleared)).toBe(cleared);
  });

  it("resizes a box from each handle direction", () => {
    const box = { x: 10, y: 20, width: 100, height: 80 };
    expect(applyHandleResize(box, "se", 10, 20)).toEqual({
      x: 10,
      y: 20,
      width: 110,
      height: 100,
    });
    expect(applyHandleResize(box, "nw", 10, 20)).toEqual({
      x: 20,
      y: 40,
      width: 90,
      height: 60,
    });
    expect(applyHandleResize(box, "e", 30, 0).width).toBe(130);
    expect(applyHandleResize(box, "n", 0, 10).height).toBe(70);
  });

  it("locks aspect ratio on corner handles and stretches from side handles", () => {
    expect(isCornerHandle("se")).toBe(true);
    expect(isCornerHandle("nw")).toBe(true);
    expect(isCornerHandle("e")).toBe(false);
    expect(isCornerHandle("n")).toBe(false);
    const box = { x: 10, y: 20, width: 100, height: 50 };
    expect(
      applyHandleResize(box, "se", 50, 10, MIN_ELEMENT_SIZE, isCornerHandle("se")),
    ).toEqual({ x: 10, y: 20, width: 150, height: 75 });
    expect(
      applyHandleResize(box, "e", 50, 80, MIN_ELEMENT_SIZE, isCornerHandle("e")),
    ).toEqual({ x: 10, y: 20, width: 150, height: 50 });
  });

  it("keeps aspect ratio when lockAspect is on", () => {
    const box = { x: 10, y: 20, width: 100, height: 50 };
    expect(applyHandleResize(box, "se", 50, 0, MIN_ELEMENT_SIZE, true)).toEqual(
      {
        x: 10,
        y: 20,
        width: 150,
        height: 75,
      },
    );
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
    expect(next.fontSize).toBe(20);
    expect(next.autoWidth).toBe(false);
    const corner = applyTextHandleResize(item, "se", 50, 0);
    expect(corner.width).toBe(150);
    expect(corner.fontSize).toBe(30);
  });

  it("resizes the artboard from a handle and shifts elements when the origin moves", () => {
    const canvas = {
      width: 800,
      height: 600,
      background: "#ffffff",
      backgroundOpacity: 100,
      elements: [
        {
          id: "a",
          type: "rect",
          x: 100,
          y: 80,
          width: 40,
          height: 40,
          x1: 100,
          y1: 80,
          x2: 140,
          y2: 120,
        },
      ],
    };

    const east = resizeCanvas(canvas, "e", 50, 20);
    expect(east.width).toBe(850);
    expect(east.height).toBe(600);
    expect(east.elements[0].x).toBe(100);

    const south = resizeCanvas(canvas, "s", 20, 40);
    expect(south.width).toBe(800);
    expect(south.height).toBe(640);

    const west = resizeCanvas(canvas, "w", -40, 0);
    expect(west.width).toBe(840);
    expect(west.elements[0].x).toBe(140);
    expect(west.elements[0].x1).toBe(140);
    expect(west.elements[0].x2).toBe(180);

    const north = resizeCanvas(canvas, "n", 0, -30);
    expect(north.height).toBe(630);
    expect(north.elements[0].y).toBe(110);

    const se = resizeCanvas(canvas, "se", 20, 30);
    expect(se.width).toBe(820);
    expect(se.height).toBe(630);
    expect(se.elements[0]).toMatchObject({ x: 100, y: 80 });
  });

  it("clamps and steps canvas zoom from wheel delta", () => {
    expect(clampCanvasZoom(0)).toBe(0.05);
    expect(clampCanvasZoom(8)).toBe(4);
    expect(zoomByWheelDelta(1, -200)).toBeGreaterThan(1);
    expect(zoomByWheelDelta(1, 200)).toBeLessThan(1);
  });

  it("fills default text props for older canvas json", () => {
    const props = getTextProps({
      type: "text",
      text: "Hi",
      fontSize: 20,
      color: "#000000",
    });
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
    expect(textGlyphStyle({ type: "text", color: "#ff3366" }).color).toBe(
      "#ff3366",
    );
  });

  it("keeps box background on the text box and does not fill highlight", () => {
    expect(
      textElementStyle({ type: "text", boxBackground: "#abcdef" }).background,
    ).toBe("#abcdef");
    expect(
      textElementStyle({
        type: "text",
        highlight: "#fde047",
        boxBackground: "#abcdef",
      }).background,
    ).toBe("#abcdef");
    expect(
      textElementStyle({
        type: "text",
        boxBackground: "#ff0000",
        boxBackgroundOpacity: 50,
      }).background,
    ).toBe("rgba(255, 0, 0, 0.5)");
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
    expect(bottom).toBeGreaterThan(
      glyph.y + (glyph.height - item.fontSize) / 2 + item.fontSize,
    );
  });

  it("circles only the highlighted characters", () => {
    const rings = getHighlightEllipses({
      type: "text",
      text: "你好世界",
      fontSize: 20,
      width: 400,
      height: 40,
      spans: [{ text: "你好" }, { text: "世界", highlight: "#ef4444" }],
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
    expect(fill.backgroundImage).toBe(
      "linear-gradient(90deg, #111111 0%, #eeeeee 100%)",
    );
    expect(fill.backgroundSize).toBe("100% 100%");
    expect(fill.WebkitTextFillColor).toBe("transparent");
    expect(fill.color).toBe("transparent");
    expect(
      textElementStyle({
        type: "text",
        gradientEnabled: true,
        gradientFrom: "#111111",
        gradientTo: "#eeeeee",
      }).background,
    ).toBe("transparent");
  });

  it("keeps the same gradient box whether stroke is on or off", () => {
    const base = {
      type: "text",
      gradientEnabled: true,
      gradientFrom: "#ff0000",
      gradientTo: "#00ff00",
    };
    expect(
      textFillPaint({ ...base, strokeEnabled: false, strokeWidth: 0 }),
    ).toEqual({
      type: "gradient",
      from: "#ff0000",
      to: "#00ff00",
    });
    expect(
      textFillPaint({ ...base, strokeEnabled: true, strokeWidth: 1 }),
    ).toEqual({
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
    expect(
      textStrokeLayerStyle({
        type: "text",
        strokeEnabled: false,
        strokeWidth: 0,
      }),
    ).toBeNull();

    const stroke = textStrokeLayerStyle(stroked);
    expect(stroke.WebkitTextStroke).toBe("8px #ff0000");
    expect(stroke.WebkitTextFillColor).toBe("transparent");
    expect(stroke.color).toBe("transparent");
  });

  it("prefixes list markers without changing stored copy", () => {
    expect(formatTextContent({ text: "一\n二", listStyle: "decimal" })).toBe(
      "1. 一\n2. 二",
    );
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
    expect(moveElementLayer(moved, firstId, "bottom").elements[0].id).toBe(
      firstId,
    );
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
    const two = fitTextBox({
      text: "标题\n副标题\n正文",
      fontSize: 48,
      autoWidth: true,
    });
    expect(two.height).toBeGreaterThan(one.height);
    expect(two.width).toBeLessThanOrEqual(TEXT_BOX_MAX_WIDTH);

    const next = patchTextElement(
      {
        type: "text",
        text: "标题",
        fontSize: 48,
        autoWidth: true,
        width: one.width,
        height: one.height,
      },
      { text: "标题\n副标题" },
    );
    expect(next.height).toBeGreaterThan(one.height);
  });

  it("keeps every typed character inside the auto-width box", () => {
    const typed = fitTextBox({
      text: "你好世界",
      fontSize: 48,
      autoWidth: true,
    });
    expect(typed.width).toBeGreaterThanOrEqual(48 * 4);
    expect(typed.height).toBeGreaterThanOrEqual(48);

    const longer = patchTextElement(
      {
        type: "text",
        text: "你",
        fontSize: 48,
        autoWidth: true,
        width: 56,
        height: 76,
      },
      { text: "你好世界" },
    );
    expect(longer.width).toBeGreaterThan(56);
    expect(longer.width).toBeGreaterThanOrEqual(48 * 4);
  });

  it("grows the box while typing even if autoWidth was never stored", () => {
    const start = fitTextBox({ type: "text", text: "你", fontSize: 48 });
    const longer = patchTextElement(
      {
        type: "text",
        text: "你",
        fontSize: 48,
        width: start.width,
        height: start.height,
      },
      { text: "你好世界你好世界" },
    );
    expect(longer.width).toBeGreaterThan(start.width);
    expect(longer.width).toBeLessThanOrEqual(TEXT_BOX_MAX_WIDTH);
  });

  it("lets a manually resized text box grow past the auto-wrap width", () => {
    const next = patchTextElement(
      {
        type: "text",
        text: "标题",
        fontSize: 48,
        autoWidth: false,
        width: 400,
        height: 80,
      },
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

  it("builds a draw box with independent width and height", () => {
    expect(boxFromDrag(100, 80, 260, 140)).toEqual({
      x: 100,
      y: 80,
      width: 160,
      height: 60,
    });
    expect(boxFromDrag(260, 140, 100, 80)).toEqual({
      x: 100,
      y: 80,
      width: 160,
      height: 60,
    });
    expect(boxFromDrag(10, 10, 11, 11)).toBeNull();
  });

  it("builds a proportional square draw box from the origin", () => {
    expect(boxFromDrag(100, 80, 260, 140, 3, true)).toEqual({
      x: 100,
      y: 80,
      width: 160,
      height: 160,
    });
    expect(boxFromDrag(260, 140, 100, 80, 3, true)).toEqual({
      x: 100,
      y: -20,
      width: 160,
      height: 160,
    });
    expect(boxFromDrag(100, 80, 140, 200, 3, true)).toEqual({
      x: 100,
      y: 80,
      width: 120,
      height: 120,
    });
    expect(boxFromDrag(10, 10, 11, 11, 3, true)).toBeNull();
  });

  it("adds polygon shapes that stretch independently with the box", () => {
    const canvas = addShapeElement(createEmptyCanvas(800, 600), "triangle", {
      x: 20,
      y: 30,
      width: 200,
      height: 80,
    });
    expect(isShapeElement(canvas.elements[0])).toBe(true);
    expect(canvas.elements[0]).toMatchObject({
      type: "shape",
      kind: "triangle",
      x: 20,
      y: 30,
      width: 200,
      height: 80,
    });
    expect(scaledShapePoints("triangle", 200, 80)).toEqual([
      [100, 0],
      [200, 80],
      [0, 80],
    ]);
  });

  it("reads filled shape style defaults and flip patches", () => {
    expect(getShapeProps({ type: "rect", width: 120, height: 80 })).toMatchObject({
      kind: "square",
      fill: "#2563eb",
      fillVisible: true,
      stroke: "#6b7280",
      strokeVisible: true,
      strokeWidth: 0,
      strokeAlign: "center",
      strokeStyle: "solid",
      cornerRadius: 0,
      opacity: 100,
      aspectLocked: false,
      flippedX: false,
      flippedY: false,
    });
    expect(flipShape({ flippedX: false }, "x")).toEqual({ flippedX: true });
    expect(flipShape({ flippedY: true }, "y")).toEqual({ flippedY: false });
    expect(shapePathD("square", 20, 10, 0)).toContain("H 20");
    expect(shapePathD("circle", 20, 10)).toContain("A 10 5");
    expect(shapePathD("triangle", 20, 20, 4)).toContain("Q");
  });

  it("treats legacy rect elements as independently scalable squares", () => {
    expect(shapeKind({ type: "rect" })).toBe("square");
    expect(isShapeElement({ type: "rect" })).toBe(true);
    expect(isShapeElement({ type: "shape", kind: "pentagon" })).toBe(true);
    const east = applyHandleResize(
      { x: 10, y: 20, width: 100, height: 80 },
      "e",
      40,
      30,
    );
    expect(east).toEqual({ x: 10, y: 20, width: 140, height: 80 });
    const south = applyHandleResize(
      { x: 10, y: 20, width: 100, height: 80 },
      "s",
      40,
      30,
    );
    expect(south).toEqual({ x: 10, y: 20, width: 100, height: 110 });
  });

  it("adds 1px black lines from endpoints that cannot be treated as a scalable box", () => {
    const canvas = addShapeElement(createEmptyCanvas(800, 600), "dash", {
      x1: 10,
      y1: 20,
      x2: 250,
      y2: 20,
    });
    expect(canvas.elements[0]).toMatchObject({
      type: "shape",
      kind: "dash",
      x1: 10,
      y1: 20,
      x2: 250,
      y2: 20,
      fill: "#000000",
      strokeWidth: 1,
    });
    expect(isLineKind("line")).toBe(true);
    expect(isLineKind("dot")).toBe(true);
    expect(isLineKind("triangle")).toBe(false);
    expect(lineStrokeProps("line")).toMatchObject({ width: 1, dash: null });
    expect(lineStrokeProps("dash").dash).toBeTruthy();
    expect(lineStrokeProps("dot").cap).toBe("round");
    const line = { x1: 10, y1: 10, x2: 30, y2: 20, strokeWidth: 4 };
    expect(getLineProps(line)).toMatchObject({
      length: Math.hypot(20, 10),
      originX: 10,
      originY: 10,
      strokeWidth: 4,
    });
    expect(setLineLength({ x1: 0, y1: 0, x2: 100, y2: 0 }, 200)).toMatchObject({
      x1: -50,
      x2: 150,
      y1: 0,
      y2: 0,
    });
    expect(setLineOrigin(line, 0, 0)).toMatchObject({
      x1: 0,
      y1: 0,
      x2: 20,
      y2: 10,
    });
    expect(flipLine(line, "x")).toMatchObject({
      x1: 30,
      y1: 10,
      x2: 10,
      y2: 20,
    });
    expect(setLineStrokeWidth(line, 8)).toMatchObject({ strokeWidth: 8 });
    expect(setLineEndpoint({ x1: 10, y1: 20, x2: 110, y2: 20 }, "end", 80, 90)).toMatchObject({
      x1: 10,
      y1: 20,
      x2: 80,
      y2: 90,
    });
    expect(setLineEndpoint({ x1: 10, y1: 20, x2: 110, y2: 20 }, "start", 0, 0)).toMatchObject({
      x1: 0,
      y1: 0,
      x2: 110,
      y2: 20,
    });
  });

  it("snaps a moved rect to the left and top borders", () => {
    expect(
      snapMoveRect({ x: 5, y: 4, width: 100, height: 60 }, 800, 600),
    ).toEqual({
      x: 0,
      y: 0,
      guides: { vertical: [0], horizontal: [0] },
    });
  });

  it("snaps a moved rect edge to the right border and center to the center line", () => {
    const right = snapMoveRect({ x: 695, y: 20, width: 100, height: 60 }, 800, 600);
    expect(right.x).toBe(700);
    expect(right.guides.vertical).toEqual([800]);

    const center = snapMoveRect({ x: 345, y: 20, width: 100, height: 60 }, 800, 600);
    expect(center.x).toBe(350);
    expect(center.guides.vertical).toEqual([400]);
  });

  it("keeps a moved rect unchanged beyond the snap threshold", () => {
    expect(
      snapMoveRect({ x: 30, y: 40, width: 100, height: 60 }, 800, 600),
    ).toEqual({
      x: 30,
      y: 40,
      guides: { vertical: [], horizontal: [] },
    });
  });

  it("snaps only the edge controlled by the resize handle", () => {
    const east = snapResizeRect({ x: 3, y: 100, width: 100, height: 60 }, "e", 800, 600);
    expect(east.x).toBe(3);
    expect(east.guides.vertical).toEqual([]);

    const west = snapResizeRect({ x: 5, y: 100, width: 100, height: 60 }, "w", 800, 600);
    expect(west).toMatchObject({ x: 0, width: 105 });
    expect(west.guides.vertical).toEqual([0]);
  });

  it("snaps the right and bottom edges during corner resize", () => {
    const corner = snapResizeRect(
      { x: 700, y: 540, width: 95, height: 55 },
      "se",
      800,
      600,
    );
    expect(corner.width).toBe(100);
    expect(corner.height).toBe(60);
    expect(corner.guides.vertical).toEqual([800]);
    expect(corner.guides.horizontal).toEqual([600]);
  });

  it("does not snap a resized edge to the canvas center line", () => {
    const result = snapResizeRect(
      { x: 300, y: 100, width: 98, height: 60 },
      "e",
      800,
      600,
    );
    expect(result).toMatchObject({ x: 300, width: 98 });
    expect(result.guides.vertical).toEqual([]);
  });

  it("keeps the aspect ratio after snapping an aspect-locked corner resize", () => {
    const result = snapResizeRect(
      { x: 700, y: 500, width: 95, height: 55 },
      "se",
      800,
      600,
      SNAP_GUIDE_DISTANCE,
      MIN_ELEMENT_SIZE,
      true,
    );
    expect(result.x + result.width).toBe(800);
    expect(result.width / result.height).toBeCloseTo(95 / 55, 5);
    expect(result.guides.vertical).toEqual([800]);
    expect(result.guides.horizontal).toEqual([]);
  });

  it("prefers one snap axis for aspect-locked corner resize and hides unfulfilled guides", () => {
    const result = snapResizeRect(
      { x: 700, y: 540, width: 95, height: 55 },
      "se",
      800,
      600,
      SNAP_GUIDE_DISTANCE,
      MIN_ELEMENT_SIZE,
      true,
    );
    expect(result.x + result.width).toBe(800);
    expect(result.width / result.height).toBeCloseTo(95 / 55, 5);
    expect(result.guides.vertical).toEqual([800]);
    expect(result.guides.horizontal).toEqual([]);
  });

  it("adds a 200px magnifier centered on the artboard", () => {
    const next = addMagnifierElement(createEmptyCanvas(800, 600));
    const magnifier = next.elements[0];
    expect(isMagnifierElement(magnifier)).toBe(true);
    expect(magnifier).toMatchObject({
      type: "magnifier",
      width: MAGNIFIER_SIZE,
      height: MAGNIFIER_SIZE,
      x: 300,
      y: 200,
      focusX: 400,
      focusY: 300,
      scale: 2,
      shape: "square",
      aspectLocked: true,
    });
  });

  it("clamps the magnifier focus to the canvas when panned", () => {
    const item = {
      type: "magnifier",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      focusX: 100,
      focusY: 100,
      scale: 2,
    };
    expect(panMagnifierFocus(item, -500, -500, { width: 800, height: 600 })).toEqual({
      focusX: 0,
      focusY: 0,
    });
    expect(panMagnifierFocus(item, 5000, 5000, { width: 800, height: 600 })).toEqual({
      focusX: 800,
      focusY: 600,
    });
  });

  it("places the magnifier focus directly at the pointer position", () => {
    const item = {
      type: "magnifier",
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      focusX: 100,
      focusY: 100,
      scale: 2,
    };
    expect(
      setMagnifierFocus(item, 123.5, 456.7, { width: 800, height: 600 }),
    ).toEqual({
      focusX: 123.5,
      focusY: 456.7,
    });
    expect(setMagnifierFocus(item, 900, 900, { width: 800, height: 600 })).toEqual({
      focusX: 800,
      focusY: 600,
    });
  });

  it("normalizes magnifier props and clamps the scale", () => {
    const fallback = getMagnifierProps({ type: "magnifier" });
    expect(fallback).toMatchObject({
      width: MAGNIFIER_SIZE,
      height: MAGNIFIER_SIZE,
      scale: 2,
      shape: "square",
    });
    expect(getMagnifierProps({ type: "magnifier", shape: "circle" }).shape).toBe(
      "circle",
    );
    const clamped = setMagnifierScale(
      { type: "magnifier" },
      MAGNIFIER_MAX_SCALE + 10,
    );
    expect(clamped).toEqual({ scale: MAGNIFIER_MAX_SCALE });
    expect(setMagnifierScale({ type: "magnifier" }, -1)).toEqual({
      scale: MAGNIFIER_MIN_SCALE,
    });
  });
});

describe("appendElements", () => {
  it("clones incoming elements onto the canvas with new ids", () => {
    const canvas = createEmptyCanvas(200, 200);
    const next = appendElements(canvas, [
      { id: "text-old", type: "text", text: "标题", x: 10, y: 20 },
    ]);

    expect(next.elements).toHaveLength(1);
    expect(next.elements[0].id).not.toBe("text-old");
    expect(next.elements[0]).toMatchObject({ type: "text", text: "标题", x: 10, y: 20 });
  });
});
