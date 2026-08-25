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
import {
  FILL_SHAPE_KINDS,
  MIN_ELEMENT_SIZE,
  SHAPE_LABELS,
  flipShape,
  getShapeProps,
} from "../canvas.js";

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

const SHAPE_KIND_ITEMS = FILL_SHAPE_KINDS.map((key) => ({
  key,
  label: SHAPE_LABELS[key],
}));

const STROKE_ALIGNS = [
  { key: "inner", label: "内侧" },
  { key: "center", label: "居中" },
  { key: "outer", label: "外侧" },
];

const STROKE_STYLES = [
  { key: "solid", label: "直线" },
  { key: "dash", label: "虚线" },
  { key: "dot", label: "点线" },
];

function readNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function NumberChip({ label, value, min, max, onChange }) {
  return (
    <label className="editor-text-chip editor-line-chip">
      <input
        aria-label={label}
        type="number"
        inputMode="numeric"
        autoComplete="off"
        min={min}
        max={max}
        step={1}
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

function FlipIcon() {
  return (
    <svg className="editor-shape-flip" viewBox="0 0 16 16" aria-hidden="true">
      <path fill="currentColor" d="M7.2 2.4 2.4 13.2h4.8V2.4Zm1.6 0v10.8h4.8L8.8 2.4Z" opacity="0.92" />
      <path fill="currentColor" d="M7.7 1.6h.6v12.8h-.6z" />
    </svg>
  );
}

function AlignIcon({ kind }) {
  if (kind === "inner") {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <rect x="2.5" y="2.5" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="5" y="5" width="6" height="6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (kind === "outer") {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <rect x="4.2" y="4.2" width="7.6" height="7.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2.2" y="2.2" width="11.6" height="11.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
      <rect x="3.2" y="3.2" width="9.6" height="9.6" fill="none" stroke="currentColor" strokeWidth="2.4" />
    </svg>
  );
}

function SectionOps({ name, visible, onToggle, onRemove }) {
  return (
    <div className="editor-line-section-ops">
      <button
        type="button"
        aria-label={visible ? `隐藏${name}` : `显示${name}`}
        aria-pressed={!visible}
        className={visible ? undefined : "is-on"}
        onClick={onToggle}
      >
        {visible ? <EyeOutlined aria-hidden /> : <EyeInvisibleOutlined aria-hidden />}
      </button>
      <button type="button" aria-label={`删除${name}`} onClick={onRemove}>
        <MinusOutlined aria-hidden />
      </button>
    </div>
  );
}

export default function EditorShapePanel({ item, onChange, onDelete, onDuplicate, onLayer }) {
  const { message } = AntdApp.useApp();
  const shape = getShapeProps(item);
  const [tab, setTab] = useState("shape");
  const soon = () => message.info("功能开发中");
  const radiusMax = Math.max(0, Math.round(Math.min(shape.width, shape.height) / 2));

  const patchSize = (key, next) => {
    if (!shape.aspectLocked || !(shape.width > 0) || !(shape.height > 0)) {
      onChange({ [key]: next });
      return;
    }
    const ratio = shape.width / shape.height;
    if (key === "width") {
      onChange({
        width: next,
        height: Math.max(MIN_ELEMENT_SIZE, Math.round(next / ratio)),
      });
      return;
    }
    onChange({
      height: next,
      width: Math.max(MIN_ELEMENT_SIZE, Math.round(next * ratio)),
    });
  };

  return (
    <div className="editor-line-panel editor-shape-panel">
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
                onClick: ({ key }) => onChange(flipShape(item, key)),
              }}
              trigger={["click"]}
            >
              <button type="button" aria-label="翻转">
                <FlipIcon />
              </button>
            </Dropdown>
            <button
              type="button"
              aria-label="锁定"
              aria-pressed={shape.locked}
              className={shape.locked ? "is-on" : undefined}
              onClick={() => onChange({ locked: !shape.locked })}
            >
              {shape.locked ? <LockOutlined aria-hidden /> : <UnlockOutlined aria-hidden />}
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

          <Dropdown
            menu={{
              items: SHAPE_KIND_ITEMS,
              onClick: ({ key }) => onChange({ kind: key }),
            }}
            trigger={["click"]}
          >
            <button type="button" className="editor-line-adjust">
              调整形状
            </button>
          </Dropdown>

          <div className="editor-opacity editor-shape-slider">
            <span>圆角</span>
            <Slider
              min={0}
              max={Math.max(1, radiusMax)}
              value={Math.min(shape.cornerRadius, radiusMax)}
              ariaLabelForHandle="圆角"
              onChange={(cornerRadius) => onChange({ cornerRadius })}
            />
            <em className="editor-line-value">{Math.round(Math.min(shape.cornerRadius, radiusMax))}</em>
          </div>

          <section className="editor-line-section">
            <div className="editor-line-section-head">
              <h3>填充</h3>
              <SectionOps
                name="填充"
                visible={shape.fillVisible}
                onToggle={() => onChange({ fillVisible: !shape.fillVisible })}
                onRemove={() => onChange({ fillVisible: false })}
              />
            </div>
            <div className="editor-line-section-body">
              <div className="editor-line-field editor-shape-swatch">
                <span>颜色</span>
                <EditorColorPicker
                  label="填充颜色"
                  value={shape.fill}
                  fallback="#2563eb"
                  onChange={(fill) => onChange({ fill, fillVisible: true })}
                />
              </div>
            </div>
          </section>

          <section className="editor-line-section">
            <div className="editor-line-section-head">
              <h3>描边</h3>
              <SectionOps
                name="描边"
                visible={shape.strokeVisible}
                onToggle={() => onChange({ strokeVisible: !shape.strokeVisible })}
                onRemove={() => onChange({ strokeVisible: false })}
              />
            </div>
            <div className="editor-line-section-body">
              <div className="editor-line-field editor-shape-swatch">
                <span>颜色</span>
                <EditorColorPicker
                  label="描边颜色"
                  value={shape.stroke}
                  fallback="#6b7280"
                  onChange={(stroke) => onChange({ stroke, strokeVisible: true })}
                />
              </div>
              <div className="editor-opacity editor-line-stroke-width">
                <span>粗细</span>
                <Slider
                  min={0}
                  max={40}
                  value={shape.strokeWidth}
                  ariaLabelForHandle="描边粗细"
                  onChange={(strokeWidth) =>
                    onChange({ strokeWidth, strokeVisible: strokeWidth > 0 ? true : shape.strokeVisible })
                  }
                />
                <em className="editor-line-value">{shape.strokeWidth}</em>
              </div>
              <div className="editor-shape-seg-row" role="group" aria-label="描边位置">
                <span>位置</span>
                <div className="editor-shape-seg">
                  {STROKE_ALIGNS.map((align) => (
                    <button
                      key={align.key}
                      type="button"
                      aria-label={align.label}
                      aria-pressed={shape.strokeAlign === align.key}
                      className={shape.strokeAlign === align.key ? "is-on" : undefined}
                      onClick={() => onChange({ strokeAlign: align.key })}
                    >
                      <AlignIcon kind={align.key} />
                    </button>
                  ))}
                </div>
              </div>
              <div className="editor-shape-seg-row" role="group" aria-label="线型">
                <span>线型</span>
                <div className="editor-shape-seg">
                  {STROKE_STYLES.map((style) => (
                    <button
                      key={style.key}
                      type="button"
                      aria-label={style.label}
                      aria-pressed={shape.strokeStyle === style.key}
                      className={shape.strokeStyle === style.key ? "is-on" : undefined}
                      onClick={() => onChange({ strokeStyle: style.key })}
                    >
                      <i className={`editor-line-style-mark is-${style.key === "solid" ? "line" : style.key}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <div className="editor-opacity editor-shape-slider">
            <span>不透明度</span>
            <Slider
              min={0}
              max={100}
              value={shape.opacity}
              ariaLabelForHandle="不透明度"
              onChange={(opacity) => onChange({ opacity })}
            />
            <em className="editor-line-value">{shape.opacity}</em>
          </div>

          <section className="editor-text-geo">
            <div className="editor-shape-size">
              <h3>尺寸</h3>
              <button
                type="button"
                className={`editor-text-lock${shape.aspectLocked ? " is-on" : ""}`}
                aria-label="锁定宽高比"
                aria-pressed={shape.aspectLocked}
                onClick={() => onChange({ aspectLocked: !shape.aspectLocked })}
              >
                <LinkOutlined aria-hidden />
              </button>
              <NumberChip
                label="宽"
                value={Math.round(shape.width)}
                min={MIN_ELEMENT_SIZE}
                max={8000}
                onChange={(width) => patchSize("width", width)}
              />
              <NumberChip
                label="高"
                value={Math.round(shape.height)}
                min={MIN_ELEMENT_SIZE}
                max={8000}
                onChange={(height) => patchSize("height", height)}
              />
            </div>
          </section>

          <section className="editor-text-geo">
            <div className="editor-shape-pos">
              <h3>位置</h3>
              <NumberChip
                label="X"
                value={Math.round(shape.x)}
                min={-4000}
                max={8000}
                onChange={(x) => onChange({ x })}
              />
              <NumberChip
                label="Y"
                value={Math.round(shape.y)}
                min={-4000}
                max={8000}
                onChange={(y) => onChange({ y })}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}
