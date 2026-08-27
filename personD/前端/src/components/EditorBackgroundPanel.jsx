import { useEffect, useState } from "react";
import { DeleteOutlined, LeftOutlined, UploadOutlined } from "@ant-design/icons";
import { Slider, App as AntdApp } from "antd";
import { listBackgroundCategories } from "../api/backgrounds.js";
import { BACKGROUND_CATALOG } from "../data/backgroundCatalog.js";
import EditorColorPicker from "./EditorColorPicker.jsx";

function normalizeCatalog(payload) {
  const categories = Array.isArray(payload) ? payload : payload?.categories;
  return Array.isArray(categories) && categories.length
    ? categories
    : BACKGROUND_CATALOG;
}

export default function EditorBackgroundPanel({ open, onClose, canvas, onChange }) {
  const { message } = AntdApp.useApp();
  const [catalog, setCatalog] = useState(BACKGROUND_CATALOG);
  const [activeCategory, setActiveCategory] = useState(BACKGROUND_CATALOG[0]?.id || "");

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    listBackgroundCategories()
      .then((payload) => {
        if (cancelled) return;
        const next = normalizeCatalog(payload);
        setCatalog(next);
        setActiveCategory((current) =>
          next.some((category) => category.id === current)
            ? current
            : next[0]?.id || "",
        );
      })
      .catch(() => {
        if (!cancelled) setCatalog(BACKGROUND_CATALOG);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const active = catalog.find((category) => category.id === activeCategory) || catalog[0];

  return (
    <div
      className={`editor-add-panel editor-background-panel ${open ? "is-open" : ""}`}
      role="dialog"
      aria-label="背景"
      aria-hidden={!open}
    >
      {open ? (
        <>
      <div className="editor-add-panel-body">
        <section className="editor-add-section">
          <h3>背景色</h3>
          <div className="editor-bg-color-row">
            <span>当前背景</span>
            <EditorColorPicker
              label="背景色"
              value={canvas.background}
              fallback="#ffffff"
              onChange={(background) => onChange({ background })}
            />
          </div>
        </section>

        <section className="editor-add-section">
          <h3>不透明度</h3>
          <div className="editor-opacity">
            <span>不透明度</span>
            <Slider
              min={0}
              max={100}
              value={canvas.backgroundOpacity}
              ariaLabelForHandle="背景不透明度"
              onChange={(value) => onChange({ backgroundOpacity: value })}
            />
            <em>{canvas.backgroundOpacity}</em>
          </div>
        </section>

        <section className="editor-add-section">
          <h3>背景图</h3>
          <div className="editor-bg-tabs" role="tablist" aria-label="背景图分类">
            {catalog.map((category) => (
              <button
                type="button"
                key={category.id}
                role="tab"
                aria-selected={active?.id === category.id}
                className={active?.id === category.id ? "is-active" : undefined}
                onClick={() => setActiveCategory(category.id)}
              >
                {category.title}
              </button>
            ))}
          </div>
          <div className="editor-bg-grid">
            {(active?.items || []).map((item) => (
              <button
                type="button"
                key={item.id}
                className={`editor-bg-card ${
                  canvas.backgroundImage === item.src ? "is-active" : ""
                }`}
                aria-label={`背景图 ${item.name}`}
                onClick={() =>
                  onChange({ backgroundImage: item.src, backgroundImageFit: "cover" })
                }
              >
                <img src={item.src} alt="" draggable={false} />
                <span>{item.name}</span>
              </button>
            ))}
          </div>
          {canvas.backgroundImage ? (
            <button
              type="button"
              className="editor-bg-clear"
              onClick={() =>
                onChange({ backgroundImage: "", backgroundImageFit: "cover" })
              }
            >
              <DeleteOutlined aria-hidden />
              清除背景图
            </button>
          ) : null}
          <div className="editor-prop-row">
            <button
              type="button"
              className="editor-prop-btn"
              onClick={() => message.info("功能开发中")}
            >
              <UploadOutlined aria-hidden />
              上传图片
            </button>
            <button
              type="button"
              className="editor-prop-btn"
              onClick={() => message.info("功能开发中")}
            >
              背景
            </button>
          </div>
        </section>
      </div>
      <button
        type="button"
        className="editor-add-collapse"
        aria-label="收起背景面板"
        onClick={onClose}
      >
        <LeftOutlined aria-hidden />
      </button>
        </>
      ) : null}
    </div>
  );
}
