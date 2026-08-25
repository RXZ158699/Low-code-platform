import {
  COLLAGE_PLACEHOLDER,
  collageGap,
  collagePadding,
} from "../collageLayouts.js";
import { collageCellOffset, getCollageProps } from "../canvas.js";

export default function CanvasCollage({
  item,
  onCellDoubleClick,
  onCellPanStart,
}) {
  if (item?.type !== "collage") return null;
  const props = getCollageProps(item);
  const pickable = typeof onCellDoubleClick === "function";
  return (
    <div
      className="editor-el-collage"
      style={{
        gridTemplateColumns:
          item.colTemplate || `repeat(${item.colCount}, 1fr)`,
        gridTemplateRows: item.rowTemplate || `repeat(${item.rowCount}, 1fr)`,
        gap: collageGap(item),
        padding: collagePadding(item),
        background: props.fill,
        opacity: props.opacity / 100,
        borderRadius: props.radius,
        transform: `scale(${props.flippedX ? -1 : 1}, ${props.flippedY ? -1 : 1})`,
      }}
    >
      {(item.cells || []).map((cell, index) => {
        const Cell = pickable ? "button" : "span";
        const offset = collageCellOffset(cell);
        const hasImage = Boolean(cell.src);
        return (
          <Cell
            key={`${item.id}-${index}`}
            type={pickable ? "button" : undefined}
            className={`editor-el-collage-cell${pickable ? " is-pickable" : ""}${hasImage ? " has-image" : ""}`}
            role={pickable ? undefined : "img"}
            aria-label={
              pickable
                ? `拼图格子${index + 1}`
                : cell.src
                  ? "拼图图片"
                  : "灰色占位图"
            }
            style={{
              gridRow: `${cell.r} / span ${cell.rs}`,
              gridColumn: `${cell.c} / span ${cell.cs}`,
              background: cell.src ? undefined : COLLAGE_PLACEHOLDER,
              backgroundImage: cell.src ? `url(${cell.src})` : undefined,
              backgroundPosition: cell.src
                ? `${offset.ox}% ${offset.oy}%`
                : undefined,
              borderRadius: props.radius,
            }}
            onPointerDown={
              pickable && hasImage && onCellPanStart
                ? (event) => {
                    if (event.button !== 0) return;
                    event.stopPropagation();
                    onCellPanStart(index, event);
                  }
                : undefined
            }
            onDoubleClick={
              pickable
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onCellDoubleClick(index);
                  }
                : undefined
            }
          />
        );
      })}
    </div>
  );
}
