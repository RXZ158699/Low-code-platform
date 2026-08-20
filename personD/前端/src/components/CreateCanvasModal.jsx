import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { App as AntdApp } from "antd";
import {
  CloseOutlined,
  FileAddOutlined,
  FolderAddOutlined,
  LinkOutlined,
  PictureOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import searchIcon from "../assets/icons/search.svg";
import { createWork } from "../api/works.js";
import { createEmptyCanvas, stringifyCanvas } from "../canvas.js";
import { CANVAS_PRESETS, filterCanvasPresets, presetLabel } from "../canvasPresets.js";

const NAV_TABS = [
  { id: "canvas", label: "新建画布", icon: FileAddOutlined },
  { id: "import", label: "导入图片", icon: PictureOutlined },
  { id: "local", label: "打开本地", icon: FolderAddOutlined, badge: "PSD" },
];

function parseSize(value) {
  const number = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isInteger(number) && number > 0 ? number : 0;
}

function PresetIcon({ type }) {
  if (type === "phone") {
    return (
      <span className="create-canvas-preset-icon is-phone" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="28" height="28">
          <rect x="8" y="2" width="16" height="28" rx="4" fill="#5B7CFF" />
          <rect x="10.5" y="5.5" width="11" height="18" rx="1.5" fill="#EEF2FF" />
          <circle cx="16" cy="26.4" r="1.3" fill="#C7D2FE" />
        </svg>
      </span>
    );
  }
  if (type === "landscape") {
    return (
      <span className="create-canvas-preset-icon is-landscape" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="28" height="28">
          <rect x="3" y="8" width="26" height="16" rx="3" fill="#60A5FA" />
          <rect x="6" y="11" width="10" height="10" rx="1.5" fill="#DBEAFE" />
          <rect x="18" y="12" width="8" height="2.5" rx="1" fill="#EFF6FF" />
          <rect x="18" y="17" width="6" height="2.5" rx="1" fill="#BFDBFE" />
        </svg>
      </span>
    );
  }
  if (type === "xhs") {
    return (
      <span className="create-canvas-preset-icon is-xhs" aria-hidden="true">
        书
      </span>
    );
  }
  if (type === "wechat" || type === "wechat-square") {
    return (
      <span className={`create-canvas-preset-icon is-wechat ${type === "wechat-square" ? "is-square" : ""}`} aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22">
          <path
            fill="#fff"
            d="M12.4 8.2c-4.4 0-8 3-8 6.7 0 2.1 1.2 4 3.1 5.3l-.8 3 3.3-1.8c.8.2 1.6.3 2.4.3.3 0 .6 0 .9-.1-.5-1-.7-2.1-.7-3.2 0-3.9 3.6-7.1 8.1-7.1.2 0 .4 0 .6 0-1.1-2-3.7-3.1-6.9-3.1Zm-2.3 5.1a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm5.4 0a1.2 1.2 0 1 1 0-2.4 1.2 1.2 0 0 1 0 2.4Zm12.2 2.2c0-3.3-3.3-6-7.3-6s-7.3 2.7-7.3 6 3.3 6 7.3 6c.7 0 1.4-.1 2.1-.3l2.9 1.6-.7-2.6c1.8-1.2 3-2.9 3-4.7Zm-9.7-.4a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Zm4.8 0a1.1 1.1 0 1 1 0-2.2 1.1 1.1 0 0 1 0 2.2Z"
          />
        </svg>
      </span>
    );
  }
  if (type === "video") {
    return (
      <span className="create-canvas-preset-icon is-video" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22">
          <rect x="4" y="8" width="16" height="16" rx="3" fill="#fff" />
          <path fill="#fff" d="M22 12.5 28 9v14l-6-3.5V12.5Z" />
        </svg>
      </span>
    );
  }
  if (type === "shop") {
    return (
      <span className="create-canvas-preset-icon is-shop" aria-hidden="true">
        <svg viewBox="0 0 32 32" width="22" height="22">
          <path
            fill="#fff"
            d="M7 11.5 9.2 7h13.6L25 11.5V13a3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1-3 3 3 3 0 0 1-3-3 3 3 0 0 1-3 3 3 3 0 0 1-3-3v-1.5ZM9 19h14v6H9v-6Z"
          />
        </svg>
      </span>
    );
  }
  return (
    <span className="create-canvas-preset-icon is-article" aria-hidden="true">
      <svg viewBox="0 0 32 32" width="22" height="22">
        <rect x="8" y="5" width="16" height="22" rx="2.5" fill="#fff" />
        <rect x="11" y="10" width="10" height="2" rx="1" fill="#FDBA74" />
        <rect x="11" y="15" width="10" height="2" rx="1" fill="#FED7AA" />
        <rect x="11" y="20" width="7" height="2" rx="1" fill="#FED7AA" />
      </svg>
    </span>
  );
}

export default function CreateCanvasModal({ open, onClose }) {
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const [tab, setTab] = useState("canvas");
  const [search, setSearch] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [unit, setUnit] = useState("px");
  const [ratioLocked, setRatioLocked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const ratioRef = useRef(1);

  const presets = useMemo(() => filterCanvasPresets(CANVAS_PRESETS, search), [search]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const createWithSize = async ({ nextWidth, nextHeight, title }) => {
    if (submitting) return;
    if (nextWidth < 1 || nextHeight < 1 || nextWidth > 30000 || nextHeight > 30000) {
      message.warning("请输入 1–30000 之间的宽和高");
      return;
    }
    setSubmitting(true);
    try {
      const work = await createWork({
        title,
        canvasJson: stringifyCanvas(createEmptyCanvas(nextWidth, nextHeight)),
      });
      message.success(`已创建「${work.title}」`);
      onClose();
      navigate(`/works/${work.id}`);
    } catch (err) {
      message.error(err.message || "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleWidthChange = (value) => {
    const digits = value.replace(/[^\d]/g, "");
    setWidth(digits);
    if (ratioLocked && parseSize(digits) && ratioRef.current) {
      setHeight(String(Math.max(1, Math.round(parseSize(digits) / ratioRef.current))));
    }
  };

  const handleHeightChange = (value) => {
    const digits = value.replace(/[^\d]/g, "");
    setHeight(digits);
    if (ratioLocked && parseSize(digits) && ratioRef.current) {
      setWidth(String(Math.max(1, Math.round(parseSize(digits) * ratioRef.current))));
    }
  };

  const toggleRatioLock = () => {
    const nextWidth = parseSize(width);
    const nextHeight = parseSize(height);
    if (!ratioLocked && nextWidth && nextHeight) {
      ratioRef.current = nextWidth / nextHeight;
    }
    setRatioLocked((value) => !value);
  };

  const dialog = (
    <div
      className="create-canvas-overlay"
      data-create-canvas-modal=""
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="create-canvas-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-canvas-title"
      >
        <aside className="create-canvas-side">
          <h2 id="create-canvas-title" className="create-canvas-side-title">
            创建设计
          </h2>
          <nav className="create-canvas-nav" aria-label="创建设计方式">
            {NAV_TABS.map((item) => {
              const Icon = item.icon;
              const selected = tab === item.id;
              return (
                <button
                  type="button"
                  key={item.id}
                  className={`create-canvas-nav-item ${selected ? "is-active" : ""}`}
                  aria-current={selected ? "page" : undefined}
                  onClick={() => setTab(item.id)}
                >
                  <Icon aria-hidden />
                  <span>{item.label}</span>
                  {item.badge ? <em className="create-canvas-badge">{item.badge}</em> : null}
                </button>
              );
            })}
          </nav>
        </aside>

        <div className="create-canvas-main">
          <button type="button" className="create-canvas-close" aria-label="关闭" onClick={onClose}>
            <CloseOutlined />
          </button>

          {tab !== "canvas" ? (
            <div className="create-canvas-placeholder">功能开发中</div>
          ) : (
            <div className="create-canvas-body">
              <label className="create-canvas-search">
                <img src={searchIcon} alt="" />
                <input
                  type="search"
                  value={search}
                  placeholder="搜索全部尺寸"
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

              <section className="create-canvas-section">
                <h3>自定义尺寸</h3>
                <div className="create-canvas-custom">
                  <label className="create-canvas-field">
                    <span>宽</span>
                    <input
                      aria-label="宽"
                      inputMode="numeric"
                      value={width}
                      placeholder="0"
                      onChange={(event) => handleWidthChange(event.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    className={`create-canvas-lock ${ratioLocked ? "is-locked" : ""}`}
                    aria-label="锁定比例"
                    aria-pressed={ratioLocked}
                    onClick={toggleRatioLock}
                  >
                    <LinkOutlined />
                  </button>
                  <label className="create-canvas-field">
                    <span>高</span>
                    <input
                      aria-label="高"
                      inputMode="numeric"
                      value={height}
                      placeholder="0"
                      onChange={(event) => handleHeightChange(event.target.value)}
                    />
                  </label>
                  <select
                    className="create-canvas-unit"
                    aria-label="单位"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                  >
                    <option value="px">px</option>
                  </select>
                  <button
                    type="button"
                    className="create-canvas-submit"
                    disabled={submitting}
                    onClick={() =>
                      createWithSize({
                        nextWidth: parseSize(width),
                        nextHeight: parseSize(height),
                        title: "未命名作品",
                      })
                    }
                  >
                    创建
                  </button>
                </div>
              </section>

              <section className="create-canvas-section">
                <div className="create-canvas-mine-head">
                  <h3>我的</h3>
                  <button type="button" aria-label="添加自定义尺寸" onClick={() => message.info("自定义尺寸收藏开发中")}>
                    <PlusOutlined />
                  </button>
                </div>
                <div className="create-canvas-empty">暂无内容</div>
              </section>

              <section className="create-canvas-section">
                <h3>推荐</h3>
                <div className="create-canvas-presets">
                  {presets.map((item) => (
                    <button
                      type="button"
                      key={item.id}
                      className="create-canvas-preset"
                      disabled={submitting}
                      onClick={() =>
                        createWithSize({
                          nextWidth: item.width,
                          nextHeight: item.height,
                          title: item.name,
                        })
                      }
                    >
                      <PresetIcon type={item.icon} />
                      <span className="create-canvas-preset-copy">
                        <strong>{presetLabel(item)}</strong>
                        <em>
                          {item.width} × {item.height} px
                        </em>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
