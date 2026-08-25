/*
 * 文字预设面板：点击左侧「文字」工具后从右侧滑出，选择预设后插入文字。
 */
import { LeftOutlined } from "@ant-design/icons";
import { TEXT_PRESETS } from "./EditorAddPanel.jsx";

export default function EditorTextPickerPanel({ open, onClose, onPick }) {
  return (
    <div
      className={`editor-add-panel ${open ? "is-open" : ""}`}
      role="dialog"
      aria-label="文字"
      aria-hidden={!open}
    >
      <div className="editor-add-panel-body">
        <section className="editor-add-section">
          <div className="editor-add-section-head">
            <h3>文字</h3>
            <button
              type="button"
              className="editor-add-more"
              onClick={() => onPick?.("text-more")}
            >
              查看更多
            </button>
          </div>
          <div className="editor-add-text-row">
            {TEXT_PRESETS.map((item) => (
              <button
                type="button"
                key={item.id}
                className={`editor-add-text-item is-${item.id}`}
                onClick={() => onPick?.(`text-${item.id}`)}
              >
                <strong>{item.sample}</strong>
                <span>{item.caption}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
      <button
        type="button"
        className="editor-add-collapse"
        aria-label="收起文字面板"
        onClick={onClose}
      >
        <LeftOutlined aria-hidden />
      </button>
    </div>
  );
}
