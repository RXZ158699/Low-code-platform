import {
  COLLAGE_PLACEHOLDER,
  collageGap,
  collagePadding,
} from "../collageLayouts.js";
import { getCollageProps } from "../canvas.js";

export default function CanvasCollage({ item }) {
  if (item?.type !== "collage") return null;
  const props = getCollageProps(item);
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
      {(item.cells || []).map((cell, index) => (
        <span
          key={`${item.id}-${index}`}
          className="editor-el-collage-cell"
          role="img"
          aria-label={cell.src ? "拼图图片" : "灰色占位图"}
          style={{
            gridRow: `${cell.r} / span ${cell.rs}`,
            gridColumn: `${cell.c} / span ${cell.cs}`,
            background: cell.src ? undefined : COLLAGE_PLACEHOLDER,
            backgroundImage: cell.src ? `url(${cell.src})` : undefined,
            borderRadius: props.radius,
          }}
        />
      ))}
    </div>
  );
}
