import { useRef, useState } from "react";
import { Dropdown, Slider, Switch, App as AntdApp } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  LinkOutlined,
  LockOutlined,
  UnlockOutlined,
} from "@ant-design/icons";
import EditorColorPicker from "./EditorColorPicker.jsx";
import { CollageThumb } from "./EditorCollagePicker.jsx";
import {
  applyCollageLayout,
  fitCollageToCanvas,
  getCollageProps,
  setCollageSize,
} from "../canvas.js";
import {
  COLLAGE_GAP,
  COLLAGE_SECTIONS,
  findCollageLayout,
} from "../collageLayouts.js";

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
        onChange={(event) =>
          onChange(readNumber(event.target.value, value, min, max))
        }
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
        d="M2.2 3.2h8.4c.6 0 1 .4 1 1v2.2h1.7c.6 0 1.1.5 1.1 1.1v4.2c0 .9-.7 1.6-1.6 1.6h-.6c-.9 0-1.6-.7-1.6-1.6V4.2c0-.6.4-1 1-1Zm8.4 1.2H3.4v2.2h7.2V4.4Z"
      />
    </svg>
  );
}

function ValueSlider({ label, value, min, max, onChange }) {
  return (
    <div className="editor-opacity editor-collage-slider">
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

export default function EditorCollagePanel({
  item,
  canvas,
  onChange,
  onDelete,
  onDuplicate,
  onLayer,
  onAddImages,
}) {
  const { message } = AntdApp.useApp();
  const fileRef = useRef(null);
  const [tab, setTab] = useState("collage");
  const props = getCollageProps(item);
  const layout = findCollageLayout(item.layoutId) || {
    id: item.layoutId || "collage",
    cells: item.cells || [],
    rowCount: item.rowCount || 1,
    colCount: item.colCount || 1,
    colTemplate: item.colTemplate,
    rowTemplate: item.rowTemplate,
  };
  const soon = () => message.info("功能开发中");

  return (
    <div className="editor-collage-panel">
      <div className="editor-text-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "collage"}
          className={tab === "collage" ? "is-active" : undefined}
          onClick={() => setTab("collage")}
        >
          拼图
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
            <Dropdown
              menu={{ items: LAYER_ITEMS, onClick: ({ key }) => onLayer(key) }}
              trigger={["click"]}
            >
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
                onClick: ({ key }) =>
                  onChange(
                    key === "x"
                      ? { flippedX: !item.flippedX }
                      : { flippedY: !item.flippedY },
                  ),
              }}
              trigger={["click"]}
            >
              <button
                type="button"
                aria-label="翻转"
                aria-pressed={props.flippedX || props.flippedY}
              >
                <span className="editor-text-flip-icon" aria-hidden>
                  ⇄
                </span>
              </button>
            </Dropdown>
            <button
              type="button"
              aria-label="锁定"
              aria-pressed={props.locked}
              className={props.locked ? "is-on" : undefined}
              onClick={() => onChange({ locked: !props.locked })}
            >
              {props.locked ? (
                <LockOutlined aria-hidden />
              ) : (
                <UnlockOutlined aria-hidden />
              )}
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

          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            hidden
            aria-label="选择拼图图片"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              event.target.value = "";
              if (files.length) onAddImages?.(files);
            }}
          />
          <button
            type="button"
            className="editor-collage-action"
            onClick={() => fileRef.current?.click()}
          >
            添加图片
          </button>
          <button
            type="button"
            className="editor-collage-action"
            onClick={() => onChange(fitCollageToCanvas(canvas, item))}
          >
            适应画布尺寸
          </button>

          <Dropdown
            trigger={["click"]}
            getPopupContainer={() => document.body}
            popupRender={() => (
              <div className="editor-collage-layout-menu">
                {COLLAGE_SECTIONS.map((section) => (
                  <section key={section.title}>
                    <h3>{section.title}</h3>
                    <div className="editor-collage-grid">
                      {section.layouts.map((entry, index) => (
                        <button
                          type="button"
                          key={entry.id}
                          className={`editor-collage-item${entry.id === layout.id ? " is-on" : ""}`}
                          aria-label={`${section.title}布局${index + 1}`}
                          onClick={() =>
                            onChange(applyCollageLayout(item, entry))
                          }
                        >
                          <CollageThumb layout={entry} />
                        </button>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          >
            <button
              type="button"
              className="editor-collage-layout"
              aria-label="拼图布局"
            >
              <span className="editor-collage-layout-icon" aria-hidden>
                <CollageThumb layout={layout} />
              </span>
              <span>拼图布局</span>
              <DownOutlined aria-hidden />
            </button>
          </Dropdown>

          <div className="editor-collage-settings">
            <label className="editor-collage-row">
              <span>无缝模式</span>
              <Switch
                size="small"
                aria-label="无缝模式"
                checked={props.seamless || props.gap === 0}
                onChange={(checked) =>
                  onChange(
                    checked
                      ? {
                          seamless: true,
                          lastGap: props.gap || COLLAGE_GAP,
                          gap: 0,
                        }
                      : {
                          seamless: false,
                          gap: item.lastGap || COLLAGE_GAP,
                        },
                  )
                }
              />
            </label>
            <ValueSlider
              label="外框"
              min={0}
              max={80}
              value={props.padding}
              onChange={(padding) => onChange({ padding })}
            />
            <ValueSlider
              label="内框"
              min={0}
              max={80}
              value={props.seamless ? 0 : props.gap}
              onChange={(gap) =>
                onChange({
                  gap,
                  seamless: gap === 0,
                  lastGap: gap || item.lastGap || COLLAGE_GAP,
                })
              }
            />
            <ValueSlider
              label="圆角"
              min={0}
              max={80}
              value={props.radius}
              onChange={(radius) => onChange({ radius })}
            />
          </div>

          <div className="editor-collage-style">
            <div className="editor-collage-row">
              <span>背景</span>
              <EditorColorPicker
                label="背景"
                value={props.fill}
                fallback="#ffffff"
                onChange={(fill) => onChange({ fill })}
              >
                <button type="button" aria-label="添加背景">
                  +
                </button>
              </EditorColorPicker>
            </div>
            <ValueSlider
              label="不透明度"
              min={0}
              max={100}
              value={props.opacity}
              onChange={(opacity) => onChange({ opacity })}
            />
          </div>

          <section className="editor-text-geo">
            <h3>尺寸</h3>
            <div className="editor-text-box editor-collage-size">
              <button
                type="button"
                className={`editor-text-lock${props.aspectLocked ? " is-on" : ""}`}
                aria-label="锁定宽高比"
                aria-pressed={props.aspectLocked}
                onClick={() => onChange({ aspectLocked: !props.aspectLocked })}
              >
                <LinkOutlined aria-hidden />
              </button>
              <NumberChip
                label="宽"
                value={Math.round(props.width)}
                min={16}
                max={8000}
                onChange={(width) => onChange(setCollageSize(item, { width }))}
              />
              <NumberChip
                label="高"
                value={Math.round(props.height)}
                min={16}
                max={8000}
                onChange={(height) =>
                  onChange(setCollageSize(item, { height }))
                }
              />
            </div>
          </section>

          <section className="editor-text-geo">
            <h3>位置</h3>
            <div className="editor-text-box is-xy">
              <NumberChip
                label="X"
                value={Math.round(props.x)}
                min={-4000}
                max={8000}
                onChange={(x) => onChange({ x })}
              />
              <NumberChip
                label="Y"
                value={Math.round(props.y)}
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
