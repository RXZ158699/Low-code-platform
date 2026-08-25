import { useRef, useState } from "react";
import { LeftOutlined } from "@ant-design/icons";
import { MEDIA_ACCEPT } from "../mediaFile.js";
import EditorCollagePicker from "./EditorCollagePicker.jsx";

const MEDIA_ITEMS = [
  { id: "local-upload", label: "本地上传", icon: "upload-photo" },
  { id: "phone-upload", label: "手机上传", icon: "upload-phone" },
  { id: "ai-asset", label: "AI 素材", icon: "ai-shapes" },
  { id: "ai-draw", label: "AI 绘图", icon: "ai-frame" },
];

export const TEXT_PRESETS = [
  { id: "h1", caption: "标题", sample: "H1" },
  { id: "h2", caption: "副标题", sample: "H2" },
  { id: "body", caption: "正文", sample: "Aa" },
  { id: "warp", caption: "变形文字", sample: "abc" },
  { id: "three-d", caption: "3D文字", sample: "a" },
];

const SHAPE_ITEMS = [
  { id: "square", label: "方形" },
  { id: "triangle", label: "三角形" },
  { id: "circle", label: "圆形" },
  { id: "pentagon", label: "五边形" },
  { id: "line", label: "直线" },
  { id: "dash", label: "虚线" },
  { id: "dot", label: "点线" },
  { id: "more-shape", label: "更多" },
];

const COMPONENT_ITEMS = [
  { id: "collage", label: "拼图", badge: true },
  { id: "magnifier", label: "放大镜", badge: true },
  { id: "table", label: "表格" },
  { id: "qrcode", label: "二维码" },
  { id: "chart", label: "图表" },
  { id: "legend", label: "图例" },
];

function MediaIcon({ type }) {
  if (type === "upload-photo") {
    return (
      <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true">
        <rect
          x="8"
          y="14"
          width="32"
          height="24"
          rx="4"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
        />
        <path
          d="M8 32l8-8 6 6 8-10 10 12"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
        />
        <circle cx="17" cy="21" r="2.2" fill="#6b7280" />
        <path
          d="M24 8v10M20 12h8"
          stroke="#3b82f6"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (type === "upload-phone") {
    return (
      <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true">
        <rect
          x="16"
          y="8"
          width="16"
          height="28"
          rx="3"
          fill="none"
          stroke="#6b7280"
          strokeWidth="2"
        />
        <path
          d="M24 4v8M20 8h8"
          stroke="#3b82f6"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
        <circle cx="24" cy="32" r="1.4" fill="#9ca3af" />
      </svg>
    );
  }
  if (type === "ai-shapes") {
    return (
      <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true">
        <rect x="8" y="22" width="12" height="12" rx="2" fill="#60a5fa" />
        <polygon points="28,12 36,26 20,26" fill="#818cf8" />
        <circle cx="34" cy="34" r="6" fill="#fbbf24" />
        <path d="M14 10l1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3z" fill="#f59e0b" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 48 48" width="36" height="36" aria-hidden="true">
      <rect
        x="10"
        y="14"
        width="28"
        height="22"
        rx="3"
        fill="none"
        stroke="#6b7280"
        strokeWidth="2"
      />
      <path
        d="M10 30l8-7 6 5 7-8 7 10"
        fill="none"
        stroke="#6b7280"
        strokeWidth="2"
      />
      <path
        d="M34 8l1.2 2.8L38 12l-2.8 1.2L34 16l-1.2-2.8L30 12l2.8-1.2L34 8z"
        fill="#f59e0b"
      />
    </svg>
  );
}

function ShapeIcon({ id }) {
  if (id === "square")
    return <span className="editor-add-shape-mark is-square" />;
  if (id === "triangle")
    return <span className="editor-add-shape-mark is-triangle" />;
  if (id === "circle")
    return <span className="editor-add-shape-mark is-circle" />;
  if (id === "pentagon") {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <polygon
          points="12,3 21,10 17.5,21 6.5,21 3,10"
          fill="none"
          stroke="#4b5563"
          strokeWidth="1.8"
        />
      </svg>
    );
  }
  if (id === "line") return <span className="editor-add-shape-mark is-line" />;
  if (id === "dash") return <span className="editor-add-shape-mark is-dash" />;
  if (id === "dot") return <span className="editor-add-shape-mark is-dot" />;
  return <span className="editor-add-shape-more">+</span>;
}

function ComponentIcon({ id }) {
  if (id === "collage") {
    return (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect x="4" y="5" width="10" height="22" rx="2" fill="#60a5fa" />
        <rect x="16" y="5" width="12" height="10" rx="2" fill="#818cf8" />
        <rect x="16" y="17" width="12" height="10" rx="2" fill="#34d399" />
      </svg>
    );
  }
  if (id === "magnifier") {
    return (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <circle
          cx="14"
          cy="14"
          r="7"
          fill="none"
          stroke="#3b82f6"
          strokeWidth="2.4"
        />
        <path
          d="M19 19l7 7"
          stroke="#3b82f6"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (id === "table") {
    return (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect
          x="5"
          y="7"
          width="22"
          height="18"
          rx="2"
          fill="none"
          stroke="#64748b"
          strokeWidth="2"
        />
        <path d="M5 13h22M13 7v18" stroke="#64748b" strokeWidth="2" />
      </svg>
    );
  }
  if (id === "qrcode") {
    return (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <rect x="6" y="6" width="8" height="8" rx="1" fill="#111827" />
        <rect x="18" y="6" width="8" height="8" rx="1" fill="#111827" />
        <rect x="6" y="18" width="8" height="8" rx="1" fill="#111827" />
        <rect x="18" y="18" width="3" height="3" fill="#111827" />
        <rect x="23" y="18" width="3" height="3" fill="#111827" />
        <rect x="18" y="23" width="8" height="3" fill="#111827" />
      </svg>
    );
  }
  if (id === "chart") {
    return (
      <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
        <circle
          cx="16"
          cy="16"
          r="9"
          fill="none"
          stroke="#fb923c"
          strokeWidth="6"
          strokeDasharray="16 40"
        />
        <circle
          cx="16"
          cy="16"
          r="9"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="6"
          strokeDasharray="12 44"
          strokeDashoffset="-16"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true">
      <rect x="7" y="20" width="4" height="6" fill="#34d399" />
      <rect x="14" y="14" width="4" height="12" fill="#60a5fa" />
      <rect x="21" y="10" width="4" height="16" fill="#818cf8" />
    </svg>
  );
}

export default function EditorAddPanel({
  open,
  onClose,
  onSelect,
  onLocalFiles,
  activeShape,
}) {
  const fileInputRef = useRef(null);
  const [view, setView] = useState("home");
  if (!open && view !== "home") setView("home");

  const handleLocalClick = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length > 0) onLocalFiles?.(files);
  };

  return (
    <div
      className={`editor-add-panel ${open ? "is-open" : ""} ${view === "collage" ? "is-collage" : ""}`}
      role="dialog"
      aria-label="添加"
      aria-hidden={!open}
    >
      <input
        ref={fileInputRef}
        className="editor-add-file-input"
        type="file"
        accept={MEDIA_ACCEPT}
        multiple
        aria-label="选择本地图片或视频"
        onChange={handleFiles}
      />
      {view === "collage" ? (
        <EditorCollagePicker
          onCancel={() => setView("home")}
          onSelect={onSelect}
        />
      ) : (
        <div className="editor-add-panel-body">
          <section className="editor-add-section">
            <h3>图片/视频</h3>
            <div className="editor-add-media-grid">
              {MEDIA_ITEMS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="editor-add-card"
                  onClick={() => {
                    if (item.id === "local-upload") {
                      handleLocalClick();
                      return;
                    }
                    onSelect(item.id);
                  }}
                >
                  <MediaIcon type={item.icon} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="editor-add-section">
            <div className="editor-add-section-head">
              <h3>文字</h3>
              <button
                type="button"
                className="editor-add-more"
                onClick={() => onSelect("text-more")}
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
                  aria-label={`${item.sample} ${item.caption}`}
                  onClick={() => onSelect(`text-${item.id}`)}
                >
                  <strong>{item.sample}</strong>
                  <span>
                    {item.id === "h1" || item.id === "h2" || item.id === "body"
                      ? `${item.sample} ${item.caption}`
                      : item.caption}
                  </span>
                </button>
              ))}
            </div>
          </section>

          <section className="editor-add-section">
            <h3>绘制</h3>
            <div className="editor-add-draw">
              <div className="editor-add-shapes">
                {SHAPE_ITEMS.map((item) => (
                  <button
                    type="button"
                    key={item.id}
                    className={`editor-add-shape ${activeShape === item.id ? "is-active" : ""}`}
                    aria-label={item.label}
                    aria-pressed={activeShape === item.id}
                    onClick={() => onSelect(`shape-${item.id}`)}
                  >
                    <ShapeIcon id={item.id} />
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="editor-add-doodle"
                aria-label="涂鸦笔"
                onClick={() => onSelect("doodle")}
              >
                <em className="editor-add-new">New</em>
                <svg
                  viewBox="0 0 48 48"
                  width="34"
                  height="34"
                  aria-hidden="true"
                >
                  <path
                    d="M14 34c8-2 12-10 18-18 2-2.5 6-3 8-1s1.2 6-1.2 8C32 30 24 34 16 36"
                    fill="none"
                    stroke="#111827"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M30 14l6 6"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>涂鸦笔</span>
              </button>
            </div>
          </section>

          <section className="editor-add-section">
            <h3>组件</h3>
            <div className="editor-add-component-grid">
              {COMPONENT_ITEMS.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className="editor-add-card is-component"
                  aria-label={item.label}
                  onClick={() => {
                    if (item.id === "collage") {
                      setView("collage");
                      return;
                    }
                    onSelect(item.id);
                  }}
                >
                  {item.badge ? <em className="editor-add-new">New</em> : null}
                  <ComponentIcon id={item.id} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      <button
        type="button"
        className="editor-add-collapse"
        aria-label="收起添加面板"
        onClick={onClose}
      >
        <LeftOutlined aria-hidden />
      </button>
    </div>
  );
}
