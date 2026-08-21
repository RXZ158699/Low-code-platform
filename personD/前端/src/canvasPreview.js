import { collageCellBoxes, COLLAGE_PLACEHOLDER } from "./collageLayouts.js";
import {
  getCollageProps,
  getHighlightEllipses,
  getTextPaintRuns,
  getLineProps,
  getTextProps,
  isCollageElement,
  isLineKind,
  isShapeElement,
  lineStrokeProps,
  parseCanvas,
  scaledShapePoints,
  shapeKind,
  textBackgroundPaint,
  textFillPaint,
} from "./canvas.js";

const THUMB_MAX_EDGE = 720;

function colorWithOpacity(hex, opacity) {
  const color = /^#([0-9a-fA-F]{6})$/.test(hex) ? hex : "#ffffff";
  const pct = Number(opacity);
  const alpha = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 100;
  if (alpha >= 100) return color;
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
}

function paintFill(style) {
  const paint = textFillPaint(style);
  return paint.type === "gradient" ? paint.from : paint.color || "#111827";
}

function paintShape(ctx, item) {
  const x = Number(item.x) || 0;
  const y = Number(item.y) || 0;
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  const kind = shapeKind(item);
  ctx.globalAlpha = 1;
  if (isLineKind(kind)) {
    const line = getLineProps(item);
    if (!line.strokeVisible) return;
    const stroke = lineStrokeProps(kind, line.strokeWidth);
    const x1 = Number.isFinite(Number(item.x1)) ? Number(item.x1) : x;
    const y1 = Number.isFinite(Number(item.y1))
      ? Number(item.y1)
      : y + height / 2;
    const x2 = Number.isFinite(Number(item.x2)) ? Number(item.x2) : x + width;
    const y2 = Number.isFinite(Number(item.y2))
      ? Number(item.y2)
      : y + height / 2;
    ctx.globalAlpha = line.opacity / 100;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = item.fill || "#000000";
    ctx.lineWidth = stroke.width;
    ctx.lineCap = stroke.cap;
    if (typeof ctx.setLineDash === "function") {
      ctx.setLineDash(stroke.dash ? stroke.dash.split(" ").map(Number) : []);
    }
    ctx.stroke();
    if (typeof ctx.setLineDash === "function") ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    return;
  }
  ctx.fillStyle = item.fill || "#d1d5db";
  if (kind === "square") {
    ctx.fillRect(x, y, width, height);
    return;
  }
  ctx.beginPath();
  if (kind === "circle") {
    ctx.ellipse(
      x + width / 2,
      y + height / 2,
      Math.max(0, width / 2),
      Math.max(0, height / 2),
      0,
      0,
      Math.PI * 2,
    );
  } else {
    scaledShapePoints(kind, width, height).forEach(([px, py], index) => {
      if (index === 0) ctx.moveTo(x + px, y + py);
      else ctx.lineTo(x + px, y + py);
    });
    ctx.closePath();
  }
  ctx.fill();
}

function paintText(ctx, item) {
  const originX = Number(item.x) || 0;
  const originY = Number(item.y) || 0;
  const box = textBackgroundPaint(item);
  if (box) {
    ctx.fillStyle = box;
    ctx.fillRect(
      originX,
      originY,
      Number(item.width) || 0,
      Number(item.height) || 0,
    );
  }
  ctx.globalAlpha = Math.min(
    1,
    Math.max(0, (Number(getTextProps(item).opacity) || 100) / 100),
  );
  for (const ring of getHighlightEllipses(item)) {
    ctx.beginPath();
    ctx.ellipse(
      originX + ring.cx,
      originY + ring.cy,
      ring.rx,
      ring.ry,
      0,
      0,
      Math.PI * 2,
    );
    ctx.strokeStyle = ring.color;
    ctx.lineWidth = ring.strokeWidth;
    ctx.stroke();
  }
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  for (const run of getTextPaintRuns(item)) {
    const style = getTextProps(run.style);
    const fontSize = Number(style.fontSize) || 16;
    const halfLeading = Math.max(0, (Number(run.height) - fontSize) / 2);
    ctx.font = `${style.italic ? "italic " : ""}${style.fontWeight || 400} ${fontSize}px ${style.fontFamily}`;
    ctx.fillStyle = paintFill(style);
    ctx.fillText(run.text, originX + run.x, originY + run.y + halfLeading);
  }
  ctx.globalAlpha = 1;
}

function fillRoundRect(ctx, x, y, width, height, radius) {
  if (radius > 0 && typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    return;
  }
  ctx.fillRect(x, y, width, height);
}

function paintCollage(ctx, item) {
  const x = Number(item.x) || 0;
  const y = Number(item.y) || 0;
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  const props = getCollageProps(item);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, props.opacity / 100));
  const cx = x + width / 2;
  const cy = y + height / 2;
  ctx.translate(cx, cy);
  const rotate = Number(item.rotate) || 0;
  if (rotate) ctx.rotate((rotate * Math.PI) / 180);
  ctx.scale(props.flippedX ? -1 : 1, props.flippedY ? -1 : 1);
  ctx.translate(-cx, -cy);
  ctx.fillStyle = props.fill;
  fillRoundRect(ctx, x, y, width, height, props.radius);
  ctx.fillStyle = COLLAGE_PLACEHOLDER;
  for (const box of collageCellBoxes(item)) {
    fillRoundRect(ctx, box.x, box.y, box.width, box.height, props.radius);
  }
  ctx.restore();
}

export function paintCanvasPreview(ctx, canvas, scale = 1) {
  const data =
    typeof canvas === "string"
      ? parseCanvas(canvas)
      : canvas || parseCanvas(null);
  const width = Number(data.width) || 1;
  const height = Number(data.height) || 1;
  ctx.save();
  ctx.scale(scale, scale);
  ctx.globalAlpha = 1;
  ctx.fillStyle = colorWithOpacity(data.background, data.backgroundOpacity);
  ctx.fillRect(0, 0, width, height);
  for (const item of data.elements || []) {
    if (item?.type === "text") paintText(ctx, item);
    else if (isCollageElement(item)) paintCollage(ctx, item);
    else if (isShapeElement(item)) paintShape(ctx, item);
  }
  ctx.restore();
}

export function canvasPreviewBlob(canvas, { maxEdge = THUMB_MAX_EDGE } = {}) {
  const data =
    typeof canvas === "string"
      ? parseCanvas(canvas)
      : canvas || parseCanvas(null);
  const width = Math.max(1, Number(data.width) || 1);
  const height = Math.max(1, Number(data.height) || 1);
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  const el = document.createElement("canvas");
  el.width = Math.max(1, Math.round(width * scale));
  el.height = Math.max(1, Math.round(height * scale));
  const ctx = el.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  paintCanvasPreview(ctx, data, scale);
  if (typeof el.toBlob !== "function") return Promise.resolve(null);
  return new Promise((resolve) => {
    el.toBlob((blob) => resolve(blob), "image/png");
  });
}
