import { describe, expect, it, vi } from "vitest";
import { paintCanvasPreview } from "./canvasPreview.js";
import {
  createEmptyCanvas,
  addMagnifierElement,
  addTableElement,
  addTextElement,
  addRectElement,
  addCollageElement,
} from "./canvas.js";

function mockCtx() {
  return {
    save: vi.fn(),
    restore: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
    rotate: vi.fn(),
    fillRect: vi.fn(),
    fillText: vi.fn(),
    beginPath: vi.fn(),
    fill: vi.fn(),
    ellipse: vi.fn(),
    clip: vi.fn(),
    rect: vi.fn(),
    arc: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    strokeRect: vi.fn(),
    roundRect: vi.fn(),
    stroke: vi.fn(),
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 0,
    font: "",
    textBaseline: "",
    textAlign: "",
    globalAlpha: 1,
  };
}

describe("canvasPreview", () => {
  it("paints the artboard background and edited text instead of a placeholder", () => {
    const ctx = mockCtx();
    let canvas = createEmptyCanvas(800, 600);
    canvas = { ...canvas, background: "#ffeedd" };
    canvas = addTextElement(canvas, {
      text: "夏日海报",
      fontSize: 48,
      x: 40,
      y: 80,
    });

    paintCanvasPreview(ctx, canvas, 0.5);

    expect(ctx.scale).toHaveBeenCalledWith(0.5, 0.5);
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 800, 600);
    expect(ctx.fillStyle).not.toBe("#ffffff");
    expect(
      ctx.fillText.mock.calls.some((call) =>
        String(call[0]).includes("夏日海报"),
      ),
    ).toBe(true);
  });

  it("paints rect blocks from the canvas json", () => {
    const ctx = mockCtx();
    const canvas = addRectElement(createEmptyCanvas(400, 400));
    paintCanvasPreview(ctx, canvas, 1);
    expect(
      ctx.fillRect.mock.calls.some(
        (call) => call[2] === 400 && call[3] === 160,
      ),
    ).toBe(true);
  });

  it("paints warped text glyph-by-glyph with rotation", () => {
    const ctx = mockCtx();
    let canvas = createEmptyCanvas(800, 600);
    canvas = addTextElement(canvas, {
      text: "变形文字",
      fontSize: 48,
      warp: { type: "arc", strength: 44 },
    });
    paintCanvasPreview(ctx, canvas, 1);
    expect(ctx.rotate).toHaveBeenCalled();
    expect(ctx.fillText.mock.calls.length).toBeGreaterThan(1);
  });

  it("paints grey placeholder cells for a collage", () => {
    const ctx = mockCtx();
    const canvas = addCollageElement(createEmptyCanvas(800, 600), "2-v");
    paintCanvasPreview(ctx, canvas, 1);
    const collage = canvas.elements[0];
    const greyFills = ctx.fillRect.mock.calls.filter(
      (call) => call[2] < collage.width,
    );
    expect(greyFills.length).toBeGreaterThanOrEqual(2);
  });

  it("clips a magnifier viewport and paints its focus dot", () => {
    const ctx = mockCtx();
    const canvas = addMagnifierElement(createEmptyCanvas(800, 600));
    paintCanvasPreview(ctx, canvas, 1);
    expect(ctx.clip).toHaveBeenCalled();
    expect(ctx.stroke).toHaveBeenCalled();
    expect(ctx.arc).toHaveBeenCalled();
    expect(ctx.moveTo).toHaveBeenCalled();
  });

  it("clips a circular magnifier viewport", () => {
    const ctx = mockCtx();
    const canvas = addMagnifierElement(createEmptyCanvas(800, 600));
    canvas.elements[0].shape = "circle";
    paintCanvasPreview(ctx, canvas, 1);
    expect(ctx.ellipse).toHaveBeenCalled();
  });

  it("paints table cell text", () => {
    const ctx = mockCtx();
    let canvas = addTableElement(createEmptyCanvas(400, 300), "table-2x2");
    canvas.elements[0].cells[0] = "标题";
    paintCanvasPreview(ctx, canvas, 1);
    expect(
      ctx.fillText.mock.calls.some((call) => call[0] === "标题"),
    ).toBe(true);
  });
});
