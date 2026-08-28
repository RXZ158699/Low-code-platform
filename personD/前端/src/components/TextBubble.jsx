import { bubblePath, getBubbleProps } from "../bubbleText.js";

export default function TextBubble({ item }) {
  const props = getBubbleProps(item);
  if (!props) return null;
  const width = Math.max(1, Number(item.width) || 200);
  const height = Math.max(1, Number(item.height) || 100);

  return (
    <svg
      className="editor-text-bubble"
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d={bubblePath(props.kind, width, height, props)}
        fill={props.fill}
        stroke={props.stroke}
        strokeWidth={props.strokeWidth}
        strokeLinejoin="round"
      />
      {props.dashed ? (
        <path
          d={bubblePath(
            props.kind,
            width - 10,
            height - 10,
            { ...props, radius: Math.max(4, props.radius - 4) },
          )}
          fill="none"
          stroke={props.stroke}
          strokeWidth={1.5}
          strokeDasharray="7 5"
          transform="translate(5 5)"
        />
      ) : null}
    </svg>
  );
}
