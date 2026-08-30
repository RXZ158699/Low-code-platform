import { LeftOutlined } from "@ant-design/icons";
import { DOODLE_SECTIONS } from "../doodlePens.js";

export default function EditorDoodlePicker({ onCancel, onSelect }) {
  return (
    <div className="editor-collage-view is-doodle-view">
      <header className="editor-collage-head">
        <button
          type="button"
          className="editor-collage-back"
          aria-label="返回"
          onClick={onCancel}
        >
          <LeftOutlined aria-hidden />
        </button>
        <h2>涂鸦笔</h2>
      </header>

      <div className="editor-add-panel-body">
        {DOODLE_SECTIONS.map((section) => (
          <section key={section.title} className="editor-collage-section">
            <h3>{section.title}</h3>
            <div className="editor-doodle-grid">
              {section.pens.map((pen) => (
                <button
                  type="button"
                  key={pen.id}
                  className="editor-doodle-pen"
                  aria-label={pen.label}
                  onClick={() => onSelect?.(`doodle:${pen.id}`)}
                >
                  <i
                    style={{
                      background: pen.stroke,
                      opacity: pen.opacity / 100,
                      height: Math.min(10, pen.strokeWidth + 3),
                      boxShadow:
                        pen.glow > 0
                          ? `0 0 ${pen.glow}px ${pen.stroke}`
                          : undefined,
                    }}
                  />
                  <span>{pen.label}</span>
                </button>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
