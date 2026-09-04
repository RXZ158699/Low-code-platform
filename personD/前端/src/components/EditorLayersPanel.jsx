import { useMemo, useRef, useState } from "react";
import {
  AppstoreOutlined,
  BorderOutlined,
  CopyOutlined,
  DeleteOutlined,
  DownOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  FontSizeOutlined,
  LockOutlined,
  PictureOutlined,
  UnlockOutlined,
  UpOutlined,
} from "@ant-design/icons";
import {
  isCollageElement,
  isDoodleElement,
  isMagnifierElement,
  isMediaElement,
  isShapeElement,
  isTableElement,
  shapeKind,
  toggleElementLocked,
  toggleElementVisible,
  updateElement,
} from "../canvas.js";

function typeLabel(item) {
  if (item.name) return item.name;
  if (item.type === "text") {
    const text = String(item.text || "").replace(/\s+/g, " ").trim();
    return text ? text.slice(0, 18) : "文字";
  }
  if (isShapeElement(item)) {
    const label = shapeKind(item);
    return label === "square" ? "形状" : label;
  }
  if (isMediaElement(item)) return item.name || "图片";
  if (isCollageElement(item)) return "拼图";
  if (isMagnifierElement(item)) return "放大镜";
  if (isTableElement(item)) return "表格";
  if (isDoodleElement(item)) return "涂鸦";
  return item.type || "图层";
}

function typeIcon(item) {
  if (item.type === "text") return <FontSizeOutlined />;
  if (isMediaElement(item)) return <PictureOutlined />;
  if (isCollageElement(item)) return <AppstoreOutlined />;
  return <BorderOutlined />;
}

export default function EditorLayersPanel({
  open,
  canvas,
  selectedId,
  onSelect,
  onChange,
  onDuplicate,
  onDelete,
  onClose,
}) {
  const [renameId, setRenameId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [dragIndex, setDragIndex] = useState(null);
  const [dropIndex, setDropIndex] = useState(null);
  const inputRef = useRef(null);

  const layers = useMemo(
    () => [...canvas.elements].reverse(),
    [canvas.elements],
  );

  if (!open) return null;

  const commitRename = () => {
    if (renameId) {
      const name = renameValue.trim();
      onChange(
        updateElement(canvas, renameId, { name: name || undefined }),
      );
    }
    setRenameId(null);
    setRenameValue("");
  };

  const startRename = (item) => {
    setRenameId(item.id);
    setRenameValue(item.name || typeLabel(item));
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleDrop = (targetIndex) => {
    if (dragIndex == null) return;
    const nextLayers = [...layers];
    const [item] = nextLayers.splice(dragIndex, 1);
    const insertAt = Math.max(0, Math.min(targetIndex, nextLayers.length));
    nextLayers.splice(insertAt, 0, item);
    onChange({
      ...canvas,
      elements: [...nextLayers].reverse(),
    });
    setDragIndex(null);
    setDropIndex(null);
  };

  const moveBoundary = (item, boundary) => {
    const without = canvas.elements.filter((entry) => entry.id !== item.id);
    const next =
      boundary === "top"
        ? [...without, item]
        : [item, ...without];
    onChange({ ...canvas, elements: next });
  };

  return (
    <aside className="editor-layers-panel" aria-label="图层管理">
      <div className="editor-layers-head">
        <strong>图层</strong>
        <span>{layers.length}</span>
        <button
          type="button"
          className="editor-layers-close"
          aria-label="关闭图层面板"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      {layers.length === 0 ? (
        <div className="editor-layers-empty">暂无图层</div>
      ) : (
        <div className="editor-layers-list">
          {layers.map((item, index) => {
            const hidden = item.visible === false;
            const locked = Boolean(item.locked);
            const active = selectedId === item.id;
            return (
              <div
                key={item.id}
                className={`editor-layer-row${active ? " is-active" : ""}${
                  hidden ? " is-hidden" : ""
                }${locked ? " is-locked" : ""}${
                  dropIndex === index ? " is-drop-target" : ""
                }`}
                draggable
                onDragStart={(event) => {
                  setDragIndex(index);
                  event.dataTransfer.effectAllowed = "move";
                  event.dataTransfer.setData("text/plain", item.id);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setDropIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  handleDrop(index);
                }}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDropIndex(null);
                }}
                onClick={() => onSelect(item.id)}
                onDoubleClick={() => startRename(item)}
              >
                <button
                  type="button"
                  className="editor-layer-visibility"
                  aria-label={hidden ? `显示 ${typeLabel(item)}` : `隐藏 ${typeLabel(item)}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onChange(toggleElementVisible(canvas, item.id));
                  }}
                >
                  {hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                </button>

                <span className="editor-layer-thumb">{typeIcon(item)}</span>

                {renameId === item.id ? (
                  <input
                    ref={inputRef}
                    className="editor-layer-rename"
                    value={renameValue}
                    maxLength={32}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => setRenameValue(event.target.value)}
                    onBlur={commitRename}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") commitRename();
                      if (event.key === "Escape") setRenameId(null);
                    }}
                  />
                ) : (
                  <span className="editor-layer-name" title={typeLabel(item)}>
                    {typeLabel(item)}
                  </span>
                )}

                <span className="editor-layer-actions">
                  <button
                    type="button"
                    aria-label={`${typeLabel(item)} 置顶`}
                    onClick={(event) => {
                      event.stopPropagation();
                      moveBoundary(item, "top");
                    }}
                  >
                    <UpOutlined />
                  </button>
                  <button
                    type="button"
                    aria-label={`${typeLabel(item)} 置底`}
                    onClick={(event) => {
                      event.stopPropagation();
                      moveBoundary(item, "bottom");
                    }}
                  >
                    <DownOutlined />
                  </button>
                  <button
                    type="button"
                    aria-label={
                      locked ? `解锁 ${typeLabel(item)}` : `锁定 ${typeLabel(item)}`
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      onChange(toggleElementLocked(canvas, item.id));
                    }}
                  >
                    {locked ? <LockOutlined /> : <UnlockOutlined />}
                  </button>
                  <button
                    type="button"
                    aria-label={`复制 ${typeLabel(item)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDuplicate(item.id);
                    }}
                  >
                    <CopyOutlined />
                  </button>
                  <button
                    type="button"
                    aria-label={`删除 ${typeLabel(item)}`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onDelete(item.id);
                    }}
                  >
                    <DeleteOutlined />
                  </button>
                </span>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
}
