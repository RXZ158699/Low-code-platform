import { Dropdown, Slider } from "antd";
import {
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
} from "@ant-design/icons";
import {
  getMagnifierProps,
  MAGNIFIER_MAX_SCALE,
  MAGNIFIER_MIN_SCALE,
} from "../canvas.js";

const LAYER_ITEMS = [
  { key: "up", label: "上移一层" },
  { key: "down", label: "下移一层" },
  { key: "top", label: "置于顶层" },
  { key: "bottom", label: "置于底层" },
];

const SHAPE_LABELS = {
  square: "方形",
  circle: "圆形",
  rounded: "圆角矩形",
};

const SHAPE_ITEMS = Object.keys(SHAPE_LABELS).map((key) => ({
  key,
  label: (
    <span className="editor-magnifier-shape-option">
      <i className={`is-${key}`} aria-hidden="true" />
      {SHAPE_LABELS[key]}
    </span>
  ),
}));

export default function EditorMagnifierPanel({
  item,
  onChange,
  onDelete,
  onDuplicate,
  onLayer,
}) {
  const props = getMagnifierProps(item);

  return (
    <div className="editor-magnifier-panel">
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
        <button type="button" aria-label="复制放大镜" onClick={onDuplicate}>
          <CopyOutlined aria-hidden />
        </button>
        <button type="button" aria-label="删除放大镜" onClick={onDelete}>
          <DeleteOutlined aria-hidden />
        </button>
      </div>

      <div className="editor-magnifier-shape">
        <Dropdown
          menu={{
            items: SHAPE_ITEMS,
            selectedKeys: [props.shape],
            onClick: ({ key }) => onChange({ shape: key }),
          }}
          trigger={["click"]}
        >
          <button
            type="button"
            className="editor-magnifier-shape-trigger"
            aria-label="放大镜形状"
          >
            <span>形状</span>
            <strong>{SHAPE_LABELS[props.shape]}</strong>
            <DownOutlined aria-hidden />
          </button>
        </Dropdown>
      </div>

      <div className="editor-magnifier-zoom">
        <div className="editor-magnifier-zoom-head">
          <span>放大倍率</span>
          <strong>{props.scale}x</strong>
        </div>
        <Slider
          min={MAGNIFIER_MIN_SCALE}
          max={MAGNIFIER_MAX_SCALE}
          step={0.1}
          value={props.scale}
          ariaLabelForHandle="放大倍率"
          onChange={(value) => onChange({ scale: value })}
        />
      </div>
    </div>
  );
}
