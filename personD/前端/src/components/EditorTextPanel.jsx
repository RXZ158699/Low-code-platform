import { useState } from "react";
import { Dropdown, Input, Select, Slider, App as AntdApp } from "antd";
import {
  AlignCenterOutlined,
  AlignLeftOutlined,
  AlignRightOutlined,
  BoldOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EllipsisOutlined,
  ItalicOutlined,
  LinkOutlined,
  LockOutlined,
  StrikethroughOutlined,
  UnderlineOutlined,
  UnlockOutlined,
  VerticalAlignMiddleOutlined,
  VerticalLeftOutlined,
} from "@ant-design/icons";
import { MIN_ELEMENT_SIZE, TEXT_FONTS, getTextProps, isBlankText } from "../canvas.js";

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

const LIST_ITEMS = [
  { key: "none", label: "无列表" },
  { key: "disc", label: "圆点列表" },
  { key: "decimal", label: "数字列表" },
];

function hexColor(value, fallback = "#111827") {
  return /^#([0-9a-fA-F]{6})$/.test(value) ? value : fallback;
}

function readNumber(value, fallback, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function ToolButton({ pressed, label, onClick, children }) {
  return (
    <button
      type="button"
      className={pressed ? "is-on" : undefined}
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function FoldRow({ title, open, onToggle, children }) {
  return (
    <div className="editor-text-fold">
      <button type="button" aria-expanded={open} onClick={onToggle}>
        {title}
        <DownOutlined aria-hidden className={open ? "is-open" : undefined} />
      </button>
      {open ? <div className="editor-text-fold-body">{children}</div> : null}
    </div>
  );
}

function ColorField({ label, value, fallback, onChange }) {
  return (
    <label className="editor-text-color">
      <span>{label}</span>
      <span className="editor-color">
        <input
          type="color"
          aria-label={label}
          value={hexColor(value, fallback)}
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </label>
  );
}

function NumberChip({ label, value, min, max, step = 1, onChange, hideName }) {
  return (
    <label className={`editor-text-chip ${hideName ? "is-compact" : ""}`}>
      {hideName ? null : <span className="editor-text-chip-name">{label}</span>}
      <input
        aria-label={label}
        type="number"
        inputMode={step < 1 ? "decimal" : "numeric"}
        autoComplete="off"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(readNumber(event.target.value, value, min, max))}
      />
    </label>
  );
}

export default function EditorTextPanel({ item, onChange, onDelete, onDuplicate, onEmptyText, onLayer }) {
  const { message } = AntdApp.useApp();
  const text = getTextProps(item);
  const [tab, setTab] = useState("text");
  const [openFold, setOpenFold] = useState("");

  const toggleFold = (id) => setOpenFold((current) => (current === id ? "" : id));

  const patchSize = (key, raw) => {
    const next = readNumber(raw, text[key], MIN_ELEMENT_SIZE, 8000);
    if (!text.aspectLocked || !text.width || !text.height) {
      onChange({ [key]: next });
      return;
    }
    const ratio = text.width / text.height;
    if (key === "width") {
      onChange({ width: next, height: Math.max(MIN_ELEMENT_SIZE, Math.round(next / ratio)) });
      return;
    }
    onChange({ height: next, width: Math.max(MIN_ELEMENT_SIZE, Math.round(next * ratio)) });
  };

  const cycleVerticalAlign = () => {
    const order = ["top", "middle", "bottom"];
    const index = order.indexOf(text.verticalAlign);
    onChange({ verticalAlign: order[(index + 1) % order.length] });
  };

  return (
    <div className="editor-text-panel">
      <div className="editor-text-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "text"}
          className={tab === "text" ? "is-active" : undefined}
          onClick={() => setTab("text")}
        >
          文字
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
          <div className="editor-text-actions">
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
                onClick: ({ key }) => onChange(key === "x" ? { flippedX: !text.flippedX } : { flippedY: !text.flippedY }),
              }}
              trigger={["click"]}
            >
              <button type="button" aria-label="翻转" aria-pressed={text.flippedX || text.flippedY}>
                <span className="editor-text-flip-icon" aria-hidden>
                  ⇄
                </span>
              </button>
            </Dropdown>
            <button
              type="button"
              aria-label="锁定"
              aria-pressed={Boolean(text.locked)}
              className={text.locked ? "is-on" : undefined}
              onClick={() => onChange({ locked: !text.locked })}
            >
              {text.locked ? <LockOutlined aria-hidden /> : <UnlockOutlined aria-hidden />}
            </button>
            <button type="button" aria-label="复制图层" onClick={onDuplicate}>
              <CopyOutlined aria-hidden />
            </button>
            <button type="button" aria-label="删除图层" onClick={onDelete}>
              <DeleteOutlined aria-hidden />
            </button>
          </div>

          <div className="editor-text-font">
            <Select
              aria-label="字体"
              className="editor-text-select"
              value={text.fontFamily}
              options={TEXT_FONTS.map((font) => ({ value: font.family, label: font.label }))}
              onChange={(fontFamily) => onChange({ fontFamily })}
              suffixIcon={<DownOutlined aria-hidden />}
              getPopupContainer={() => document.body}
            />
            <NumberChip
              label="字号"
              hideName
              value={text.fontSize}
              min={8}
              max={400}
              onChange={(fontSize) => onChange({ fontSize })}
            />
          </div>

          <div className="editor-text-tools">
            <div className="editor-text-group">
              <ToolButton
                label="加粗"
                pressed={Number(text.fontWeight) >= 700}
                onClick={() => onChange({ fontWeight: Number(text.fontWeight) >= 700 ? 400 : 700 })}
              >
                <BoldOutlined aria-hidden />
              </ToolButton>
              <ToolButton
                label="斜体"
                pressed={Boolean(text.italic)}
                onClick={() => onChange({ italic: !text.italic })}
              >
                <ItalicOutlined aria-hidden />
              </ToolButton>
              <ToolButton
                label="下划线"
                pressed={Boolean(text.underline)}
                onClick={() => onChange({ underline: !text.underline })}
              >
                <UnderlineOutlined aria-hidden />
              </ToolButton>
              <ToolButton
                label="删除线"
                pressed={Boolean(text.strikethrough)}
                onClick={() => onChange({ strikethrough: !text.strikethrough })}
              >
                <StrikethroughOutlined aria-hidden />
              </ToolButton>
            </div>
            <div className="editor-text-group">
              <ToolButton
                label="竖排文字"
                pressed={text.writingMode === "vertical"}
                onClick={() =>
                  onChange({ writingMode: text.writingMode === "vertical" ? "horizontal" : "vertical" })
                }
              >
                <VerticalLeftOutlined aria-hidden />
              </ToolButton>
            </div>
          </div>

          <div className="editor-text-tools">
            <div className="editor-text-group">
              <ToolButton
                label="左对齐"
                pressed={text.textAlign === "left"}
                onClick={() => onChange({ textAlign: "left" })}
              >
                <AlignLeftOutlined aria-hidden />
              </ToolButton>
              <ToolButton
                label="居中对齐"
                pressed={text.textAlign === "center"}
                onClick={() => onChange({ textAlign: "center" })}
              >
                <AlignCenterOutlined aria-hidden />
              </ToolButton>
              <ToolButton
                label="右对齐"
                pressed={text.textAlign === "right"}
                onClick={() => onChange({ textAlign: "right" })}
              >
                <AlignRightOutlined aria-hidden />
              </ToolButton>
              <ToolButton
                label="两端对齐"
                pressed={text.textAlign === "justify"}
                onClick={() => onChange({ textAlign: "justify" })}
              >
                <span className="editor-text-justify" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </ToolButton>
            </div>
            <div className="editor-text-group">
              <ToolButton label="垂直对齐" pressed={text.verticalAlign !== "middle"} onClick={cycleVerticalAlign}>
                <VerticalAlignMiddleOutlined aria-hidden />
              </ToolButton>
            </div>
          </div>

          <div className="editor-text-metrics">
            <NumberChip
              label="行距"
              value={text.lineHeight}
              min={0.8}
              max={4}
              step={0.1}
              onChange={(lineHeight) => onChange({ lineHeight })}
            />
            <NumberChip
              label="字距"
              value={text.letterSpacing}
              min={-20}
              max={100}
              onChange={(letterSpacing) => onChange({ letterSpacing })}
            />
            <Dropdown
              menu={{ items: LIST_ITEMS, onClick: ({ key }) => onChange({ listStyle: key }) }}
              trigger={["click"]}
            >
              <button type="button" className="editor-text-icon-btn" aria-label="列表">
                <span className="editor-text-list-icon" aria-hidden>
                  <i />
                  <i />
                  <i />
                </span>
              </button>
            </Dropdown>
            <button
              type="button"
              className="editor-text-icon-btn"
              aria-label="更多"
              onClick={() => message.info("功能开发中")}
            >
              <EllipsisOutlined aria-hidden />
            </button>
          </div>

          <div className="editor-text-colors">
            <ColorField label="文字色" value={text.color} onChange={(color) => onChange({ color })} />
            <label className="editor-text-color">
              <span>划重点</span>
              <span className="editor-text-highlight">
                <button
                  type="button"
                  aria-label="划重点"
                  aria-pressed={Boolean(text.highlight)}
                  className={text.highlight ? "is-on" : undefined}
                  onClick={() => onChange({ highlight: text.highlight ? "" : "#fde047" })}
                >
                  A
                </button>
                <span className="editor-color">
                  <input
                    type="color"
                    aria-label="划重点颜色"
                    value={hexColor(text.highlight, "#fde047")}
                    onChange={(event) => onChange({ highlight: event.target.value })}
                  />
                </span>
              </span>
            </label>
          </div>

          <FoldRow title="填充" open={openFold === "fill"} onToggle={() => toggleFold("fill")}>
            <ColorField
              label="填充色"
              value={text.fillColor}
              fallback="#ffffff"
              onChange={(fillColor) => onChange({ fillEnabled: true, fillColor })}
            />
          </FoldRow>
          <FoldRow title="描边" open={openFold === "stroke"} onToggle={() => toggleFold("stroke")}>
            <ColorField
              label="描边色"
              value={text.strokeColor}
              onChange={(strokeColor) => onChange({ strokeEnabled: true, strokeColor })}
            />
            <NumberChip
              label="描边粗细"
              value={text.strokeWidth}
              min={0}
              max={20}
              onChange={(strokeWidth) => onChange({ strokeEnabled: strokeWidth > 0, strokeWidth })}
            />
          </FoldRow>
          <FoldRow title="投影" open={openFold === "shadow"} onToggle={() => toggleFold("shadow")}>
            <ColorField
              label="投影色"
              value={text.shadowColor}
              fallback="#000000"
              onChange={(shadowColor) => onChange({ shadowEnabled: true, shadowColor })}
            />
            <NumberChip
              label="模糊"
              value={text.shadowBlur}
              min={0}
              max={40}
              onChange={(shadowBlur) => onChange({ shadowEnabled: true, shadowBlur })}
            />
          </FoldRow>
          <FoldRow title="背景" open={openFold === "bg"} onToggle={() => toggleFold("bg")}>
            <ColorField
              label="文字背景"
              value={text.boxBackground}
              fallback="#ffffff"
              onChange={(boxBackground) => onChange({ boxBackground })}
            />
          </FoldRow>

          <div className="editor-opacity editor-text-opacity">
            <span>不透明度</span>
            <Slider min={0} max={100} value={text.opacity} onChange={(opacity) => onChange({ opacity })} />
            <em>{text.opacity}</em>
          </div>

          <section className="editor-text-geo">
            <h3>尺寸</h3>
            <div className="editor-text-box">
              <NumberChip label="宽" value={Math.round(text.width)} min={MIN_ELEMENT_SIZE} max={8000} onChange={(width) => patchSize("width", width)} />
              <button
                type="button"
                className={`editor-text-lock ${text.aspectLocked ? "is-on" : ""}`}
                aria-label="锁定宽高比"
                aria-pressed={Boolean(text.aspectLocked)}
                onClick={() => onChange({ aspectLocked: !text.aspectLocked })}
              >
                <LinkOutlined aria-hidden />
              </button>
              <NumberChip label="高" value={Math.round(text.height)} min={MIN_ELEMENT_SIZE} max={8000} onChange={(height) => patchSize("height", height)} />
            </div>
          </section>

          <section className="editor-text-geo">
            <h3>位置</h3>
            <div className="editor-text-box is-xy">
              <NumberChip label="X" value={Math.round(text.x)} min={-4000} max={8000} onChange={(x) => onChange({ x })} />
              <NumberChip label="Y" value={Math.round(text.y)} min={-4000} max={8000} onChange={(y) => onChange({ y })} />
            </div>
          </section>

          <label className="editor-field">
            文案
            <Input.TextArea
              aria-label="文案"
              name="text-copy"
              autoComplete="off"
              value={item.text}
              autoSize={{ minRows: 2, maxRows: 6 }}
              onChange={(event) => onChange({ text: event.target.value })}
              onBlur={() => {
                if (isBlankText(item.text)) onEmptyText?.();
              }}
            />
          </label>
        </>
      )}
    </div>
  );
}
