import { useState } from "react";
import { Dropdown, Slider } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
} from "@ant-design/icons";
import {
  applyTableLayout,
  getTableProps,
  setTableCellText,
} from "../canvas.js";
import { findTableLayout, TABLE_LAYOUTS } from "../tableLayouts.js";
import { TableThumb } from "./EditorTablePicker.jsx";

const LAYER_ITEMS = [
  { key: "up", label: "上移一层" },
  { key: "down", label: "下移一层" },
  { key: "top", label: "置于顶层" },
  { key: "bottom", label: "置于底层" },
];

const LAYOUT_ITEMS = TABLE_LAYOUTS.map((layout) => ({
  key: layout.id,
  label: (
    <span className="editor-table-layout-option">
      <TableThumb layout={layout} />
      <span>{layout.name}</span>
    </span>
  ),
}));

export default function EditorTablePanel({
  item,
  onChange,
  onDelete,
  onDuplicate,
  onLayer,
}) {
  const props = getTableProps(item);
  const layout = findTableLayout(item.layoutId) || TABLE_LAYOUTS[0];
  const [cellIndex, setCellIndex] = useState(0);
  const activeIndex = Math.min(cellIndex, props.cells.length - 1);
  const cellText = props.cells[activeIndex] || "";

  return (
    <div className="editor-table-panel">
      <div className="editor-text-actions editor-line-actions">
        <Dropdown
          menu={{ items: LAYER_ITEMS, onClick: ({ key }) => onLayer(key) }}
          trigger={["click"]}
        >
          <button type="button" aria-label="图层顺序">
            <span className="editor-text-layer-icon" aria-hidden>
              <i />
              <i />
              <i />
            </span>
          </button>
        </Dropdown>
        <button type="button" aria-label="复制表格" onClick={onDuplicate}>
          <CopyOutlined aria-hidden />
        </button>
        <button type="button" aria-label="删除表格" onClick={onDelete}>
          <DeleteOutlined aria-hidden />
        </button>
      </div>

      <Dropdown
        menu={{
          items: LAYOUT_ITEMS,
          selectedKeys: [layout.id],
          onClick: ({ key }) => onChange(applyTableLayout(item, key)),
        }}
        trigger={["click"]}
      >
        <button
          type="button"
          className="editor-table-layout"
          aria-label="表格布局"
        >
          <span className="editor-table-layout-icon" aria-hidden>
            <TableThumb layout={layout} />
          </span>
          <span>{layout.name}</span>
          <DownOutlined aria-hidden />
        </button>
      </Dropdown>

      <div className="editor-table-cell-editor">
        <div className="editor-table-cell-head">
          <span>单元格</span>
          <strong>
            第 {activeIndex + 1} 个
          </strong>
        </div>
        <div
          className="editor-table-cell-grid"
          style={{
            gridTemplateColumns: `repeat(${props.cols}, 1fr)`,
            gridTemplateRows: `repeat(${props.rows}, 1fr)`,
          }}
        >
          {props.cells.map((_text, index) => (
            <button
              type="button"
              key={`${item.id}-panel-${index}`}
              className={index === activeIndex ? "is-on" : undefined}
              aria-label={`表格单元格${index + 1}`}
              onClick={() => setCellIndex(index)}
            />
          ))}
        </div>
        <textarea
          className="editor-table-cell-content"
          aria-label="单元格内容"
          value={cellText}
          onChange={(event) =>
            onChange(setTableCellText(item, activeIndex, event.target.value))
          }
        />
      </div>

      <div className="editor-table-font">
        <div className="editor-table-font-head">
          <span>字号</span>
          <strong>{props.fontSize}</strong>
        </div>
        <Slider
          min={10}
          max={48}
          step={1}
          value={props.fontSize}
          ariaLabelForHandle="表格字号"
          onChange={(fontSize) => onChange({ fontSize })}
        />
      </div>
    </div>
  );
}
