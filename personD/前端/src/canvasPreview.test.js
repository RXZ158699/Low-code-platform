import { describe, expect, it, vi } from "vitest";
import { paintCanvasPreview } from "./canvasPreview.js";
import {
  createEmptyCanvas,
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
    ellipse: vi.fn(),
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
});
