import { getLineProps, isLineKind, lineStrokeProps, shapeKind, shapeUnitPoints } from "../canvas.js";

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
  const points = shapeUnitPoints(kind);
  return (
    <svg className="editor-el-shape" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden="true">
      {kind === "circle" || !points ? (
        <ellipse cx="0.5" cy="0.5" rx="0.5" ry="0.5" fill={fill} />
      ) : (
        <polygon points={points.map((point) => point.join(",")).join(" ")} fill={fill} />
      )}
    </svg>
  );
}
