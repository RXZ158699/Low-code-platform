import { useState } from "react";
import { Dropdown, Slider, App as AntdApp } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LinkOutlined,
  LockOutlined,
  MinusOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import EditorColorPicker from "./EditorColorPicker.jsx";
import { flipLine, getLineProps, setLineLength, setLineOrigin, setLineStrokeWidth } from "../canvas.js";

const LAYER_ITEMS = [
  { key: "up", label: "上移一层" },
  { key: "down", label: "下移一层" },
  { key: "top", label: "置于顶层" },
  { key: "bottom", label: "置于底层" },
];

const FLIP_ITEMS = [
  { key: "x", label: "水平翻转" },
  { key: "y", label: "垂直翻转" },
];

const LINE_STYLES = [
  { key: "line", label: "直线" },
  { key: "dash", label: "虚线" },
  { key: "dot", label: "点线" },
];

function readNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function NumberChip({ label, value, min, max, onChange, disabled }) {
  return (
    <label className={`editor-text-chip editor-line-chip ${disabled ? "is-disabled" : ""}`}>
      <input
        aria-label={label}
        type="number"
        inputMode="numeric"
        autoComplete="off"
        min={min}
        max={max}
        step={1}
        disabled={disabled}
        value={value}
        onChange={(event) => onChange(readNumber(event.target.value, value, min, max))}
      />
      <span className="editor-text-chip-name">{label}</span>
    </label>
  );
}

function FormatPainterIcon() {
  return (
    <svg className="editor-line-painter" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2.2 3.2h8.4c.6 0 1 .4 1 1v2.2h1.7c.6 0 1.1.5 1.1 1.1v4.2c0 .9-.7 1.6-1.6 1.6h-.6c-.9 0-1.6-.7-1.6-1.6V9.4H3.8c-.9 0-1.6-.7-1.6-1.6V4.2c0-.6.4-1 1-1Zm8.4 1.2H3.4v2.2h7.2V4.4Z"
      />
    </svg>
  );
}

export default function EditorLinePanel({ item, onChange, onDelete, onDuplicate, onLayer }) {
  const { message } = AntdApp.useApp();
  const line = getLineProps(item);
  const [tab, setTab] = useState("shape");
  const soon = () => message.info("功能开发中");

  return (
    <div className="editor-line-panel">
      <div className="editor-text-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "shape"}
          className={tab === "shape" ? "is-active" : undefined}
          onClick={() => setTab("shape")}
        >
          图形
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "anim"}
          className={tab === "anim" ? "is-active" : undefined}
          onClick={() => setTab("anim")}
        >
          动画
        </button>
      </div>

      {tab === "anim" ? (
        <div className="editor-text-empty">动画功能开发中</div>
      ) : (
        <>
          <div className="editor-text-actions editor-line-actions">
            <Dropdown menu={{ items: LAYER_ITEMS, onClick: ({ key }) => onLayer(key) }} trigger={["click"]}>
              <button type="button" aria-label="图层顺序">
                <span className="editor-text-layer-icon" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </button>
            </Dropdown>
            <Dropdown
              menu={{
                items: FLIP_ITEMS,
                onClick: ({ key }) => onChange(flipLine(item, key)),
              }}
              trigger={["click"]}
            >
              <button type="button" aria-label="翻转">
                <span className="editor-text-flip-icon" aria-hidden>
                  ⇄
                </span>
              </button>
            </Dropdown>
            <button
              type="button"
              aria-label="锁定"
              aria-pressed={line.locked}
              className={line.locked ? "is-on" : undefined}
              onClick={() => onChange({ locked: !line.locked })}
            >
              {line.locked ? <LockOutlined aria-hidden /> : <UnlockOutlined aria-hidden />}
            </button>
            <button type="button" aria-label="格式刷" onClick={soon}>
              <FormatPainterIcon />
            </button>
            <button type="button" aria-label="复制图层" onClick={onDuplicate}>
              <CopyOutlined aria-hidden />
            </button>
            <button type="button" aria-label="删除图层" onClick={onDelete}>
              <DeleteOutlined aria-hidden />
            </button>
          </div>

          <button type="button" className="editor-line-adjust" onClick={soon}>
            调整形状
          </button>

          <section className="editor-line-section">
            <div className="editor-line-section-head">
              <h3>描边</h3>
              <div className="editor-line-section-ops">
                <button
                  type="button"
                  aria-label={line.strokeVisible ? "隐藏描边" : "显示描边"}
                  aria-pressed={!line.strokeVisible}
                  className={line.strokeVisible ? undefined : "is-on"}
                  onClick={() => onChange({ strokeVisible: !line.strokeVisible })}
                >
                  {line.strokeVisible ? <EyeOutlined aria-hidden /> : <EyeInvisibleOutlined aria-hidden />}
                </button>
                <button type="button" aria-label="删除描边" onClick={() => onChange({ strokeVisible: false })}>
                  <MinusOutlined aria-hidden />
                </button>
              </div>
            </div>

            <div className="editor-line-section-body">
                <div className="editor-line-field">
                  <span>颜色</span>
                  <EditorColorPicker label="描边颜色" value={line.fill} fallback="#000000" onChange={(fill) => onChange({ fill })} />
                </div>
              <div className="editor-opacity editor-line-stroke-width">
                <span>粗细</span>
                <Slider
                  min={1}
                  max={40}
                  value={line.strokeWidth}
                  ariaLabelForHandle="粗细"
                  onChange={(strokeWidth) => onChange(setLineStrokeWidth(item, strokeWidth))}
                />
                <em className="editor-line-value">{line.strokeWidth}</em>
              </div>
              <div className="editor-line-style" role="group" aria-label="线型">
                <span>线型</span>
                <div className="editor-line-style-group">
                  {LINE_STYLES.map((style) => (
                    <button
                      key={style.key}
                      type="button"
                      aria-label={style.label}
                      aria-pressed={line.kind === style.key}
                      className={line.kind === style.key ? "is-on" : undefined}
                      onClick={() => onChange({ kind: style.key })}
                    >
                      <i className={`editor-line-style-mark is-${style.key}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="editor-opacity editor-line-opacity">
            <span>不透明度</span>
            <Slider
              min={0}
              max={100}
              value={line.opacity}
              ariaLabelForHandle="不透明度"
              onChange={(opacity) => onChange({ opacity })}
            />
            <em className="editor-line-value">{line.opacity}</em>
          </div>

          <section className="editor-text-geo">
            <h3>尺寸</h3>
            <div className="editor-text-box">
              <NumberChip
                label="宽"
                value={Math.round(line.length)}
                min={8}
                max={8000}
                onChange={(width) => onChange(setLineLength(item, width))}
              />
              <button type="button" className="editor-text-lock" aria-label="锁定宽高比" disabled>
                <LinkOutlined aria-hidden />
              </button>
              <NumberChip label="高" value={Math.round(line.strokeWidth)} min={1} max={40} disabled onChange={() => {}} />
            </div>
          </section>

          <section className="editor-text-geo">
            <h3>位置</h3>
            <div className="editor-text-box is-xy">
              <NumberChip
                label="X"
                value={Math.round(line.originX)}
                min={-4000}
                max={8000}
                onChange={(x) => onChange(setLineOrigin(item, x, line.originY))}
              />
              <NumberChip
                label="Y"
                value={Math.round(line.originY)}
                min={-4000}
                max={8000}
                onChange={(y) => onChange(setLineOrigin(item, line.originX, y))}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
