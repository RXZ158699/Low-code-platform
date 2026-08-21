import { useId } from "react";
import {
  formatTextContent,
  getHighlightEllipses,
  getTextLines,
  getTextPaintRuns,
  getTextProps,
  hasSpanOverrides,
  textBackgroundPaint,
  textFillPaint,
} from "../canvas.js";

function typeStyle(style) {
  return {
    fontFamily: style.fontFamily,
    fontSize: `${Number(style.fontSize) || 16}px`,
    fontWeight: style.fontWeight,
    fontStyle: style.italic ? "italic" : "normal",
    letterSpacing: `${Number(style.letterSpacing) || 0}px`,
    textDecoration: [style.underline ? "underline" : "", style.strikethrough ? "line-through" : ""]
      .filter(Boolean)
      .join(" ") || "none",
  };
}

function HighlightRings({ item }) {
  return getHighlightEllipses(item).map((ring, index) => (
    <ellipse
      key={`${ring.color}-${ring.cx}-${ring.cy}-${index}`}
      cx={ring.cx}
      cy={ring.cy}
      rx={ring.rx}
      ry={ring.ry}
      fill="none"
      stroke={ring.color}
      strokeWidth={ring.strokeWidth}
    />
  ));
}

function MixedCopy({ item, copy }) {
  const uid = useId();
  const t = getTextProps(item);
  const runs = getTextPaintRuns(item);
  return (
    <span className="editor-el-copy-stack">
      <span className="editor-el-copy is-metrics" aria-hidden>
        {copy}
      </span>
      <svg className="editor-el-copy-svg" overflow="visible" aria-hidden>
        <HighlightRings item={item} />
        {runs.map((run, index) => {
          const style = getTextProps(run.style);
          const paint = textFillPaint(style);
          const strokeOn = style.strokeEnabled && Number(style.strokeWidth) > 0;
          const gradId = `text-grad-${uid.replace(/:/g, "")}-${index}`;
          const fill = paint.type === "gradient" ? `url(#${gradId})` : paint.color;
          const bg = textBackgroundPaint(style);
          return (
            <g
              key={`${run.x}-${run.y}-${index}`}
              style={
                style.shadowEnabled
                  ? { filter: `drop-shadow(${style.shadowX}px ${style.shadowY}px ${style.shadowBlur}px ${style.shadowColor})` }
                  : undefined
              }
            >
              {paint.type === "gradient" ? (
                <defs>
                  <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1={run.x} y1="0" x2={run.x + run.width} y2="0">
                    <stop offset="0%" stopColor={paint.from} />
                    <stop offset="100%" stopColor={paint.to} />
                  </linearGradient>
                </defs>
              ) : null}
              {bg ? <rect x={run.x} y={run.y} width={run.width} height={run.height} fill={bg} /> : null}
              <text
                x={run.x}
                y={run.y}
                textAnchor="start"
                dominantBaseline="text-before-edge"
                fill={fill}
                stroke={strokeOn ? style.strokeColor : "none"}
                strokeWidth={strokeOn ? Number(style.strokeWidth) * 2 : 0}
                paintOrder="stroke fill"
                strokeLinejoin="round"
                strokeLinecap="round"
                writingMode={t.writingMode === "vertical" ? "vertical-rl" : "horizontal-tb"}
                style={typeStyle(style)}
              >
                {run.text}
              </text>
            </g>
          );
        })}
      </svg>
    </span>
  );
}

export default function CanvasTextCopy({ item }) {
  const copy = formatTextContent(item);
  const t = getTextProps(item);
  const paint = textFillPaint(item);
  const lines = getTextLines(item);
  const uid = useId();
  if (hasSpanOverrides(item) || t.highlight) return <MixedCopy item={item} copy={copy} />;
  const gradId = `text-grad-${uid.replace(/:/g, "")}`;
  const strokeOn = t.strokeEnabled && Number(t.strokeWidth) > 0;
  const fontSize = Number(t.fontSize) || 16;
  const lineBox = fontSize * (Number(t.lineHeight) || 1.4);
  const anchor = t.textAlign === "center" ? "middle" : t.textAlign === "right" ? "end" : "start";
  const x = t.textAlign === "center" ? "50%" : t.textAlign === "right" ? "100%" : "0";
  const fill = paint.type === "gradient" ? `url(#${gradId})` : paint.color;

  return (
    <span className="editor-el-copy-stack">
      <span className="editor-el-copy is-metrics" aria-hidden>
        {copy}
      </span>
      <svg
        className="editor-el-copy-svg"
        overflow="visible"
        aria-hidden
        style={
          t.shadowEnabled
            ? { filter: `drop-shadow(${t.shadowX}px ${t.shadowY}px ${t.shadowBlur}px ${t.shadowColor})` }
            : undefined
        }
      >
        <HighlightRings item={item} />
        {paint.type === "gradient" ? (
          <defs>
            <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="100%" y2="0">
              <stop offset="0%" stopColor={paint.from} />
              <stop offset="100%" stopColor={paint.to} />
            </linearGradient>
          </defs>
        ) : null}
        <text
          x={x}
          y="0"
          textAnchor={anchor}
          dominantBaseline="text-before-edge"
          fill={fill}
          stroke={strokeOn ? t.strokeColor : "none"}
          strokeWidth={strokeOn ? Number(t.strokeWidth) * 2 : 0}
          paintOrder="stroke fill"
          strokeLinejoin="round"
          strokeLinecap="round"
          writingMode={t.writingMode === "vertical" ? "vertical-rl" : "horizontal-tb"}
          style={typeStyle(t)}
        >
          {lines.map((line, index) => (
            <tspan key={index} x={x} dy={index === 0 ? 0 : lineBox}>
              {line || "\u00a0"}
            </tspan>
          ))}
        </text>
      </svg>
    </span>
  );
}
