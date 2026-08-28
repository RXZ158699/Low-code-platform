import {
  canvasBackgroundStyle,
  elementRotateStyle,
  getMagnifierProps,
  isCollageElement,
  isLineKind,
  isMagnifierElement,
  isMediaElement,
  isShapeElement,
  MAGNIFIER_SIZE,
  shapeKind,
  textElementStyle,
} from "../canvas.js";
import CanvasCollage from "./CanvasCollage.jsx";
import CanvasMedia from "./CanvasMedia.jsx";
import CanvasShape from "./CanvasShape.jsx";
import CanvasTextCopy from "./CanvasTextCopy.jsx";

function magnifierChildStyle(child) {
  const style = {
    left: child.x,
    top: child.y,
    width: child.width,
    height: child.height,
  };
  if (child.type === "text") return { ...style, ...textElementStyle(child) };
  if (
    isShapeElement(child) ||
    isMediaElement(child) ||
    isCollageElement(child)
  ) {
    return { ...style, ...elementRotateStyle(child) };
  }
  return style;
}

function renderMagnifierChild(child) {
  if (child.type === "text") {
    return (
      <span className="editor-el-text-host">
        <CanvasTextCopy item={child} />
      </span>
    );
  }
  if (isShapeElement(child)) return <CanvasShape item={child} />;
  if (isCollageElement(child)) return <CanvasCollage item={child} />;
  if (isMediaElement(child)) return <CanvasMedia item={child} />;
  return null;
}

export default function CanvasMagnifier({ item, canvas }) {
  if (!isMagnifierElement(item)) return null;
  const props = getMagnifierProps(item);
  const width = Math.max(1, Number(item.width) || MAGNIFIER_SIZE);
  const height = Math.max(1, Number(item.height) || MAGNIFIER_SIZE);
  const radius =
    props.shape === "circle"
      ? "50%"
      : props.shape === "rounded"
        ? "28px"
        : "4px";
  const sources = (canvas?.elements || []).filter(
    (entry) => !isMagnifierElement(entry),
  );
  const layerLeft = width / 2 - props.focusX * props.scale;
  const layerTop = height / 2 - props.focusY * props.scale;

  return (
    <div className="editor-magnifier">
      <div
        className={`editor-magnifier-frame is-${props.shape}`}
        style={{ borderRadius: radius }}
      >
        <div
          className="editor-magnifier-view"
          style={{
            left: layerLeft,
            top: layerTop,
            width: canvas?.width,
            height: canvas?.height,
            transform: `scale(${props.scale})`,
          }}
        >
          <div
            className="editor-artboard-fill editor-magnifier-background"
            style={{
              ...canvasBackgroundStyle(canvas),
              opacity:
                Number(canvas?.backgroundOpacity ?? 100) / 100,
            }}
          />
          {sources.map((child) => (
            <div
              key={child.id}
              className={`editor-el is-magnifier-source ${child.type === "text" ? "is-text" : ""} ${isShapeElement(child) ? "is-shape" : ""} ${isLineKind(shapeKind(child)) ? "is-line" : ""} ${isMediaElement(child) ? "is-media" : ""} ${isCollageElement(child) ? "is-collage" : ""}`}
              style={magnifierChildStyle(child)}
              aria-hidden="true"
            >
              {renderMagnifierChild(child)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
