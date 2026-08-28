import { LeftOutlined } from "@ant-design/icons";
import { TABLE_SECTIONS } from "../tableLayouts.js";

export function TableThumb({ layout }) {
  return (
    <span
      className="editor-table-thumb"
      style={{
        gridTemplateColumns: `repeat(${layout.cols}, 1fr)`,
        gridTemplateRows: `repeat(${layout.rows}, 1fr)`,
      }}
    >
      {Array.from({ length: layout.rows * layout.cols }, (_, index) => (
        <span key={`${layout.id}-${index}`} />
      ))}
    </span>
  );
}

export default function EditorTablePicker({ onCancel, onSelect }) {
  return (
    <div className="editor-collage-view is-table-view">
      <header className="editor-collage-head">
        <button
          type="button"
          className="editor-collage-back"
          aria-label="返回"
          onClick={onCancel}
        >
          <LeftOutlined aria-hidden />
        </button>
        <h2>表格</h2>
      </header>

      <div className="editor-add-panel-body">
        {TABLE_SECTIONS.map((section) => (
          <section key={section.title} className="editor-collage-section">
            <h3>{section.title}</h3>
            <div className="editor-collage-grid">
              {section.layouts.map((layout) => (
                <button
                  type="button"
                  key={layout.id}
                  className="editor-collage-item editor-table-item"
                  aria-label={layout.name}
                  onClick={() => onSelect?.(`table:${layout.id}`)}
                >
                  <TableThumb layout={layout} />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
