import { LeftOutlined } from "@ant-design/icons";
import { COLLAGE_SECTIONS } from "../collageLayouts.js";

export function CollageThumb({ layout }) {
  const count = layout.cells.length;
  const dense = count >= 16;
  const packed = count >= 9 && count < 16;
  const frame = layout.frame ? ` is-frame-${layout.frame}` : "";
  return (
    <span
      className={`editor-collage-thumb${dense ? " is-dense" : packed ? " is-packed" : ""}${frame}`}
      style={{
        gridTemplateColumns:
          layout.colTemplate || `repeat(${layout.colCount}, 1fr)`,
        gridTemplateRows:
          layout.rowTemplate || `repeat(${layout.rowCount}, 1fr)`,
      }}
    >
      {layout.cells.map((item, index) => (
        <span
          key={`${layout.id}-${index}`}
          style={{
            gridRow: `${item.r} / span ${item.rs}`,
            gridColumn: `${item.c} / span ${item.cs}`,
          }}
        />
      ))}
    </span>
  );
}

export default function EditorCollagePicker({ onCancel, onSelect }) {
  return (
    <div className="editor-collage-view">
      <header className="editor-collage-head">
        <button
          type="button"
          className="editor-collage-back"
          aria-label="返回"
          onClick={onCancel}
        >
          <LeftOutlined aria-hidden />
        </button>
        <h2>拼图</h2>
      </header>

      <div className="editor-add-panel-body">
        {COLLAGE_SECTIONS.map((section) => (
          <section key={section.title} className="editor-collage-section">
            <h3>{section.title}</h3>
            <div className="editor-collage-grid">
              {section.layouts.map((layout, index) => (
                <button
                  type="button"
                  key={layout.id}
                  className="editor-collage-item"
                  aria-label={`${section.title}布局${index + 1}`}
                  onClick={() => onSelect?.(`collage:${layout.id}`)}
                >
                  <CollageThumb layout={layout} />
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
