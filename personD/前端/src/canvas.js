import {
  getTextSpans,
  hasSpanBoxPaint,
  resolvedStyleAt,
  SPAN_STYLE_KEYS,
  syncSpansToText,
} from "./textSpans.js";
import { COLLAGE_GAP, findCollageLayout } from "./collageLayouts.js";

export {
  applyTextStyle,
  getTextSpans,
  hasSpanBoxPaint,
  hasSpanOverrides,
  isSpanStylePatch,
  itemForStylePanel,
  resolvedStyleAt,
  SPAN_STYLE_KEYS,
  syncSpansToText,
} from "./textSpans.js";

const DEFAULT_CANVAS = {
  width: 1080,
  height: 1440,
  background: "#ffffff",
  backgroundOpacity: 100,
  backgroundImage: "",
  backgroundImageFit: "cover",
  elements: [],
};

function nextElementId(type) {
  return `${type}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function readOpacity(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return DEFAULT_CANVAS.backgroundOpacity;
  return Math.min(100, Math.max(0, number));
}

export function parseCanvas(json) {
  try {
    const data =
      typeof json === "string" ? JSON.parse(json || "{}") : json || {};
    return {
      width: Number(data.width) > 0 ? Number(data.width) : DEFAULT_CANVAS.width,
      height:
        Number(data.height) > 0 ? Number(data.height) : DEFAULT_CANVAS.height,
      background:
        typeof data.background === "string" && data.background
          ? data.background
          : DEFAULT_CANVAS.background,
      backgroundOpacity: readOpacity(data.backgroundOpacity),
      backgroundImage:
        typeof data.backgroundImage === "string"
          ? data.backgroundImage
          : DEFAULT_CANVAS.backgroundImage,
      backgroundImageFit:
        data.backgroundImageFit === "contain" ? "contain" : "cover",
      elements: Array.isArray(data.elements) ? data.elements : [],
    };
  } catch {
    return { ...DEFAULT_CANVAS, elements: [] };
  }
}

export function stringifyCanvas(canvas) {
  return JSON.stringify(canvas);
}

export function createEmptyCanvas(width, height) {
  return {
    width: Number(width) > 0 ? Number(width) : DEFAULT_CANVAS.width,
    height: Number(height) > 0 ? Number(height) : DEFAULT_CANVAS.height,
    background: DEFAULT_CANVAS.background,
    backgroundOpacity: DEFAULT_CANVAS.backgroundOpacity,
    backgroundImage: DEFAULT_CANVAS.backgroundImage,
    backgroundImageFit: DEFAULT_CANVAS.backgroundImageFit,
    elements: [],
  };
}

export function canvasBackgroundStyle(item = {}) {
  const data = { ...DEFAULT_CANVAS, ...item };
  return {
    backgroundColor: data.background,
    backgroundImage: data.backgroundImage
      ? `url("${data.backgroundImage}")`
      : undefined,
    backgroundSize: data.backgroundImageFit === "contain" ? "contain" : "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
  };
}

export function addTextElement(canvas, patch = {}) {
  const element = {
    id: nextElementId("text"),
    type: "text",
    text: "双击编辑文字",
    fontSize: 48,
    color: "#111827",
    autoWidth: true,
    ...patch,
  };
  const box = fitTextBox(element);
  const width = patch.width ?? box.width;
  const height = patch.height ?? box.height;
  const x = Number.isFinite(Number(patch.x))
    ? Number(patch.x)
    : Math.max(0, Math.round((canvas.width - width) / 2));
  const y = Number.isFinite(Number(patch.y))
    ? Number(patch.y)
    : Math.max(0, Math.round((canvas.height - height) / 2));
  return {
    ...canvas,
    elements: [
      ...canvas.elements,
      {
        ...element,
        x,
        y,
        autoWidth: patch.autoWidth ?? patch.width == null,
        width,
        height,
      },
    ],
  };
}

const LINE_KINDS = ["line", "dash", "dot"];
const SHAPE_KINDS = [
  "square",
  "triangle",
  "circle",
  "pentagon",
  ...LINE_KINDS,
];
export const SHAPE_LABELS = {
  square: "方形",
  triangle: "三角形",
  circle: "圆形",
  pentagon: "五边形",
  line: "直线",
  dash: "虚线",
  dot: "点线",
};
export const FILL_SHAPE_KINDS = ["square", "triangle", "circle", "pentagon"];
export const DEFAULT_SHAPE_FILL = "#2563eb";
const DEFAULT_SHAPE_STROKE = "#6b7280";
export const DEFAULT_LINE_FILL = "#000000";
const LINE_STROKE_WIDTH = 1;
const LINE_HIT_PAD = 8;
const SHAPE_STROKE_ALIGNS = ["inner", "center", "outer"];
const SHAPE_STROKE_STYLES = ["solid", "dash", "dot"];

export function isLineKind(value) {
  return LINE_KINDS.includes(value);
}

export function isShapeKind(value) {
  return SHAPE_KINDS.includes(value);
}

export function isShapeElement(item) {
  return item?.type === "shape" || item?.type === "rect";
}

export function shapeKind(item) {
  if (item?.type === "rect") return "square";
  return isShapeKind(item?.kind) ? item.kind : "square";
}

export function lineStrokeProps(kind, strokeWidth = LINE_STROKE_WIDTH) {
  const width =
    Number(strokeWidth) > 0 ? Number(strokeWidth) : LINE_STROKE_WIDTH;
  if (kind === "dash") {
    return {
      width,
      dash: `${Math.max(6, width * 4)} ${Math.max(4, width * 3)}`,
      cap: "butt",
    };
  }
  if (kind === "dot") {
    return { width, dash: `0 ${Math.max(6, width * 4)}`, cap: "round" };
  }
  return { width, dash: null, cap: "butt" };
}

export function lineBounds(
  x1,
  y1,
  x2,
  y2,
  pad = LINE_HIT_PAD,
  strokeWidth = LINE_STROKE_WIDTH,
) {
  const left = Math.min(x1, x2);
  const top = Math.min(y1, y2);
  const width = Math.abs(x2 - x1);
  const height = Math.abs(y2 - y1);
  const stroke =
    Number(strokeWidth) > 0 ? Number(strokeWidth) : LINE_STROKE_WIDTH;
  return {
    x: left - pad,
    y: top - pad,
    width: Math.max(stroke, width) + pad * 2,
    height: Math.max(stroke, height) + pad * 2,
  };
}

export function lineFromPoints(x1, y1, x2, y2, minSpan = 3) {
  const left = Number(x1);
  const top = Number(y1);
  const right = Number(x2);
  const bottom = Number(y2);
  if (![left, top, right, bottom].every(Number.isFinite)) return null;
  if (Math.hypot(right - left, bottom - top) < minSpan) return null;
  return {
    x1: left,
    y1: top,
    x2: right,
    y2: bottom,
    ...lineBounds(left, top, right, bottom),
  };
}

export function getLineProps(item = {}) {
  const x1 = Number(item.x1) || 0;
  const y1 = Number(item.y1) || 0;
  const x2 = Number(item.x2) || 0;
  const y2 = Number(item.y2) || 0;
  return {
    kind: isLineKind(item.kind) ? item.kind : "line",
    fill:
      typeof item.fill === "string" && item.fill
        ? item.fill
        : DEFAULT_LINE_FILL,
    strokeWidth:
      Number(item.strokeWidth) > 0
        ? Number(item.strokeWidth)
        : LINE_STROKE_WIDTH,
    opacity: Number.isFinite(Number(item.opacity))
      ? Math.min(100, Math.max(0, Number(item.opacity)))
      : 100,
    strokeVisible: item.strokeVisible !== false,
    locked: Boolean(item.locked),
    x1,
    y1,
    x2,
    y2,
    length: Math.hypot(x2 - x1, y2 - y1),
    originX: Math.min(x1, x2),
    originY: Math.min(y1, y2),
  };
}

function lineGeometryPatch(
  x1,
  y1,
  x2,
  y2,
  strokeWidth = LINE_STROKE_WIDTH,
) {
  return {
    x1,
    y1,
    x2,
    y2,
    ...lineBounds(x1, y1, x2, y2, LINE_HIT_PAD, strokeWidth),
  };
}

export function setLineLength(item, length) {
  const line = getLineProps(item);
  const next = Math.max(8, Number(length) || 0);
  const dx = line.x2 - line.x1;
  const dy = line.y2 - line.y1;
  const current = Math.hypot(dx, dy);
  if (!(current > 0)) {
    return lineGeometryPatch(
      line.x1,
      line.y1,
      line.x1 + next,
      line.y1,
      line.strokeWidth,
    );
  }
  const cx = (line.x1 + line.x2) / 2;
  const cy = (line.y1 + line.y2) / 2;
  const half = next / 2;
  const ux = dx / current;
  const uy = dy / current;
  return lineGeometryPatch(
    cx - ux * half,
    cy - uy * half,
    cx + ux * half,
    cy + uy * half,
    line.strokeWidth,
  );
}

export function setLineOrigin(item, x, y) {
  const line = getLineProps(item);
  const dx = (Number(x) || 0) - line.originX;
  const dy = (Number(y) || 0) - line.originY;
  return lineGeometryPatch(
    line.x1 + dx,
    line.y1 + dy,
    line.x2 + dx,
    line.y2 + dy,
    line.strokeWidth,
  );
}

export function setLineStrokeWidth(item, strokeWidth) {
  const line = getLineProps(item);
  const next = Math.min(
    40,
    Math.max(1, Number(strokeWidth) || LINE_STROKE_WIDTH),
  );
  return {
    strokeWidth: next,
    ...lineGeometryPatch(line.x1, line.y1, line.x2, line.y2, next),
  };
}

export function setLineEndpoint(item, which, x, y, minSpan = 3) {
  const line = getLineProps(item);
  const pivotX = which === "start" ? line.x2 : line.x1;
  const pivotY = which === "start" ? line.y2 : line.y1;
  let nextX = Number(x);
  let nextY = Number(y);
  if (!Number.isFinite(nextX) || !Number.isFinite(nextY)) {
    return lineGeometryPatch(line.x1, line.y1, line.x2, line.y2, line.strokeWidth);
  }
  const dx = nextX - pivotX;
  const dy = nextY - pivotY;
  const dist = Math.hypot(dx, dy);
  if (dist < minSpan) {
    if (dist === 0) {
      nextX = pivotX + minSpan;
      nextY = pivotY;
    } else {
      const scale = minSpan / dist;
      nextX = pivotX + dx * scale;
      nextY = pivotY + dy * scale;
    }
  }
  if (which === "start") {
    return lineGeometryPatch(nextX, nextY, pivotX, pivotY, line.strokeWidth);
  }
  return lineGeometryPatch(pivotX, pivotY, nextX, nextY, line.strokeWidth);
}

export function flipLine(item, axis) {
  const line = getLineProps(item);
  const cx = (line.x1 + line.x2) / 2;
  const cy = (line.y1 + line.y2) / 2;
  if (axis === "x") {
    return lineGeometryPatch(
      cx * 2 - line.x1,
      line.y1,
      cx * 2 - line.x2,
      line.y2,
      line.strokeWidth,
    );
  }
  return lineGeometryPatch(
    line.x1,
    cy * 2 - line.y1,
    line.x2,
    cy * 2 - line.y2,
    line.strokeWidth,
  );
}

export function boxFromDrag(x1, y1, x2, y2, minSpan = 3, lockAspect = false) {
  const originX = Number(x1);
  const originY = Number(y1);
  const pointerX = Number(x2);
  const pointerY = Number(y2);
  if (![originX, originY, pointerX, pointerY].every(Number.isFinite)) return null;
  const spanX = Math.abs(pointerX - originX);
  const spanY = Math.abs(pointerY - originY);
  if (lockAspect) {
    const size = Math.max(spanX, spanY);
    if (size < minSpan) return null;
    return {
      x: pointerX >= originX ? originX : originX - size,
      y: pointerY >= originY ? originY : originY - size,
      width: size,
      height: size,
    };
  }
  if (spanX < minSpan && spanY < minSpan) return null;
  return {
    x: Math.min(originX, pointerX),
    y: Math.min(originY, pointerY),
    width: spanX,
    height: spanY,
  };
}

function regularPolygonUnitPoints(sides) {
  const count = Math.max(3, Number(sides) || 3);
  return Array.from({ length: count }, (_, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / count;
    return [0.5 + 0.5 * Math.cos(angle), 0.5 + 0.5 * Math.sin(angle)];
  });
}

function shapeUnitPoints(kind) {
  if (kind === "triangle")
    return [
      [0.5, 0],
      [1, 1],
      [0, 1],
    ];
  if (kind === "pentagon") return regularPolygonUnitPoints(5);
  if (kind === "square" || kind === "rect") {
    return [
      [0, 0],
      [1, 0],
      [1, 1],
      [0, 1],
    ];
  }
  return null;
}

export function scaledShapePoints(kind, width, height) {
  const points = shapeUnitPoints(kind);
  if (!points) return [];
  return points.map(([x, y]) => [x * width, y * height]);
}

function clampNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function getShapeProps(item = {}) {
  const width = Math.max(0, Number(item.width) || 0);
  const height = Math.max(0, Number(item.height) || 0);
  const strokeStyle = SHAPE_STROKE_STYLES.includes(item.strokeStyle)
    ? item.strokeStyle
    : "solid";
  const strokeAlign = SHAPE_STROKE_ALIGNS.includes(item.strokeAlign)
    ? item.strokeAlign
    : "center";
  return {
    kind: shapeKind(item),
    fill:
      typeof item.fill === "string" && item.fill
        ? item.fill
        : DEFAULT_SHAPE_FILL,
    fillVisible: item.fillVisible !== false,
    stroke:
      typeof item.stroke === "string" && item.stroke
        ? item.stroke
        : DEFAULT_SHAPE_STROKE,
    strokeVisible: item.strokeVisible !== false,
    strokeWidth: clampNumber(item.strokeWidth, 0, 0, 80),
    strokeAlign,
    strokeStyle,
    cornerRadius: clampNumber(item.cornerRadius, 0, 0, 400),
    opacity: clampNumber(item.opacity, 100, 0, 100),
    locked: Boolean(item.locked),
    aspectLocked: Boolean(item.aspectLocked),
    flippedX: Boolean(item.flippedX),
    flippedY: Boolean(item.flippedY),
    x: Number(item.x) || 0,
    y: Number(item.y) || 0,
    width,
    height,
  };
}

export function flipShape(item, axis) {
  if (axis === "y") return { flippedY: !item?.flippedY };
  return { flippedX: !item?.flippedX };
}

export function shapeStrokeLine(style, strokeWidth) {
  const width = Math.max(0, Number(strokeWidth) || 0);
  const kind = style === "dash" || style === "dot" ? style : "line";
  const props = lineStrokeProps(kind, Math.max(1, width));
  return { ...props, width };
}

function ellipsePath(width, height) {
  const rx = Math.max(0, width / 2);
  const ry = Math.max(0, height / 2);
  return `M 0 ${ry} A ${rx} ${ry} 0 1 0 ${width} ${ry} A ${rx} ${ry} 0 1 0 0 ${ry} Z`;
}

function roundedRectPath(width, height, radius) {
  const w = Math.max(0, width);
  const h = Math.max(0, height);
  const r = Math.min(Math.max(0, radius), w / 2, h / 2);
  if (!(r > 0)) return `M 0 0 H ${w} V ${h} H 0 Z`;
  return `M ${r} 0 H ${w - r} A ${r} ${r} 0 0 1 ${w} ${r} V ${h - r} A ${r} ${r} 0 0 1 ${w - r} ${h} H ${r} A ${r} ${r} 0 0 1 0 ${h - r} V ${r} A ${r} ${r} 0 0 1 ${r} 0 Z`;
}

function roundedPolygonPath(points, radius) {
  if (!Array.isArray(points) || points.length < 3) return "";
  const r = Math.max(0, Number(radius) || 0);
  if (!(r > 0)) {
    return `M ${points[0][0]} ${points[0][1]} ${points
      .slice(1)
      .map((point) => `L ${point[0]} ${point[1]}`)
      .join(" ")} Z`;
  }
  const count = points.length;
  let d = "";
  for (let index = 0; index < count; index += 1) {
    const prev = points[(index + count - 1) % count];
    const curr = points[index];
    const next = points[(index + 1) % count];
    const inX = curr[0] - prev[0];
    const inY = curr[1] - prev[1];
    const outX = next[0] - curr[0];
    const outY = next[1] - curr[1];
    const inLen = Math.hypot(inX, inY) || 1;
    const outLen = Math.hypot(outX, outY) || 1;
    const corner = Math.min(r, inLen / 2, outLen / 2);
    const startX = curr[0] - (inX / inLen) * corner;
    const startY = curr[1] - (inY / inLen) * corner;
    const endX = curr[0] + (outX / outLen) * corner;
    const endY = curr[1] + (outY / outLen) * corner;
    d += index === 0 ? `M ${startX} ${startY}` : ` L ${startX} ${startY}`;
    d += ` Q ${curr[0]} ${curr[1]} ${endX} ${endY}`;
  }
  return `${d} Z`;
}

export function shapePathD(kind, width, height, radius = 0) {
  const w = Math.max(0, Number(width) || 0);
  const h = Math.max(0, Number(height) || 0);
  const r = Math.max(0, Number(radius) || 0);
  if (kind === "circle") return ellipsePath(w, h);
  if (kind === "square" || kind === "rect") return roundedRectPath(w, h, r);
  return roundedPolygonPath(scaledShapePoints(kind, w, h), r);
}

export function addShapeElement(canvas, kind, box = {}) {
  const shape = isShapeKind(kind) ? kind : "square";
  if (isLineKind(shape)) {
    const x1 = Number.isFinite(Number(box.x1))
      ? Number(box.x1)
      : Number.isFinite(Number(box.x))
        ? Number(box.x)
        : 80;
    const y1 = Number.isFinite(Number(box.y1))
      ? Number(box.y1)
      : Number.isFinite(Number(box.y))
        ? Number(box.y)
        : 240;
    const x2 = Number.isFinite(Number(box.x2))
      ? Number(box.x2)
      : x1 + (Number(box.width) > 0 ? Number(box.width) : 400);
    const y2 = Number.isFinite(Number(box.y2)) ? Number(box.y2) : y1;
    return {
      ...canvas,
      elements: [
        ...canvas.elements,
        {
          id: nextElementId("shape"),
          type: "shape",
          kind: shape,
          ...lineBounds(x1, y1, x2, y2),
          x1,
          y1,
          x2,
          y2,
          fill:
            typeof box.fill === "string" && box.fill
              ? box.fill
              : DEFAULT_LINE_FILL,
          strokeWidth: LINE_STROKE_WIDTH,
          opacity: 100,
          strokeVisible: true,
        },
      ],
    };
  }
  return {
    ...canvas,
    elements: [
      ...canvas.elements,
      {
        id: nextElementId("shape"),
        type: "shape",
        kind: shape,
        x: Number.isFinite(Number(box.x)) ? Number(box.x) : 80,
        y: Number.isFinite(Number(box.y))
          ? Number(box.y)
          : 240 + canvas.elements.length * 24,
        width: Number(box.width) > 0 ? Number(box.width) : 400,
        height: Number(box.height) > 0 ? Number(box.height) : 160,
        fill:
          typeof box.fill === "string" && box.fill
            ? box.fill
            : DEFAULT_SHAPE_FILL,
      },
    ],
  };
}

export function addRectElement(canvas) {
  return {
    ...canvas,
    elements: [
      ...canvas.elements,
      {
        id: nextElementId("rect"),
        type: "rect",
        x: 80,
        y: 240 + canvas.elements.length * 24,
        width: 400,
        height: 160,
        fill: DEFAULT_SHAPE_FILL,
      },
    ],
  };
}

export function isMediaElement(item) {
  return item?.type === "image" || item?.type === "video";
}

function fitMediaBox(canvas, naturalWidth, naturalHeight) {
  const sourceW = Number(naturalWidth) > 0 ? Number(naturalWidth) : 640;
  const sourceH = Number(naturalHeight) > 0 ? Number(naturalHeight) : 360;
  const maxW = Math.max(80, canvas.width * 0.62);
  const maxH = Math.max(80, canvas.height * 0.62);
  const scale = Math.min(maxW / sourceW, maxH / sourceH, 1);
  const width = Math.max(40, Math.round(sourceW * scale));
  const height = Math.max(40, Math.round(sourceH * scale));
  const offset = canvas.elements.filter(isMediaElement).length * 24;
  return {
    x: Math.max(0, Math.round((canvas.width - width) / 2) + offset),
    y: Math.max(0, Math.round((canvas.height - height) / 2) + offset),
    width,
    height,
  };
}

export function appendElements(canvas, elements) {
  if (!Array.isArray(elements) || elements.length === 0) return canvas;
  return {
    ...canvas,
    elements: [
      ...canvas.elements,
      ...elements.map((item) => ({
        ...item,
        id: nextElementId(item?.type || "el"),
      })),
    ],
  };
}

export function addMediaElement(canvas, patch = {}) {
  const type = patch.type === "video" ? "video" : "image";
  const box = fitMediaBox(canvas, patch.width, patch.height);
  return {
    ...canvas,
    elements: [
      ...canvas.elements,
      {
        id: nextElementId(type),
        type,
        src: typeof patch.src === "string" ? patch.src : "",
        name: typeof patch.name === "string" ? patch.name : "",
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      },
    ],
  };
}

export function isCollageElement(item) {
  return item?.type === "collage";
}

export function getCollageProps(item) {
  const gap = Number(item?.gap);
  const padding = Number(item?.padding);
  const radius = Number(item?.radius);
  const opacity = Number(item?.opacity);
  return {
    layoutId: item?.layoutId || "",
    gap: Number.isFinite(gap) && gap >= 0 ? gap : COLLAGE_GAP,
    padding: Number.isFinite(padding) && padding >= 0 ? padding : 0,
    radius: Number.isFinite(radius) && radius >= 0 ? radius : 0,
    opacity: Number.isFinite(opacity)
      ? Math.min(100, Math.max(0, opacity))
      : 100,
    fill: item?.fill || "#ffffff",
    seamless: Boolean(item?.seamless),
    aspectLocked: item?.aspectLocked !== false,
    locked: Boolean(item?.locked),
    flippedX: Boolean(item?.flippedX),
    flippedY: Boolean(item?.flippedY),
    x: Number(item?.x) || 0,
    y: Number(item?.y) || 0,
    width: Number(item?.width) || 0,
    height: Number(item?.height) || 0,
  };
}

export function applyCollageLayout(item, layoutRef) {
  const layout =
    typeof layoutRef === "string" ? findCollageLayout(layoutRef) : layoutRef;
  if (!layout?.id || !Array.isArray(layout.cells)) return {};
  const previous = item?.cells || [];
  return {
    layoutId: layout.id,
    rowCount: layout.rowCount,
    colCount: layout.colCount,
    colTemplate: layout.colTemplate,
    rowTemplate: layout.rowTemplate,
    cells: layout.cells.map((cell, index) => {
      const src = previous[index]?.src;
      if (!src) {
        return {
          r: cell.r,
          c: cell.c,
          rs: cell.rs,
          cs: cell.cs,
        };
      }
      const offset = collageCellOffset(previous[index]);
      return {
        r: cell.r,
        c: cell.c,
        rs: cell.rs,
        cs: cell.cs,
        src,
        ox: offset.ox,
        oy: offset.oy,
      };
    }),
  };
}

export function fitCollageToCanvas(canvas, item) {
  if (!isCollageElement(item) || !canvas) return {};
  return {
    x: 0,
    y: 0,
    width: canvas.width,
    height: canvas.height,
  };
}

export function fillCollageCells(item, urls) {
  const sources = (urls || []).filter(Boolean);
  if (!isCollageElement(item) || sources.length === 0) return {};
  const cells = (item.cells || []).map((cell) => ({ ...cell }));
  const queue = [...sources];
  const assign = (cell) => {
    cell.src = queue.shift();
    cell.ox = 50;
    cell.oy = 50;
  };
  for (const cell of cells) {
    if (!cell.src && queue.length) assign(cell);
  }
  for (const cell of cells) {
    if (!queue.length) break;
    assign(cell);
  }
  return { cells };
}

export function collageCellOffset(cell) {
  const ox = Number(cell?.ox);
  const oy = Number(cell?.oy);
  return {
    ox: Number.isFinite(ox) ? Math.min(100, Math.max(0, ox)) : 50,
    oy: Number.isFinite(oy) ? Math.min(100, Math.max(0, oy)) : 50,
  };
}

export function localDragDelta(
  dx,
  dy,
  rotate = 0,
  flippedX = false,
  flippedY = false,
) {
  const rad = ((Number(rotate) || 0) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  let x = dx * cos + dy * sin;
  let y = -dx * sin + dy * cos;
  if (flippedX) x = -x;
  if (flippedY) y = -y;
  return { dx: x, dy: y };
}

export function setCollageCellOffset(item, index, next = {}) {
  if (!isCollageElement(item)) return {};
  const cells = item.cells || [];
  if (!Number.isInteger(index) || index < 0 || index >= cells.length) {
    return {};
  }
  const current = collageCellOffset(cells[index]);
  const oxRaw = next.ox == null ? current.ox : Number(next.ox);
  const oyRaw = next.oy == null ? current.oy : Number(next.oy);
  if (!Number.isFinite(oxRaw) || !Number.isFinite(oyRaw)) return {};
  return {
    cells: cells.map((cell, cellIndex) =>
      cellIndex === index
        ? {
            ...cell,
            ox: Math.min(100, Math.max(0, oxRaw)),
            oy: Math.min(100, Math.max(0, oyRaw)),
          }
        : { ...cell },
    ),
  };
}

export function panCollageCell(item, index, start, dx, dy, box) {
  if (!isCollageElement(item) || !item.cells?.[index]?.src) return {};
  const props = getCollageProps(item);
  const local = localDragDelta(
    dx,
    dy,
    item.rotate,
    props.flippedX,
    props.flippedY,
  );
  const width = Math.max(1, Number(box?.width) || Number(item.width) || 1);
  const height = Math.max(1, Number(box?.height) || Number(item.height) || 1);
  const origin = collageCellOffset(start);
  return setCollageCellOffset(item, index, {
    ox: origin.ox - (local.dx / width) * 100,
    oy: origin.oy - (local.dy / height) * 100,
  });
}

export function setCollageCellSrc(item, index, src) {
  if (!isCollageElement(item) || !src) return {};
  const cells = item.cells || [];
  if (!Number.isInteger(index) || index < 0 || index >= cells.length) {
    return {};
  }
  return {
    cells: cells.map((cell, cellIndex) =>
      cellIndex === index ? { ...cell, src, ox: 50, oy: 50 } : { ...cell },
    ),
  };
}

export function setCollageSize(item, next = {}) {
  const min = MIN_ELEMENT_SIZE;
  const lock = next.aspectLocked ?? item?.aspectLocked !== false;
  const hasWidth = next.width != null;
  const hasHeight = next.height != null;
  let width = Math.max(
    min,
    Math.round(Number(hasWidth ? next.width : item?.width) || min),
  );
  let height = Math.max(
    min,
    Math.round(Number(hasHeight ? next.height : item?.height) || min),
  );
  if (lock && Number(item?.width) > 0 && Number(item?.height) > 0) {
    const aspect = Number(item.width) / Number(item.height);
    if (hasWidth && !hasHeight) {
      height = Math.max(min, Math.round(width / aspect));
    } else if (hasHeight && !hasWidth) {
      width = Math.max(min, Math.round(height * aspect));
    }
  }
  return { width, height };
}

function collageAspect(layout) {
  if (layout.frame === "square") return 1;
  if (layout.frame === "portrait") return 3 / 4;
  if (layout.frame === "landscape") return 4 / 3;
  const cols = Number(layout.colCount) || 1;
  const rows = Number(layout.rowCount) || 1;
  return Math.min(1.45, Math.max(0.7, cols / rows));
}

function fitCollageBox(canvas, layout) {
  const aspect = collageAspect(layout);
  const maxW = Math.max(80, canvas.width * 0.62);
  const maxH = Math.max(80, canvas.height * 0.62);
  let width = maxW;
  let height = width / aspect;
  if (height > maxH) {
    height = maxH;
    width = height * aspect;
  }
  width = Math.max(80, Math.round(width));
  height = Math.max(80, Math.round(height));
  const offset = canvas.elements.filter(isCollageElement).length * 24;
  return {
    x: Math.max(0, Math.round((canvas.width - width) / 2) + offset),
    y: Math.max(0, Math.round((canvas.height - height) / 2) + offset),
    width,
    height,
  };
}

export function addCollageElement(canvas, layoutRef) {
  const layout =
    typeof layoutRef === "string" ? findCollageLayout(layoutRef) : layoutRef;
  if (
    !layout?.id ||
    !Array.isArray(layout.cells) ||
    layout.cells.length === 0
  ) {
    return canvas;
  }
  const box = fitCollageBox(canvas, layout);
  return {
    ...canvas,
    elements: [
      ...canvas.elements,
      {
        id: nextElementId("collage"),
        type: "collage",
        layoutId: layout.id,
        rowCount: layout.rowCount,
        colCount: layout.colCount,
        colTemplate: layout.colTemplate,
        rowTemplate: layout.rowTemplate,
        gap: COLLAGE_GAP,
        cells: layout.cells.map((cell) => ({
          r: cell.r,
          c: cell.c,
          rs: cell.rs,
          cs: cell.cs,
        })),
        x: box.x,
        y: box.y,
        width: box.width,
        height: box.height,
      },
    ],
  };
}

export function updateElement(canvas, id, patch) {
  return {
    ...canvas,
    elements: canvas.elements.map((item) =>
      item.id === id ? { ...item, ...patch } : item,
    ),
  };
}

export function removeElement(canvas, id) {
  return {
    ...canvas,
    elements: canvas.elements.filter((item) => item.id !== id),
  };
}

export function clearCanvasElements(canvas) {
  if (!canvas.elements.length) return canvas;
  return {
    ...canvas,
    elements: [],
  };
}

export function duplicateElement(canvas, id, offset = 24) {
  const source = canvas.elements.find((item) => item.id === id);
  if (!source) return canvas;
  return {
    ...canvas,
    elements: [
      ...canvas.elements,
      {
        ...source,
        id: nextElementId(source.type),
        x: source.x + offset,
        y: source.y + offset,
        locked: false,
      },
    ],
  };
}

export function moveElementLayer(canvas, id, direction) {
  const index = canvas.elements.findIndex((item) => item.id === id);
  if (index < 0) return canvas;
  const next = [...canvas.elements];
  const [item] = next.splice(index, 1);
  if (direction === "up") {
    next.splice(Math.min(index + 1, next.length), 0, item);
  } else if (direction === "down") {
    next.splice(Math.max(index - 1, 0), 0, item);
  } else if (direction === "top") {
    next.push(item);
  } else if (direction === "bottom") {
    next.unshift(item);
  } else {
    next.splice(index, 0, item);
  }
  return { ...canvas, elements: next };
}

export const TEXT_FONTS = [
  {
    id: "source-han",
    label: "思源黑体 常规",
    family:
      '"Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif',
  },
  {
    id: "yahei",
    label: "微软雅黑",
    family: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  { id: "simsun", label: "宋体", family: 'SimSun, "Songti SC", serif' },
  { id: "kaiti", label: "楷体", family: 'KaiTi, STKaiti, "Kaiti SC", serif' },
  { id: "arial", label: "Arial", family: "Arial, Helvetica, sans-serif" },
  {
    id: "zcool",
    label: "站酷庆科黄油体",
    family: '"ZCOOL QingKe HuangYou", sans-serif',
  },
];

const DEFAULT_TEXT_PROPS = {
  fontFamily: TEXT_FONTS[0].family,
  fontWeight: 400,
  warp: null,
  italic: false,
  underline: false,
  strikethrough: false,
  writingMode: "horizontal",
  textAlign: "left",
  verticalAlign: "middle",
  lineHeight: 1.4,
  letterSpacing: 0,
  listStyle: "none",
  highlight: "",
  opacity: 100,
  fillEnabled: false,
  fillColor: "#ffffff",
  gradientEnabled: false,
  gradientFrom: "#111827",
  gradientTo: "#2563eb",
  strokeEnabled: false,
  strokeColor: "#111827",
  strokeWidth: 0,
  shadowEnabled: false,
  shadowColor: "#000000",
  shadowBlur: 8,
  shadowX: 0,
  shadowY: 4,
  boxBackground: "",
  boxBackgroundOpacity: 100,
  locked: false,
  flippedX: false,
  flippedY: false,
  aspectLocked: true,
  autoWidth: true,
};

export function getTextProps(item = {}) {
  return { ...DEFAULT_TEXT_PROPS, ...item };
}

export function getWarpProps(item = {}) {
  const warp = getTextProps(item).warp;
  if (!warp || !["arc", "wave"].includes(warp.type)) return null;
  const strength = Number(warp.strength);
  return {
    type: warp.type,
    strength: Number.isFinite(strength) ? Math.max(0, Math.min(120, strength)) : 40,
  };
}

export function warpGlyphPlacement(item = {}) {
  const warp = getWarpProps(item);
  if (!warp) return null;
  const glyphs = getTextGlyphs(item);
  const boxW = Math.max(1, Number(item.width) || 1);
  const centerX = boxW / 2;
  const halfW = Math.max(1, centerX);
  const strength = warp.strength;
  return glyphs.map((glyph) => {
    const cx = glyph.x + glyph.width / 2 - centerX;
    if (warp.type === "wave") {
      const period = Math.max(60, boxW / 2);
      const phase = (cx / period) * Math.PI * 2;
      const dy = -strength * Math.sin(phase);
      const slope = (-strength * Math.cos(phase) * Math.PI * 2) / period;
      return { glyph, dx: 0, dy, rotate: (Math.atan(slope) * 180) / Math.PI };
    }
    const ratio = cx / halfW;
    const dy = -strength * (1 - ratio * ratio);
    const slope = (2 * strength * cx) / (halfW * halfW);
    return { glyph, dx: 0, dy, rotate: (Math.atan(slope) * 180) / Math.PI };
  });
}

export function isTextAutoWidth(item) {
  return getTextProps(item).autoWidth !== false;
}

export function isBlankText(value) {
  return !String(value ?? "").trim();
}

export function formatTextContent(item) {
  const text = String(item?.text ?? "");
  const listStyle = getTextProps(item).listStyle;
  if (listStyle === "none" || !text) return text;
  return text
    .split("\n")
    .map((line, index) =>
      listStyle === "decimal" ? `${index + 1}. ${line}` : `• ${line}`,
    )
    .join("\n");
}

function hexOr(value, fallback) {
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value : fallback;
}

function textShadowValue(item) {
  const t = getTextProps(item);
  if (!t.shadowEnabled) return undefined;
  return `${t.shadowX}px ${t.shadowY}px ${t.shadowBlur}px ${t.shadowColor}`;
}

export function textGlyphStyle(item) {
  const t = getTextProps(item);
  const strokeOn = t.strokeEnabled && Number(t.strokeWidth) > 0;
  const shadow = strokeOn ? undefined : textShadowValue(item);
  if (!t.gradientEnabled) {
    return { color: t.color, textShadow: shadow };
  }
  const from = hexOr(t.gradientFrom, DEFAULT_TEXT_PROPS.gradientFrom);
  const to = hexOr(t.gradientTo, DEFAULT_TEXT_PROPS.gradientTo);
  return {
    backgroundImage: `linear-gradient(90deg, ${from} 0%, ${to} 100%)`,
    backgroundSize: "100% 100%",
    backgroundRepeat: "no-repeat",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
    textShadow: shadow,
  };
}

export function textStrokeLayerStyle(item) {
  const t = getTextProps(item);
  if (!t.strokeEnabled || !(Number(t.strokeWidth) > 0)) return null;
  return {
    WebkitTextStroke: `${Number(t.strokeWidth) * 2}px ${t.strokeColor}`,
    WebkitTextFillColor: "transparent",
    color: "transparent",
    textShadow: textShadowValue(item),
  };
}

function textTypeStyle(item) {
  const t = getTextProps(item);
  const decorations = [];
  if (t.underline) decorations.push("underline");
  if (t.strikethrough) decorations.push("line-through");
  return {
    fontFamily: t.fontFamily,
    fontSize: t.fontSize,
    fontWeight: t.fontWeight,
    fontStyle: t.italic ? "italic" : "normal",
    textDecoration: decorations.join(" ") || "none",
    textAlign: t.textAlign,
    lineHeight: t.lineHeight,
    letterSpacing: `${t.letterSpacing}px`,
    writingMode: t.writingMode === "vertical" ? "vertical-rl" : "horizontal-tb",
  };
}

function boxFillColor(hex, opacity) {
  const color = hexOr(hex, "");
  if (!color) return "";
  const pct = Number(opacity);
  const alpha = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 100;
  if (alpha >= 100) return color;
  const r = Number.parseInt(color.slice(1, 3), 16);
  const g = Number.parseInt(color.slice(3, 5), 16);
  const b = Number.parseInt(color.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha / 100})`;
}

export function textElementStyle(item) {
  const t = getTextProps(item);
  const boxFill = hasSpanBoxPaint(item)
    ? ""
    : boxFillColor(t.boxBackground, t.boxBackgroundOpacity);
  const wrap =
    !isTextAutoWidth(item) || Number(item.width) >= TEXT_BOX_MAX_WIDTH;
  return {
    ...textTypeStyle(item),
    background: boxFill || "transparent",
    opacity: Number(t.opacity) / 100,
    transform: `scale(${t.flippedX ? -1 : 1}, ${t.flippedY ? -1 : 1})`,
    transformOrigin: "center center",
    justifyContent:
      t.textAlign === "center"
        ? "center"
        : t.textAlign === "right"
          ? "flex-end"
          : "flex-start",
    alignItems:
      t.verticalAlign === "top"
        ? "flex-start"
        : t.verticalAlign === "bottom"
          ? "flex-end"
          : "center",
    overflow: "visible",
    overflowWrap: wrap ? "anywhere" : "normal",
    wordBreak: wrap ? "break-word" : "keep-all",
    whiteSpace: "pre-wrap",
  };
}

export const TEXT_BOX_MAX_WIDTH = 1000;
export const TEXT_BOX_MAX_RESIZE = 8000;
export const MIN_ELEMENT_SIZE = 16;

export const SNAP_GUIDE_DISTANCE = 8;

function bestLineSnap(edge, lines, threshold) {
  let best = null;
  for (const line of lines) {
    const delta = line - edge;
    if (
      Math.abs(delta) <= threshold &&
      (!best || Math.abs(delta) < Math.abs(best.delta))
    ) {
      best = { delta, line };
    }
  }
  return best;
}

export function snapMoveRect(
  rect,
  width,
  height,
  threshold = SNAP_GUIDE_DISTANCE,
) {
  const vertical = [0, width / 2, width];
  const horizontal = [0, height / 2, height];
  const xHit = bestLineSnap(rect.x, vertical, threshold)
    || bestLineSnap(rect.x + rect.width, vertical, threshold)
    || bestLineSnap(rect.x + rect.width / 2, vertical, threshold);
  const yHit = bestLineSnap(rect.y, horizontal, threshold)
    || bestLineSnap(rect.y + rect.height, horizontal, threshold)
    || bestLineSnap(rect.y + rect.height / 2, horizontal, threshold);
  return {
    x: xHit ? rect.x + xHit.delta : rect.x,
    y: yHit ? rect.y + yHit.delta : rect.y,
    guides: {
      vertical: xHit ? [xHit.line] : [],
      horizontal: yHit ? [yHit.line] : [],
    },
  };
}

export function snapResizeRect(
  rect,
  handle,
  width,
  height,
  threshold = SNAP_GUIDE_DISTANCE,
  minSize = MIN_ELEMENT_SIZE,
) {
  const vertical = [0, width / 2, width];
  const horizontal = [0, height / 2, height];
  let x = rect.x;
  let y = rect.y;
  let nextWidth = rect.width;
  let nextHeight = rect.height;
  const guides = { vertical: [], horizontal: [] };

  if (handle.includes("e")) {
    const hit = bestLineSnap(rect.x + rect.width, vertical, threshold);
    if (hit) {
      nextWidth = Math.max(minSize, rect.width + hit.delta);
      guides.vertical.push(hit.line);
    }
  }
  if (handle.includes("w")) {
    const hit = bestLineSnap(rect.x, vertical, threshold);
    if (hit) {
      x = rect.x + hit.delta;
      nextWidth = rect.width - hit.delta;
      if (nextWidth < minSize) {
        x = rect.x + rect.width - minSize;
        nextWidth = minSize;
      }
      guides.vertical.push(hit.line);
    }
  }
  if (handle.includes("s")) {
    const hit = bestLineSnap(rect.y + rect.height, horizontal, threshold);
    if (hit) {
      nextHeight = Math.max(minSize, rect.height + hit.delta);
      guides.horizontal.push(hit.line);
    }
  }
  if (handle.includes("n")) {
    const hit = bestLineSnap(rect.y, horizontal, threshold);
    if (hit) {
      y = rect.y + hit.delta;
      nextHeight = rect.height - hit.delta;
      if (nextHeight < minSize) {
        y = rect.y + rect.height - minSize;
        nextHeight = minSize;
      }
      guides.horizontal.push(hit.line);
    }
  }
  return { x, y, width: nextWidth, height: nextHeight, guides };
}

const TEXT_FIT_KEYS = [
  "text",
  "fontSize",
  "fontFamily",
  "fontWeight",
  "italic",
  "letterSpacing",
  "lineHeight",
  "writingMode",
  "listStyle",
];

const TEXT_BOX_PAD_X = 8;
const TEXT_BOX_PAD_Y = 8;

let measureCtx;
let measureUnavailable = false;

function estimatedCharWidth(ch, fontSize) {
  const code = ch.codePointAt(0) || 0;
  return code <= 0x7e ? fontSize * 0.55 : fontSize;
}

function canvasCharWidth(ch, style) {
  if (measureUnavailable) return 0;
  try {
    if (!measureCtx) {
      const canvas =
        typeof globalThis.OffscreenCanvas === "function"
          ? new globalThis.OffscreenCanvas(1, 1)
          : document.createElement("canvas");
      measureCtx = canvas.getContext?.("2d") || null;
      if (!measureCtx) {
        measureUnavailable = true;
        return 0;
      }
    }
    const italic = style.italic ? "italic " : "";
    measureCtx.font = `${italic}${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
    const width = measureCtx.measureText(ch).width;
    return width > 0 ? width : 0;
  } catch {
    measureUnavailable = true;
    measureCtx = null;
    return 0;
  }
}

function charWidth(ch, style) {
  const estimated = estimatedCharWidth(ch, style.fontSize);
  const fromCanvas = canvasCharWidth(ch, style);
  return Math.max(estimated, fromCanvas);
}

function lineWidth(text, style) {
  const chars = [...String(text)];
  if (!chars.length) return 0;
  const glyphs = chars.reduce((sum, ch) => sum + charWidth(ch, style), 0);
  return (
    glyphs + Math.max(0, chars.length - 1) * Number(style.letterSpacing || 0)
  );
}

function wrapParagraph(text, maxInner, style) {
  if (!text) return [""];
  const lines = [];
  let current = "";
  let currentWidth = 0;
  const spacing = Number(style.letterSpacing || 0);
  for (const ch of text) {
    const width = charWidth(ch, style);
    const nextWidth = current ? currentWidth + spacing + width : width;
    if (current && nextWidth > maxInner) {
      lines.push(current);
      current = ch;
      currentWidth = width;
    } else {
      current += ch;
      currentWidth = nextWidth;
    }
  }
  lines.push(current);
  return lines;
}

export function textFillPaint(item) {
  const t = getTextProps(item);
  if (!t.gradientEnabled) {
    return { type: "solid", color: t.color };
  }
  return {
    type: "gradient",
    from: hexOr(t.gradientFrom, DEFAULT_TEXT_PROPS.gradientFrom),
    to: hexOr(t.gradientTo, DEFAULT_TEXT_PROPS.gradientTo),
  };
}

export function getTextLines(item) {
  const style = getTextProps(item);
  const display = formatTextContent({
    ...style,
    text: item.text ?? style.text,
  });
  const autoWidth = isTextAutoWidth(item);
  const maxBox = autoWidth ? TEXT_BOX_MAX_WIDTH : TEXT_BOX_MAX_RESIZE;
  const maxInner = Math.max(1, maxBox - TEXT_BOX_PAD_X);
  const requested = Number(item.width);
  const wrapAt = autoWidth
    ? maxInner
    : Math.min(
        maxInner,
        Math.max(
          1,
          (Number.isFinite(requested) ? requested : maxBox) - TEXT_BOX_PAD_X,
        ),
      );
  return String(display)
    .split("\n")
    .flatMap((paragraph) => wrapParagraph(paragraph, wrapAt, style));
}

const EDITOR_EL_PAD = 4;

function textWrapAt(item) {
  const autoWidth = isTextAutoWidth(item);
  const maxBox = autoWidth ? TEXT_BOX_MAX_WIDTH : TEXT_BOX_MAX_RESIZE;
  const maxInner = Math.max(1, maxBox - TEXT_BOX_PAD_X);
  const requested = Number(item.width);
  return autoWidth
    ? maxInner
    : Math.min(
        maxInner,
        Math.max(
          1,
          (Number.isFinite(requested) ? requested : maxBox) - TEXT_BOX_PAD_X,
        ),
      );
}

export function getTextGlyphs(item) {
  const style = getTextProps(item);
  const text = String(item.text ?? "");
  const fontSize = Number(style.fontSize) || 16;
  const lineBox = fontSize * (Number(style.lineHeight) || 1.4);
  const spacing = Number(style.letterSpacing) || 0;
  const pad = EDITOR_EL_PAD;
  const wrapAt = textWrapAt(item);
  const boxW = Number(item.width) || 0;
  const innerW = Math.max(1, boxW - pad * 2);
  const vertical = style.writingMode === "vertical";
  const glyphs = [];
  let sourceIndex = 0;
  let lineIndex = 0;
  const paragraphs = text.split("\n");
  paragraphs.forEach((paragraph, paragraphIndex) => {
    wrapParagraph(paragraph, wrapAt, style).forEach((line) => {
      const measured = lineWidth(line, style);
      let x = pad;
      let y = pad + lineIndex * lineBox;
      if (vertical) {
        x = Math.max(pad, boxW - pad - (lineIndex + 1) * lineBox);
        y = pad;
      } else if (style.textAlign === "center") {
        x = pad + Math.max(0, (innerW - measured) / 2);
      } else if (style.textAlign === "right") {
        x = pad + Math.max(0, innerW - measured);
      }
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        const width = Math.max(1, charWidth(ch, style));
        glyphs.push({
          start: sourceIndex,
          end: sourceIndex + 1,
          ch,
          x,
          y,
          width: vertical ? lineBox : width,
          height: vertical ? width : lineBox,
        });
        if (vertical) y += width + (i < line.length - 1 ? spacing : 0);
        else x += width + (i < line.length - 1 ? spacing : 0);
        sourceIndex += 1;
      }
      lineIndex += 1;
    });
    if (paragraphIndex < paragraphs.length - 1) sourceIndex += 1;
  });
  return glyphs;
}

export function hitTestTextOffset(item, localX, localY) {
  const glyphs = getTextGlyphs(item);
  if (!glyphs.length) return 0;
  for (const glyph of glyphs) {
    if (
      localX >= glyph.x &&
      localX <= glyph.x + glyph.width &&
      localY >= glyph.y &&
      localY <= glyph.y + glyph.height
    ) {
      return localX < glyph.x + glyph.width / 2 ? glyph.start : glyph.end;
    }
  }
  let best = glyphs[0];
  let bestDist = Infinity;
  for (const glyph of glyphs) {
    const cx = glyph.x + glyph.width / 2;
    const cy = glyph.y + glyph.height / 2;
    const dist = (localX - cx) ** 2 + (localY - cy) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = glyph;
    }
  }
  return localX < best.x + best.width / 2 ? best.start : best.end;
}

export function getSelectionRects(item, start, end) {
  const from = Math.min(start, end);
  const to = Math.max(start, end);
  if (!(to > from)) return [];
  return getTextGlyphs(item)
    .filter((glyph) => glyph.end > from && glyph.start < to)
    .map((glyph) => ({
      x: glyph.x,
      y: glyph.y,
      width: glyph.width,
      height: glyph.height,
    }));
}

export function getHighlightEllipses(item) {
  const boxColor = hexOr(getTextProps(item).highlight, "");
  const spanHit = getTextSpans(item).some((span) => hexOr(span.highlight, ""));
  if (!boxColor && !spanHit) return [];
  const glyphs = getTextGlyphs(item);
  const groups = [];
  let current = null;
  for (const glyph of glyphs) {
    const style = getTextProps(resolvedStyleAt(item, glyph.start));
    const color = hexOr(style.highlight, "");
    const fontSize = Number(style.fontSize) || 16;
    const vertical = style.writingMode === "vertical";
    const lineBox = vertical ? glyph.width : glyph.height;
    // SVG copy inherits CSS line-height, so painted glyphs sit in the em-square
    // centered in the line box rather than flush with glyph.y / glyph.x.
    const halfLeading = Math.max(0, (lineBox - fontSize) / 2);
    const left = vertical ? glyph.x + halfLeading : glyph.x;
    const right = vertical ? left + fontSize : glyph.x + glyph.width;
    const top = vertical ? glyph.y : glyph.y + halfLeading;
    const bottom = vertical ? glyph.y + glyph.height : top + fontSize;
    if (!color) {
      if (current) {
        groups.push(current);
        current = null;
      }
      continue;
    }
    if (current && current.color === color && glyph.start === current.end) {
      current.end = glyph.end;
      current.minX = Math.min(current.minX, left);
      current.minY = Math.min(current.minY, top);
      current.maxX = Math.max(current.maxX, right);
      current.maxY = Math.max(current.maxY, bottom);
      current.fontSize = Math.max(current.fontSize, fontSize);
    } else {
      if (current) groups.push(current);
      current = {
        color,
        end: glyph.end,
        minX: left,
        minY: top,
        maxX: right,
        maxY: bottom,
        fontSize,
      };
    }
  }
  if (current) groups.push(current);
  return groups.map((group) => {
    const width = Math.max(1, group.maxX - group.minX);
    const height = Math.max(1, group.maxY - group.minY);
    const padX = group.fontSize * 0.22;
    const padY = group.fontSize * 0.16;
    return {
      cx: group.minX + width / 2,
      cy: group.minY + height / 2,
      rx: width / 2 + padX,
      ry: height / 2 + padY,
      color: group.color,
      strokeWidth: Math.max(2, group.fontSize * 0.08),
    };
  });
}

export function textBackgroundPaint(item) {
  const t = getTextProps(item);
  return boxFillColor(t.boxBackground, t.boxBackgroundOpacity) || "";
}

function paintKey(style) {
  return SPAN_STYLE_KEYS.map((key) => `${key}:${style[key] ?? ""}`).join("|");
}

export function getTextPaintRuns(item) {
  const runs = [];
  for (const glyph of getTextGlyphs(item)) {
    const style = resolvedStyleAt(item, glyph.start);
    const key = paintKey(style);
    const last = runs[runs.length - 1];
    if (
      last &&
      last.key === key &&
      Math.abs(last.y - glyph.y) < 0.5 &&
      Math.abs(last.x + last.width - glyph.x) < 1.5
    ) {
      last.text += glyph.ch;
      last.width = glyph.x + glyph.width - last.x;
      last.height = Math.max(last.height, glyph.height);
    } else {
      runs.push({
        key,
        text: glyph.ch,
        x: glyph.x,
        y: glyph.y,
        width: glyph.width,
        height: glyph.height,
        style,
      });
    }
  }
  return runs;
}

export function fitTextBox(item) {
  const style = getTextProps(item);
  const display = formatTextContent({
    ...style,
    text: item.text ?? style.text,
  });
  const autoWidth = isTextAutoWidth(item);
  const paragraphs = String(display).split("\n");
  const longestRaw = Math.max(
    0,
    ...paragraphs.map((paragraph) => lineWidth(paragraph, style)),
  );
  const requested = Number(item.width);
  const lines = getTextLines(item);
  const lineBox = Number(style.fontSize) * (Number(style.lineHeight) || 1.4);
  const minBoxW = Math.max(
    MIN_ELEMENT_SIZE,
    Math.ceil((Number(style.fontSize) || 16) + TEXT_BOX_PAD_X),
  );
  const width = autoWidth
    ? Math.min(
        TEXT_BOX_MAX_WIDTH,
        Math.max(minBoxW, Math.ceil(longestRaw + TEXT_BOX_PAD_X)),
      )
    : Math.min(
        TEXT_BOX_MAX_RESIZE,
        Math.max(
          minBoxW,
          Number.isFinite(requested) ? requested : longestRaw + TEXT_BOX_PAD_X,
        ),
      );
  const height = Math.max(
    MIN_ELEMENT_SIZE,
    Math.ceil(Math.max(1, lines.length) * lineBox + TEXT_BOX_PAD_Y),
  );
  return { width, height };
}

export function patchTextElement(item, patch) {
  const next = { ...item, ...patch };
  if (item?.type !== "text") return next;
  if (next.autoWidth === undefined) next.autoWidth = true;
  if (patch.width != null && patch.autoWidth === undefined) {
    next.autoWidth = false;
  }
  if (patch.text != null && patch.spans === undefined) {
    next.spans = syncSpansToText(getTextSpans(item), next.text);
  }
  const layoutChanged = TEXT_FIT_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(patch, key),
  );
  if (!layoutChanged && patch.width == null && patch.autoWidth === undefined) {
    if (patch.height == null) return next;
    const box = fitTextBox(next);
    return { ...next, height: Math.max(Number(patch.height) || 0, box.height) };
  }
  const box = fitTextBox(next);
  if (isTextAutoWidth(next)) {
    return { ...next, width: box.width, height: box.height };
  }
  return {
    ...next,
    width: Math.min(TEXT_BOX_MAX_RESIZE, Number(next.width) || box.width),
    height: box.height,
  };
}

export function pointerAngle(cx, cy, px, py) {
  return (Math.atan2(py - cy, px - cx) * 180) / Math.PI;
}

export function rotateFromDrag(startRotate, startAngle, currentAngle) {
  return startRotate + (currentAngle - startAngle);
}

export function elementRotateStyle(item) {
  const deg = Number(item?.rotate);
  if (!Number.isFinite(deg) || deg === 0) return undefined;
  return { transform: `rotate(${deg}deg)` };
}

export const TRANSFORM_HANDLES = [
  { id: "nw", label: "左上" },
  { id: "n", label: "上" },
  { id: "ne", label: "右上" },
  { id: "e", label: "右" },
  { id: "se", label: "右下" },
  { id: "s", label: "下" },
  { id: "sw", label: "左下" },
  { id: "w", label: "左" },
];

export function isCornerHandle(handle) {
  return handle === "nw" || handle === "ne" || handle === "se" || handle === "sw";
}

export function applyHandleResize(
  box,
  handle,
  dx,
  dy,
  minSize = MIN_ELEMENT_SIZE,
  lockAspect = false,
) {
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  let x = box.x;
  let y = box.y;
  let width = box.width;
  let height = box.height;

  if (handle.includes("e")) {
    width = Math.max(minSize, box.width + dx);
  }
  if (handle.includes("s")) {
    height = Math.max(minSize, box.height + dy);
  }
  if (handle.includes("w")) {
    x = Math.min(box.x + dx, right - minSize);
    width = right - x;
  }
  if (handle.includes("n")) {
    y = Math.min(box.y + dy, bottom - minSize);
    height = bottom - y;
  }

  if (!lockAspect || !(box.width > 0) || !(box.height > 0)) {
    return { x, y, width, height };
  }

  const ratio = box.width / box.height;
  const scaleX = width / box.width;
  const scaleY = height / box.height;
  const fromX = handle.includes("e") || handle.includes("w");
  const fromY = handle.includes("n") || handle.includes("s");
  let scale = 1;
  if (fromX && fromY) {
    scale = Math.abs(scaleX - 1) >= Math.abs(scaleY - 1) ? scaleX : scaleY;
  } else if (fromX) {
    scale = scaleX;
  } else if (fromY) {
    scale = scaleY;
  }
  width = Math.max(minSize, box.width * scale);
  height = Math.max(minSize, width / ratio);
  if (height < minSize) {
    height = minSize;
    width = Math.max(minSize, height * ratio);
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  if (handle.includes("e")) {
    x = box.x;
  } else if (handle.includes("w")) {
    x = right - width;
  } else {
    x = cx - width / 2;
  }
  if (handle.includes("s")) {
    y = box.y;
  } else if (handle.includes("n")) {
    y = bottom - height;
  } else {
    y = cy - height / 2;
  }

  return { x, y, width, height };
}

const MIN_CANVAS_SIZE = 1;
const MAX_CANVAS_SIZE = 30000;

function shiftElement(item, dx, dy) {
  if (!dx && !dy) return item;
  const next = { ...item };
  for (const key of ["x", "x1", "x2"]) {
    if (Number.isFinite(item[key])) next[key] = item[key] + dx;
  }
  for (const key of ["y", "y1", "y2"]) {
    if (Number.isFinite(item[key])) next[key] = item[key] + dy;
  }
  return next;
}

export function resizeCanvas(canvas, handle, dx, dy) {
  const box = applyHandleResize(
    { x: 0, y: 0, width: canvas.width, height: canvas.height },
    handle,
    dx,
    dy,
    MIN_CANVAS_SIZE,
  );
  const width = Math.round(
    Math.min(MAX_CANVAS_SIZE, Math.max(MIN_CANVAS_SIZE, box.width)),
  );
  const height = Math.round(
    Math.min(MAX_CANVAS_SIZE, Math.max(MIN_CANVAS_SIZE, box.height)),
  );
  const ox = -box.x;
  const oy = -box.y;
  return {
    ...canvas,
    width,
    height,
    elements:
      ox || oy
        ? canvas.elements.map((item) => shiftElement(item, ox, oy))
        : canvas.elements,
  };
}

export function applyTextHandleResize(item, handle, dx, dy) {
  const start = {
    x: item.x,
    y: item.y,
    width: item.width,
    height: item.height,
  };
  const lockAspect = isCornerHandle(handle);
  const box = applyHandleResize(
    start,
    handle,
    dx,
    dy,
    MIN_ELEMENT_SIZE,
    lockAspect,
  );
  const width = Math.min(TEXT_BOX_MAX_RESIZE, box.width);
  if (!lockAspect) {
    const fitted = fitTextBox({ ...item, width, autoWidth: false });
    return {
      x: box.x,
      y: box.y,
      width,
      height: handle.includes("n") || handle.includes("s") ? box.height : fitted.height,
      fontSize: item.fontSize,
      autoWidth: false,
    };
  }
  const scale = start.width > 0 ? width / start.width : 1;
  const fontSize = Math.max(8, Math.round((item.fontSize || 16) * scale));
  const fitted = fitTextBox({ ...item, width, fontSize, autoWidth: false });
  return {
    x: box.x,
    y: box.y,
    width,
    height: fitted.height,
    fontSize,
    autoWidth: false,
  };
}

const MIN_CANVAS_ZOOM = 0.05;
const MAX_CANVAS_ZOOM = 4;

export function clampCanvasZoom(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return MIN_CANVAS_ZOOM;
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, number));
}

export function zoomByWheelDelta(current, deltaY) {
  return clampCanvasZoom(current * Math.exp(-Number(deltaY || 0) * 0.0018));
}
