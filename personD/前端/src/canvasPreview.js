import { collageCellBoxes, COLLAGE_PLACEHOLDER } from "./collageLayouts.js";
import {
  getCollageProps,
  getHighlightEllipses,
  getMagnifierProps,
  getTextPaintRuns,
  getLineProps,
  getShapeProps,
  getTableProps,
  getTextProps,
  isCollageElement,
  isLineKind,
  isMagnifierElement,
  isShapeElement,
  isTableElement,
  lineStrokeProps,
  parseCanvas,
  scaledShapePoints,
  shapeKind,
  shapePathD,
  shapeStrokeLine,
  textBackgroundPaint,
  textFillPaint,
  warpGlyphPlacement,
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

function applyDash(ctx, dash) {
  if (typeof ctx.setLineDash !== "function") return;
  ctx.setLineDash(dash ? dash.split(" ").map(Number) : []);
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
    applyDash(ctx, stroke.dash);
    ctx.stroke();
    applyDash(ctx, null);
    ctx.globalAlpha = 1;
    return;
  }
  const shape = getShapeProps(item);
  ctx.save();
  ctx.globalAlpha = Math.min(1, Math.max(0, shape.opacity / 100));
  ctx.translate(x + width / 2, y + height / 2);
  ctx.scale(shape.flippedX ? -1 : 1, shape.flippedY ? -1 : 1);
  ctx.translate(-(x + width / 2), -(y + height / 2));
  const radius = Math.min(shape.cornerRadius, Math.min(width, height) / 2);
  const showStroke = shape.strokeVisible && shape.strokeWidth > 0;
  const simpleSquare =
    shape.kind === "square" &&
    !(radius > 0) &&
    !showStroke &&
    !shape.flippedX &&
    !shape.flippedY;
  if (simpleSquare) {
    if (shape.fillVisible) {
      ctx.fillStyle = shape.fill;
      ctx.fillRect(x, y, width, height);
    }
    ctx.restore();
    return;
  }
  if (typeof globalThis.Path2D === "function" && typeof ctx.fill === "function") {
    const path = new globalThis.Path2D(shapePathD(shape.kind, width, height, radius));
    ctx.translate(x, y);
    if (shape.fillVisible) {
      ctx.fillStyle = shape.fill;
      ctx.fill(path);
    }
    if (showStroke) {
      const stroke = shapeStrokeLine(shape.strokeStyle, shape.strokeWidth);
      ctx.strokeStyle = shape.stroke;
      ctx.lineWidth =
        shape.strokeAlign === "center" ? shape.strokeWidth : shape.strokeWidth * 2;
      ctx.lineCap = stroke.cap;
      ctx.lineJoin = "round";
      applyDash(ctx, stroke.dash);
      if (shape.strokeAlign === "inner" && typeof ctx.clip === "function") {
        ctx.save();
        ctx.clip(path);
        ctx.stroke(path);
        ctx.restore();
      } else {
        ctx.stroke(path);
      }
      applyDash(ctx, null);
    }
    ctx.restore();
    return;
  }
  ctx.fillStyle = shape.fill;
  if (shape.kind === "square") {
    if (shape.fillVisible) ctx.fillRect(x, y, width, height);
    ctx.restore();
    return;
  }
  ctx.beginPath();
  if (shape.kind === "circle") {
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
    scaledShapePoints(shape.kind, width, height).forEach(([px, py], index) => {
      if (index === 0) ctx.moveTo(x + px, y + py);
      else ctx.lineTo(x + px, y + py);
    });
    ctx.closePath();
  }
  if (shape.fillVisible) ctx.fill();
  ctx.restore();
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
  const placements = warpGlyphPlacement(item);
  if (placements) {
    const style = getTextProps(item);
    const fontSize = Number(style.fontSize) || 16;
    for (const placement of placements) {
      const halfLeading = Math.max(
        0,
        (Number(placement.glyph.height) - fontSize) / 2,
      );
      ctx.save();
      ctx.translate(
        originX + placement.glyph.x + placement.glyph.width / 2 + placement.dx,
        originY + placement.glyph.y + placement.glyph.height / 2 + placement.dy,
      );
      ctx.rotate((placement.rotate * Math.PI) / 180);
      ctx.font = `${style.italic ? "italic " : ""}${style.fontWeight || 400} ${fontSize}px ${style.fontFamily}`;
      ctx.fillStyle = paintFill(style);
      ctx.fillText(
        placement.glyph.ch,
        -placement.glyph.width / 2,
        -placement.glyph.height / 2 + halfLeading,
      );
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    return;
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

function paintMagnifier(ctx, item, canvas) {
  const props = getMagnifierProps(item);
  const x = Number(item.x) || 0;
  const y = Number(item.y) || 0;
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(props.focusX, props.focusY);
  ctx.lineTo(x + width / 2, y + height / 2);
  ctx.stroke();
  const traceMagnifier = () => {
    ctx.beginPath();
    if (props.shape === "circle") {
      ctx.ellipse(
        x + width / 2,
        y + height / 2,
        width / 2,
        height / 2,
        0,
        0,
        Math.PI * 2,
      );
    } else if (
      props.shape === "rounded" &&
      typeof ctx.roundRect === "function"
    ) {
      ctx.roundRect(x, y, width, height, 28);
    } else {
      ctx.rect(x, y, width, height);
    }
  };
  ctx.save();
  traceMagnifier();
  ctx.clip();
  ctx.save();
  ctx.translate(x + width / 2, y + height / 2);
  ctx.scale(props.scale, props.scale);
  ctx.translate(-props.focusX, -props.focusY);
  paintCanvasContent(
    ctx,
    canvas,
    (canvas.elements || []).filter(
      (entry) => entry.id !== item.id && !isMagnifierElement(entry),
    ),
  );
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = "#64748b";
  ctx.lineWidth = 1.5;
  traceMagnifier();
  ctx.stroke();
  ctx.fillStyle = "#ef4444";
  ctx.beginPath();
  ctx.arc(props.focusX, props.focusY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function paintTable(ctx, item) {
  const props = getTableProps(item);
  const x = Number(item.x) || 0;
  const y = Number(item.y) || 0;
  const width = Number(item.width) || 0;
  const height = Number(item.height) || 0;
  const colWidth = width / props.cols;
  const rowHeight = height / props.rows;
  const gap = props.gap > 0 ? props.gap : 1;
  ctx.save();
  ctx.fillStyle = props.borderColor;
  ctx.fillRect(x, y, width, height);
  ctx.fillStyle = props.fill;
  for (let row = 0; row < props.rows; row += 1) {
    for (let col = 0; col < props.cols; col += 1) {
      const cellX = x + col * colWidth + gap;
      const cellY = y + row * rowHeight + gap;
      ctx.fillRect(
        cellX,
        cellY,
        Math.max(0, colWidth - gap * 2),
        Math.max(0, rowHeight - gap * 2),
      );
    }
  }
  ctx.fillStyle = props.textColor;
  ctx.font = `${props.fontSize}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  props.cells.forEach((text, index) => {
    const col = index % props.cols;
    const row = Math.floor(index / props.cols);
    if (text) {
      ctx.fillText(
        text,
        x + col * colWidth + colWidth / 2,
        y + row * rowHeight + rowHeight / 2,
      );
    }
  });
  ctx.restore();
}

function paintCanvasContent(ctx, canvas, items) {
  ctx.save();
  ctx.fillStyle = colorWithOpacity(canvas.background, canvas.backgroundOpacity);
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (const item of items || []) {
    if (item?.type === "text") paintText(ctx, item);
    else if (isCollageElement(item)) paintCollage(ctx, item);
    else if (isMagnifierElement(item)) paintMagnifier(ctx, item, canvas);
    else if (isTableElement(item)) paintTable(ctx, item);
    else if (isShapeElement(item)) paintShape(ctx, item);
  }
  ctx.restore();
}

export function paintCanvasPreview(ctx, canvas, scale = 1) {
  const data =
    typeof canvas === "string"
      ? parseCanvas(canvas)
      : canvas || parseCanvas(null);
  ctx.save();
  ctx.scale(scale, scale);
  paintCanvasContent(ctx, data, data.elements);
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
