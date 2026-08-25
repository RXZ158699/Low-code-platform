import {
  getLineProps,
  getShapeProps,
  isLineKind,
  lineStrokeProps,
  shapeKind,
  shapePathD,
  shapeStrokeLine,
} from "../canvas.js";

function lineLocalPoints(item) {
  const originX = Number(item.x) || 0;
  const originY = Number(item.y) || 0;
  const x1 = Number(item.x1);
  const y1 = Number(item.y1);
  const x2 = Number(item.x2);
  const y2 = Number(item.y2);
  if ([x1, y1, x2, y2].every(Number.isFinite)) {
    return { x1: x1 - originX, y1: y1 - originY, x2: x2 - originX, y2: y2 - originY };
  }
  const width = Math.max(1, Number(item.width) || 1);
  const height = Math.max(1, Number(item.height) || 1);
  return { x1: 0, y1: height / 2, x2: width, y2: height / 2 };
}

function clipIdFor(item) {
  return `shape-clip-${String(item?.id || "draft").replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

export default function CanvasShape({ item }) {
  const kind = shapeKind(item);
  const fill = item.fill || (isLineKind(kind) ? "#000000" : "#2563eb");
  if (isLineKind(kind)) {
    const line = getLineProps(item);
    const stroke = lineStrokeProps(kind, line.strokeWidth);
    const boxW = Math.max(1, Number(item.width) || 1);
    const boxH = Math.max(1, Number(item.height) || 1);
    const points = lineLocalPoints(item);
    return (
      <svg
        className="editor-el-shape is-line"
        viewBox={`0 0 ${boxW} ${boxH}`}
        preserveAspectRatio="none"
        aria-hidden="true"
        style={{ opacity: line.opacity / 100 }}
      >
        {line.strokeVisible ? (
          <line
            x1={points.x1}
            y1={points.y1}
            x2={points.x2}
            y2={points.y2}
            fill="none"
            stroke={fill}
            strokeWidth={stroke.width}
            strokeLinecap={stroke.cap}
            strokeDasharray={stroke.dash || undefined}
          />
        ) : null}
      </svg>
    );
  }

  const shape = getShapeProps(item);
  const width = Math.max(1, shape.width);
  const height = Math.max(1, shape.height);
  const radius = Math.min(shape.cornerRadius, Math.min(width, height) / 2);
  const d = shapePathD(shape.kind, width, height, radius);
  const showStroke = shape.strokeVisible && shape.strokeWidth > 0;
  const stroke = shapeStrokeLine(shape.strokeStyle, shape.strokeWidth);
  const paintWidth =
    shape.strokeAlign === "center" ? shape.strokeWidth : shape.strokeWidth * 2;
  const clipId = clipIdFor(item);
  const pathProps = {
    d,
    fill: shape.fillVisible ? shape.fill : "none",
    stroke: showStroke ? shape.stroke : "none",
    strokeWidth: showStroke ? paintWidth : 0,
    strokeLinecap: stroke.cap,
    strokeLinejoin: "round",
    strokeDasharray: stroke.dash || undefined,
  };
  const flip = `translate(${width / 2} ${height / 2}) scale(${shape.flippedX ? -1 : 1} ${shape.flippedY ? -1 : 1}) translate(${-width / 2} ${-height / 2})`;
  const path =
    showStroke && shape.strokeAlign === "inner" ? (
      <>
        <defs>
          <clipPath id={clipId}>
            <path d={d} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path {...pathProps} />
        </g>
      </>
    ) : (
      <path
        {...pathProps}
        paintOrder={showStroke && shape.strokeAlign === "outer" ? "stroke fill" : undefined}
      />
    );

  return (
    <svg
      className="editor-el-shape"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ opacity: shape.opacity / 100 }}
    >
      <g transform={flip}>{path}</g>
    </svg>
  );
}
