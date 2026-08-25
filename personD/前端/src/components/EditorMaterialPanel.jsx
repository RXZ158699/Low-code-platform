import { LeftOutlined } from "@ant-design/icons";
import { MATERIAL_CATEGORIES } from "../data/materialCatalog.js";

export default function EditorMaterialPanel({ open, onClose, onPick }) {
  return (
    <div
      className={`editor-add-panel editor-material-panel ${open ? "is-open" : ""}`}
      role="dialog"
      aria-label="素材"
      aria-hidden={!open}
    >
      <div className="editor-add-panel-body">
        {MATERIAL_CATEGORIES.map((category) => (
          <section className="editor-add-section" key={category.id}>
            <div className="editor-add-section-head">
              <h3>{category.title}</h3>
              <span>{category.items.length} 款</span>
            </div>
            <div className="editor-add-media-grid">
              {category.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="editor-add-card"
                  aria-label={item.name}
                  onClick={() => onPick?.({ item })}
                >
                  <img src={item.src} alt="" draggable={false} />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
      <button
        type="button"
        className="editor-add-collapse"
        aria-label="收起素材面板"
        onClick={onClose}
      >
        <LeftOutlined aria-hidden />
      </button>
    </div>
  );
}
