import { getTableProps, isTableElement } from "../canvas.js";

export default function CanvasTable({
  item,
  editingCell,
  onCellDoubleClick,
  onCellTextBlur,
}) {
  if (!isTableElement(item)) return null;
  const props = getTableProps(item);
  const pickable = typeof onCellDoubleClick === "function";

  return (
    <div
      className="editor-el-table"
      style={{
        gridTemplateColumns: `repeat(${props.cols}, 1fr)`,
        gridTemplateRows: `repeat(${props.rows}, 1fr)`,
        gap: props.gap > 0 ? props.gap : 1,
        padding: props.padding,
        background: props.borderColor,
        color: props.textColor,
        fontSize: props.fontSize,
      }}
    >
      {props.cells.map((text, index) =>
        pickable && editingCell === index ? (
          <textarea
            key={`${item.id}-${index}-edit`}
            className="editor-table-cell-input"
            aria-label={`编辑表格单元格${index + 1}`}
            defaultValue={text}
            autoFocus
            style={{
              background: props.fill,
              color: props.textColor,
              fontSize: props.fontSize,
            }}
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
            onDoubleClick={(event) => event.stopPropagation()}
            onBlur={(event) => onCellTextBlur?.(index, event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                event.currentTarget.blur();
              }
            }}
          />
        ) : (
          <div
            key={`${item.id}-${index}`}
            className={`editor-table-cell${pickable ? " is-pickable" : ""}`}
            role="cell"
            aria-label={pickable ? `表格单元格${index + 1}` : undefined}
            style={{
              background: props.fill,
              color: props.textColor,
              fontSize: props.fontSize,
            }}
            onDoubleClick={
              pickable
                ? (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onCellDoubleClick(index);
                  }
                : undefined
            }
          >
            {text || "\u00A0"}
          </div>
        ),
      )}
    </div>
  );
}
