import { doodlePathD, isDoodleElement } from "../canvas.js";
import { getDoodleProps } from "../doodlePens.js";

export default function CanvasDoodle({ item }) {
  if (!isDoodleElement(item)) return null;
  const props = getDoodleProps(item);
  const width = Math.max(1, Number(item.width) || 1);
  const height = Math.max(1, Number(item.height) || 1);
  const points = (item.points || []).map((point) => ({
    x: Number(point.x) - Number(item.x),
    y: Number(point.y) - Number(item.y),
  }));
  const d = doodlePathD(item);
  const opacity = props.opacity / 100;
  const common = {
    fill: "none",
    stroke: props.stroke,
    strokeLinecap: "round",
    strokeLinejoin: "round",
  };
  const body = [];

  if (props.mode === "spray") {
    body.push(
      <path
        key="spray-base"
        d={d}
        {...common}
        strokeWidth={Math.max(1, props.strokeWidth * 0.5)}
        opacity={opacity * 0.4}
        strokeDasharray="1 7"
      />,
    );
    points.forEach((point, index) => {
      if (index % 2 !== 0) return;
      const jx = ((index * 13) % 7) - 3;
      const jy = ((index * 17) % 7) - 3;
      body.push(
        <circle
          key={`dot-${index}`}
          cx={point.x + jx}
          cy={point.y + jy}
          r={Math.max(1, props.strokeWidth * 0.28)}
          fill={props.stroke}
          opacity={opacity * 0.55}
        />,
      );
    });
  } else if (props.mode === "watercolor") {
    body.push(
      <path
        key="water-1"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth * 1.1}
        opacity={opacity * 0.45}
        style={{ filter: "blur(1.6px)" }}
      />,
      <path
        key="water-2"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth * 0.8}
        opacity={opacity * 0.35}
        transform="translate(2 1)"
        style={{ filter: "blur(1.8px)" }}
      />,
      <path
        key="water-3"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth * 0.5}
        opacity={opacity * 0.3}
        transform="translate(-2 -1)"
        style={{ filter: "blur(2px)" }}
      />,
    );
  } else if (props.mode === "pencil") {
    body.push(
      <path
        key="pencil-1"
        d={d}
        {...common}
        strokeWidth={Math.max(1, props.strokeWidth * 0.7)}
        opacity={opacity * 0.75}
        strokeDasharray="1 3"
      />,
      <path
        key="pencil-2"
        d={d}
        {...common}
        strokeWidth={Math.max(1, props.strokeWidth * 0.45)}
        opacity={opacity * 0.25}
        transform="translate(1.5 1)"
        strokeDasharray="2 4"
      />,
    );
  } else if (props.mode === "crayon") {
    body.push(
      <path
        key="crayon-1"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth}
        opacity={opacity * 0.8}
        strokeDasharray="3 3"
      />,
      <path
        key="crayon-2"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth * 0.6}
        opacity={opacity * 0.3}
        transform="translate(2 -1)"
        strokeDasharray="2 5"
      />,
    );
  } else if (props.mode === "oil") {
    body.push(
      <path
        key="oil-1"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth * 1.25}
        opacity={opacity * 0.85}
        strokeLinecap="butt"
      />,
      <path
        key="oil-2"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth * 0.35}
        opacity={opacity * 0.6}
        transform="translate(2 0)"
        strokeLinecap="butt"
      />,
      <path
        key="oil-3"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth * 0.35}
        opacity={opacity * 0.6}
        transform="translate(-2 0)"
        strokeLinecap="butt"
      />,
    );
  } else if (props.mode === "calligraphy") {
    for (let index = 0; index < points.length - 1; index += 1) {
      const current = points[index];
      const next = points[index + 1];
      body.push(
        <line
          key={`brush-${index}`}
          x1={current.x}
          y1={current.y}
          x2={next.x}
          y2={next.y}
          stroke={props.stroke}
          strokeWidth={Math.max(
            1,
            props.strokeWidth * (0.5 + 0.7 * Math.abs(Math.sin(index * 0.8))),
          )}
          strokeLinecap="round"
          opacity={opacity * 0.9}
        />,
      );
    }
    body.push(
      <path
        key="brush-dash"
        d={d}
        {...common}
        strokeWidth={Math.max(1, props.strokeWidth * 0.3)}
        opacity={opacity * 0.3}
        strokeDasharray="2 6"
      />,
    );
  } else if (props.mode === "colored") {
    body.push(
      <path
        key="colored-1"
        d={d}
        {...common}
        strokeWidth={Math.max(1, props.strokeWidth * 0.65)}
        opacity={opacity * 0.75}
        strokeDasharray="1 3"
      />,
      <path
        key="colored-2"
        d={d}
        {...common}
        strokeWidth={Math.max(1, props.strokeWidth * 0.35)}
        opacity={opacity * 0.3}
        transform="translate(1.5 -1)"
        strokeDasharray="2 5"
      />,
    );
  } else if (props.mode === "highlighter") {
    body.push(
      <path
        key="highlighter-1"
        d={d}
        {...common}
        strokeWidth={Math.max(8, props.strokeWidth)}
        opacity={opacity * 0.55}
        style={
          props.glow > 0
            ? { filter: `drop-shadow(0 0 ${props.glow}px ${props.stroke})` }
            : undefined
        }
      />,
      <path
        key="highlighter-2"
        d={d}
        {...common}
        strokeWidth={Math.max(4, props.strokeWidth * 0.5)}
        opacity={opacity * 0.35}
      />,
    );
  } else if (props.mode === "fountain") {
    body.push(
      <path
        key="fountain-1"
        d={d}
        {...common}
        strokeWidth={Math.max(1, props.strokeWidth * 0.8)}
        opacity={opacity * 0.95}
      />,
      <path
        key="fountain-2"
        d={d}
        {...common}
        strokeWidth={Math.max(1, props.strokeWidth * 0.4)}
        opacity={opacity * 0.35}
        transform="translate(1 0)"
      />,
    );
  } else {
    body.push(
      <path
        key="marker"
        d={d}
        {...common}
        strokeWidth={props.strokeWidth}
        opacity={opacity}
        strokeDasharray={props.dash || undefined}
      />,
    );
  }

  return (
    <svg
      className="editor-el-doodle"
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {body}
    </svg>
  );
}
