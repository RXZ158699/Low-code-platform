export const SPAN_STYLE_KEYS = [
  "color",
  "highlight",
  "gradientEnabled",
  "gradientFrom",
  "gradientTo",
  "strokeEnabled",
  "strokeColor",
  "strokeWidth",
  "shadowEnabled",
  "shadowColor",
  "shadowBlur",
  "shadowX",
  "shadowY",
  "boxBackground",
  "boxBackgroundOpacity",
  "fontWeight",
  "italic",
  "underline",
  "strikethrough",
];

function pickSpanStyle(source = {}) {
  const next = {};
  for (const key of SPAN_STYLE_KEYS) {
    if (Object.prototype.hasOwnProperty.call(source, key)) next[key] = source[key];
  }
  return next;
}

function spanSignature(span) {
  return SPAN_STYLE_KEYS.map((key) => `${key}:${span[key] ?? ""}`).join("|");
}

function mergeTextSpans(spans) {
  const out = [];
  for (const span of spans) {
    const text = String(span?.text ?? "");
    if (!text) continue;
    const next = { ...pickSpanStyle(span), text };
    const prev = out[out.length - 1];
    if (prev && spanSignature(prev) === spanSignature(next)) {
      prev.text += next.text;
    } else {
      out.push(next);
    }
  }
  return out;
}

function sliceSpans(spans, start, end) {
  let offset = 0;
  const out = [];
  for (const span of spans) {
    const text = String(span.text ?? "");
    const from = Math.max(start, offset) - offset;
    const to = Math.min(end, offset + text.length) - offset;
    if (to > from) out.push({ ...span, text: text.slice(from, to) });
    offset += text.length;
  }
  return out;
}

export function syncSpansToText(spans, text) {
  const nextText = String(text ?? "");
  const prevText = (spans || []).map((span) => String(span.text ?? "")).join("");
  if (prevText === nextText) return mergeTextSpans(spans || []);
  let prefix = 0;
  while (prefix < prevText.length && prefix < nextText.length && prevText[prefix] === nextText[prefix]) {
    prefix += 1;
  }
  const kept = sliceSpans(spans || [], 0, prefix);
  const rest = nextText.slice(prefix);
  if (rest) kept.push({ text: rest });
  return mergeTextSpans(kept);
}

export function getTextSpans(item = {}) {
  const text = String(item.text ?? "");
  if (Array.isArray(item.spans) && item.spans.length) {
    return syncSpansToText(item.spans, text);
  }
  return text ? [{ text }] : [];
}

export function hasSpanOverrides(item) {
  return getTextSpans(item).some((span) => SPAN_STYLE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(span, key)));
}

export function hasSpanBoxPaint(item) {
  return getTextSpans(item).some((span) => span.boxBackground);
}

export function applyTextStyle(item, range, patch) {
  const stylePatch = pickSpanStyle(patch);
  if (!Object.keys(stylePatch).length) return {};
  const text = String(item?.text ?? "");
  const length = text.length;
  const hasRange =
    range &&
    Number.isFinite(range.start) &&
    Number.isFinite(range.end) &&
    Math.abs(range.end - range.start) > 0;
  const start = hasRange ? Math.max(0, Math.min(range.start, range.end, length)) : 0;
  const end = hasRange ? Math.min(length, Math.max(range.start, range.end, 0)) : length;
  const whole = !hasRange || (start === 0 && end === length);

  if (whole) {
    const spans = getTextSpans(item).map((span) => {
      const next = { ...span };
      for (const key of Object.keys(stylePatch)) delete next[key];
      return next;
    });
    return { ...stylePatch, spans: mergeTextSpans(spans) };
  }

  const spans = getTextSpans(item);
  return {
    spans: mergeTextSpans([
      ...sliceSpans(spans, 0, start),
      ...sliceSpans(spans, start, end).map((span) => ({ ...span, ...stylePatch })),
      ...sliceSpans(spans, end, length),
    ]),
  };
}

export function resolvedStyleAt(item, offset) {
  const spans = getTextSpans(item);
  let index = 0;
  let match = spans[0] || { text: "" };
  for (const span of spans) {
    if (offset < index + span.text.length) {
      match = span;
      break;
    }
    index += span.text.length;
    match = span;
  }
  return { ...item, ...pickSpanStyle(match) };
}

export function itemForStylePanel(item, range) {
  if (!range || !(range.end > range.start)) return item;
  return resolvedStyleAt(item, range.start);
}

export function isSpanStylePatch(patch) {
  return SPAN_STYLE_KEYS.some((key) => Object.prototype.hasOwnProperty.call(patch || {}, key));
}
