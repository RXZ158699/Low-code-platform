const DEFAULT_CANVAS = {
  width: 1080,
  height: 1440,
  background: "#ffffff",
  backgroundOpacity: 100,
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
    const data = typeof json === "string" ? JSON.parse(json || "{}") : json || {};
    return {
      width: Number(data.width) > 0 ? Number(data.width) : DEFAULT_CANVAS.width,
      height: Number(data.height) > 0 ? Number(data.height) : DEFAULT_CANVAS.height,
      background: typeof data.background === "string" && data.background ? data.background : DEFAULT_CANVAS.background,
      backgroundOpacity: readOpacity(data.backgroundOpacity),
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
    elements: [],
  };
}

export function addTextElement(canvas, patch = {}) {
  const element = {
    id: nextElementId("text"),
    type: "text",
    x: 80,
    y: 120 + canvas.elements.length * 40,
    text: "双击编辑文字",
    fontSize: 48,
    color: "#111827",
    autoWidth: true,
    ...patch,
  };
  const box = fitTextBox(element);
  return {
    ...canvas,
    elements: [
      ...canvas.elements,
      {
        ...element,
        autoWidth: patch.autoWidth ?? patch.width == null,
        width: patch.width ?? box.width,
        height: patch.height ?? box.height,
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
        fill: "#2563eb",
      },
    ],
  };
}

export function updateElement(canvas, id, patch) {
  return {
    ...canvas,
    elements: canvas.elements.map((item) => (item.id === id ? { ...item, ...patch } : item)),
  };
}

export function removeElement(canvas, id) {
  return {
    ...canvas,
    elements: canvas.elements.filter((item) => item.id !== id),
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
    family: '"Noto Sans SC", "Source Han Sans SC", "Microsoft YaHei", sans-serif',
  },
  { id: "yahei", label: "微软雅黑", family: '"Microsoft YaHei", "PingFang SC", sans-serif' },
  { id: "simsun", label: "宋体", family: 'SimSun, "Songti SC", serif' },
  { id: "kaiti", label: "楷体", family: 'KaiTi, STKaiti, "Kaiti SC", serif' },
  { id: "arial", label: "Arial", family: "Arial, Helvetica, sans-serif" },
  { id: "zcool", label: "站酷庆科黄油体", family: '"ZCOOL QingKe HuangYou", sans-serif' },
];

export const DEFAULT_TEXT_PROPS = {
  fontFamily: TEXT_FONTS[0].family,
  fontWeight: 400,
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
  strokeEnabled: false,
  strokeColor: "#111827",
  strokeWidth: 0,
  shadowEnabled: false,
  shadowColor: "#000000",
  shadowBlur: 8,
  shadowX: 0,
  shadowY: 4,
  boxBackground: "",
  locked: false,
  flippedX: false,
  flippedY: false,
  aspectLocked: true,
};

export function getTextProps(item = {}) {
  return { ...DEFAULT_TEXT_PROPS, ...item };
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
    .map((line, index) => (listStyle === "decimal" ? `${index + 1}. ${line}` : `• ${line}`))
    .join("\n");
}

export function textPaintStyle(item) {
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
    color: t.color,
    WebkitTextStroke: t.strokeEnabled && t.strokeWidth > 0 ? `${t.strokeWidth}px ${t.strokeColor}` : undefined,
    paintOrder: t.strokeEnabled && t.strokeWidth > 0 ? "stroke fill" : undefined,
    textShadow: t.shadowEnabled
      ? `${t.shadowX}px ${t.shadowY}px ${t.shadowBlur}px ${t.shadowColor}`
      : undefined,
  };
}

export function textElementStyle(item) {
  const t = getTextProps(item);
  const boxFill = t.highlight || t.boxBackground || (t.fillEnabled ? t.fillColor : "");
  const wrap = item.autoWidth === false || Number(item.width) >= TEXT_BOX_MAX_WIDTH;
  return {
    ...textPaintStyle(item),
    background: boxFill || "transparent",
    opacity: Number(t.opacity) / 100,
    transform: `scale(${t.flippedX ? -1 : 1}, ${t.flippedY ? -1 : 1})`,
    transformOrigin: "center center",
    justifyContent: t.textAlign === "center" ? "center" : t.textAlign === "right" ? "flex-end" : "flex-start",
    alignItems: t.verticalAlign === "top" ? "flex-start" : t.verticalAlign === "bottom" ? "flex-end" : "center",
    overflow: "visible",
    overflowWrap: wrap ? "anywhere" : "normal",
    wordBreak: wrap ? "break-word" : "keep-all",
    whiteSpace: "pre-wrap",
  };
}

export const TEXT_BOX_MAX_WIDTH = 1000;
export const MIN_ELEMENT_SIZE = 16;

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
        typeof OffscreenCanvas === "function" ? new OffscreenCanvas(1, 1) : document.createElement("canvas");
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
  return glyphs + Math.max(0, chars.length - 1) * Number(style.letterSpacing || 0);
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

export function fitTextBox(item) {
  const style = getTextProps(item);
  const display = formatTextContent({ ...style, text: item.text ?? style.text });
  const autoWidth = item.autoWidth === true;
  const maxInner = Math.max(1, TEXT_BOX_MAX_WIDTH - TEXT_BOX_PAD_X);
  const paragraphs = String(display).split("\n");
  const longestRaw = Math.max(0, ...paragraphs.map((paragraph) => lineWidth(paragraph, style)));
  const wrapAt = autoWidth
    ? maxInner
    : Math.min(maxInner, Math.max(1, Number(item.width) - TEXT_BOX_PAD_X || maxInner));
  const lines = paragraphs.flatMap((paragraph) => wrapParagraph(paragraph, wrapAt, style));
  const lineBox = Number(style.fontSize) * (Number(style.lineHeight) || 1.4);
  const minBoxW = Math.max(MIN_ELEMENT_SIZE, Math.ceil((Number(style.fontSize) || 16) + TEXT_BOX_PAD_X));
  const width = autoWidth
    ? Math.min(TEXT_BOX_MAX_WIDTH, Math.max(minBoxW, Math.ceil(longestRaw + TEXT_BOX_PAD_X)))
    : Math.min(TEXT_BOX_MAX_WIDTH, Math.max(minBoxW, Number(item.width) || longestRaw + TEXT_BOX_PAD_X));
  const height = Math.max(MIN_ELEMENT_SIZE, Math.ceil(Math.max(1, lines.length) * lineBox + TEXT_BOX_PAD_Y));
  return { width, height };
}

export function patchTextElement(item, patch) {
  const next = { ...item, ...patch };
  if (item?.type !== "text") return next;
  if (patch.width != null && patch.autoWidth === undefined) {
    next.autoWidth = false;
  }
  const layoutChanged = TEXT_FIT_KEYS.some((key) => Object.prototype.hasOwnProperty.call(patch, key));
  if (!layoutChanged && patch.width == null && patch.autoWidth === undefined) {
    if (patch.height == null) return next;
    const box = fitTextBox(next);
    return { ...next, height: Math.max(Number(patch.height) || 0, box.height) };
  }
  const box = fitTextBox(next);
  if (next.autoWidth === true) {
    return { ...next, width: box.width, height: box.height };
  }
  return {
    ...next,
    width: Math.min(TEXT_BOX_MAX_WIDTH, Number(next.width) || box.width),
    height: box.height,
  };
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

export function applyHandleResize(box, handle, dx, dy, minSize = MIN_ELEMENT_SIZE) {
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

  return { x, y, width, height };
}

export const MIN_CANVAS_ZOOM = 0.05;
export const MAX_CANVAS_ZOOM = 4;

export function clampCanvasZoom(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return MIN_CANVAS_ZOOM;
  return Math.min(MAX_CANVAS_ZOOM, Math.max(MIN_CANVAS_ZOOM, number));
}

export function zoomByWheelDelta(current, deltaY) {
  return clampCanvasZoom(current * Math.exp(-Number(deltaY || 0) * 0.0018));
}
