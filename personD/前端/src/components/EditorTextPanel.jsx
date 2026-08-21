import { useState } from "react";
import { Dropdown, Input, Select, Slider, Switch, App as AntdApp } from "antd";
import EditorColorPicker, { hexColor } from "./EditorColorPicker.jsx";
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
import { MIN_ELEMENT_SIZE, TEXT_BOX_MAX_RESIZE, TEXT_FONTS, getTextProps, isBlankText } from "../canvas.js";

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

function FoldRow({ title, open, onToggle, onAdd, onRemove, children }) {
  return (
    <div className="editor-text-fold">
      <div className="editor-text-fold-head">
        <button type="button" className="editor-text-fold-title" aria-expanded={open} onClick={onToggle}>
          {title}
          <DownOutlined aria-hidden className={open ? "is-open" : undefined} />
        </button>
        <div className="editor-text-fold-ops">
          <button type="button" aria-label={`添加${title}`} onClick={onAdd}>
            +
          </button>
          <button type="button" aria-label={`删除${title}`} onClick={onRemove}>
            -
          </button>
        </div>
      </div>
      {open ? <div className="editor-text-fold-body">{children}</div> : null}
    </div>
  );
}

function ValueSlider({ label, value, min, max, onChange, className }) {
  return (
    <div className={className ? `editor-opacity ${className}` : "editor-opacity"}>
      <span>{label}</span>
      <Slider
        min={min}
        max={max}
        value={value}
        ariaLabelForHandle={label}
        onChange={onChange}
      />
      <em>{value}</em>
    </div>
  );
}

function ColorField({ label, value, fallback, onChange }) {
  return (
    <div className="editor-text-color">
      <span>{label}</span>
      <EditorColorPicker label={label} value={value} fallback={fallback} onChange={onChange} />
    </div>
  );
}

function GradientField({ from, to, onChange }) {
  const left = hexColor(from, "#111827");
  const right = hexColor(to, "#2563eb");
  return (
    <div className="editor-text-color" role="group" aria-label="文字渐变">
      <span>文字渐变</span>
      <span className="editor-text-gradient-stops">
        <EditorColorPicker
          label="渐变左侧颜色"
          value={left}
          onChange={(gradientFrom) => onChange({ gradientEnabled: true, gradientFrom })}
        />
        <i
          className="editor-text-gradient-preview"
          aria-hidden
          style={{ backgroundImage: `linear-gradient(90deg, ${left}, ${right})` }}
        />
        <EditorColorPicker
          label="渐变右侧颜色"
          value={right}
          fallback="#2563eb"
          onChange={(gradientTo) => onChange({ gradientEnabled: true, gradientTo })}
        />
      </span>
    </div>
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

  const fillOn = Boolean(text.gradientEnabled);
  const strokeOn = Boolean(text.strokeEnabled);
  const shadowOn = Boolean(text.shadowEnabled);
  const bgOn = Boolean(text.boxBackground);

  const toggleFold = (id, enabled) => {
    if (!enabled) return;
    setOpenFold((current) => (current === id ? "" : id));
  };

  const addEffect = (id, patch) => {
    onChange(patch);
    setOpenFold(id);
  };

  const removeEffect = (id, patch) => {
    onChange(patch);
    setOpenFold((current) => (current === id ? "" : current));
  };

  const patchSize = (key, raw) => {
    const next = readNumber(raw, text[key], MIN_ELEMENT_SIZE, TEXT_BOX_MAX_RESIZE);
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
            <ColorField
              label="文字色"
              value={text.color}
              onChange={(color) => onChange({ color, gradientEnabled: false })}
            />
            <div className="editor-text-color">
              <span>划重点</span>
              <span className="editor-text-highlight">
                <Switch
                  size="small"
                  aria-label="划重点"
                  checked={Boolean(text.highlight)}
                  onChange={(checked) => onChange({ highlight: checked ? hexColor(text.highlight, "#fde047") : "" })}
                />
                <EditorColorPicker
                  label="划重点颜色"
                  value={text.highlight}
                  fallback="#fde047"
                  onChange={(highlight) => onChange({ highlight })}
                />
              </span>
            </div>
          </div>

          <FoldRow
            title="填充"
            open={fillOn && openFold === "fill"}
            onToggle={() => toggleFold("fill", fillOn)}
            onAdd={() => addEffect("fill", { gradientEnabled: true })}
            onRemove={() => removeEffect("fill", { gradientEnabled: false })}
          >
            <GradientField
              from={text.gradientFrom}
              to={text.gradientTo}
              onChange={onChange}
            />
          </FoldRow>
          <FoldRow
            title="描边"
            open={strokeOn && openFold === "stroke"}
            onToggle={() => toggleFold("stroke", strokeOn)}
            onAdd={() =>
              addEffect("stroke", {
                strokeEnabled: true,
                strokeWidth: text.strokeWidth > 0 ? text.strokeWidth : 2,
              })
            }
            onRemove={() => removeEffect("stroke", { strokeEnabled: false })}
          >
            <ColorField
              label="描边色"
              value={text.strokeColor}
              onChange={(strokeColor) => onChange({ strokeColor })}
            />
            <ValueSlider
              label="描边粗细"
              value={text.strokeWidth}
              min={0}
              max={20}
              onChange={(strokeWidth) => onChange({ strokeWidth })}
            />
          </FoldRow>
          <FoldRow
            title="投影"
            open={shadowOn && openFold === "shadow"}
            onToggle={() => toggleFold("shadow", shadowOn)}
            onAdd={() => addEffect("shadow", { shadowEnabled: true })}
            onRemove={() => removeEffect("shadow", { shadowEnabled: false })}
          >
            <ColorField
              label="投影色"
              value={text.shadowColor}
              fallback="#000000"
              onChange={(shadowColor) => onChange({ shadowColor })}
            />
            <ValueSlider
              label="模糊"
              value={text.shadowBlur}
              min={0}
              max={40}
              onChange={(shadowBlur) => onChange({ shadowBlur })}
            />
          </FoldRow>
          <FoldRow
            title="背景"
            open={bgOn && openFold === "bg"}
            onToggle={() => toggleFold("bg", bgOn)}
            onAdd={() => addEffect("bg", { boxBackground: text.boxBackground || "#ffffff" })}
            onRemove={() => removeEffect("bg", { boxBackground: "" })}
          >
            <ColorField
              label="文字背景"
              value={text.boxBackground}
              fallback="#ffffff"
              onChange={(boxBackground) => onChange({ boxBackground })}
            />
            <ValueSlider
              label="背景透明度"
              value={text.boxBackgroundOpacity}
              min={0}
              max={100}
              onChange={(boxBackgroundOpacity) => onChange({ boxBackgroundOpacity })}
            />
          </FoldRow>

          <ValueSlider
            className="editor-text-opacity"
            label="不透明度"
            value={text.opacity}
            min={0}
            max={100}
            onChange={(opacity) => onChange({ opacity })}
          />

          <section className="editor-text-geo">
            <h3>尺寸</h3>
            <div className="editor-text-box">
              <NumberChip label="宽" value={Math.round(text.width)} min={MIN_ELEMENT_SIZE} max={TEXT_BOX_MAX_RESIZE} onChange={(width) => patchSize("width", width)} />
              <button
                type="button"
                className={`editor-text-lock ${text.aspectLocked ? "is-on" : ""}`}
                aria-label="锁定宽高比"
                aria-pressed={Boolean(text.aspectLocked)}
                onClick={() => onChange({ aspectLocked: !text.aspectLocked })}
              >
                <LinkOutlined aria-hidden />
              </button>
              <NumberChip label="高" value={Math.round(text.height)} min={MIN_ELEMENT_SIZE} max={TEXT_BOX_MAX_RESIZE} onChange={(height) => patchSize("height", height)} />
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
