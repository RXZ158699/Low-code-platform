import { useEffect, useMemo, useRef, useState } from "react";
import { Button, Dropdown, Slider, Spin, App as AntdApp } from "antd";
import {
  AppstoreOutlined,
  BlockOutlined,
  CloudOutlined,
  CopyOutlined,
  CopyrightOutlined,
  DeleteOutlined,
  DownOutlined,
  EllipsisOutlined,
  FontSizeOutlined,
  HomeOutlined,
  PictureOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RedoOutlined,
  RobotOutlined,
  TeamOutlined,
  UndoOutlined,
  UploadOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import { getWork, publishWork, updateWork } from "../api/works.js";
import {
  addRectElement,
  addTextElement,
  applyHandleResize,
  duplicateElement,
  fitTextBox,
  formatTextContent,
  isBlankText,
  moveElementLayer,
  parseCanvas,
  patchTextElement,
  removeElement,
  stringifyCanvas,
  TEXT_BOX_MAX_WIDTH,
  textPaintStyle,
  textElementStyle,
  TRANSFORM_HANDLES,
  updateElement,
  zoomByWheelDelta,
} from "../canvas.js";
import EditorAddPanel from "../components/EditorAddPanel.jsx";
import EditorTextPanel from "../components/EditorTextPanel.jsx";

const LEFT_TOOLS = [
  { id: "add", label: "添加", icon: PlusCircleOutlined },
  { id: "template", label: "模板", icon: AppstoreOutlined },
  { id: "material", label: "素材", icon: BlockOutlined },
  { id: "text", label: "文字", icon: FontSizeOutlined },
  { id: "image", label: "图片", icon: PictureOutlined },
  { id: "background", label: "背景", icon: null },
  { id: "mine", label: "我的", icon: UserOutlined },
  { id: "team", label: "团队", icon: TeamOutlined },
];

function AddToolIcon({ filled }) {
  if (!filled) return <PlusCircleOutlined aria-hidden />;
  return (
    <span className="editor-add-on-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="22" height="22">
        <circle cx="12" cy="12" r="11" fill="#1f2937" />
        <path d="M12 7v10M7 12h10" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </span>
  );
}

function BackgroundToolIcon() {
  return (
    <span className="editor-rail-bg-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <rect x="3" y="3" width="18" height="18" rx="3" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <path d="M5 19 19 5" stroke="currentColor" strokeWidth="1.6" />
        <path d="M9 19 19 9" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
        <path d="M5 15 15 5" stroke="currentColor" strokeWidth="1.2" opacity="0.45" />
      </svg>
    </span>
  );
}

function parseSize(value) {
  const number = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isInteger(number) && number > 0 ? number : 0;
}

export default function WorkEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const stageRef = useRef(null);
  const [work, setWork] = useState(null);
  const [title, setTitle] = useState("");
  const [canvas, setCanvas] = useState(() => parseCanvas(null));
  const [selectedId, setSelectedId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [activeTool, setActiveTool] = useState("");
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadedId, setLoadedId] = useState(null);
  const [past, setPast] = useState([]);
  const [future, setFuture] = useState([]);
  const [stageBox, setStageBox] = useState({ width: 960, height: 640 });
  const [zoomMode, setZoomMode] = useState("fit");
  const [resizeOpen, setResizeOpen] = useState(false);
  const [resizeWidth, setResizeWidth] = useState("");
  const [resizeHeight, setResizeHeight] = useState("");
  const dragRef = useRef(null);
  const canvasRef = useRef(canvas);
  const loading = loadedId !== String(id);

  useEffect(() => {
    let cancelled = false;
    getWork(id)
      .then((data) => {
        if (cancelled) return;
        setWork(data);
        setTitle(data.title || "未命名作品");
        setCanvas(parseCanvas(data.canvasJson));
        setSelectedId(null);
        setEditingId(null);
        setDirty(false);
        setPast([]);
        setFuture([]);
        setLoadedId(String(id));
      })
      .catch((err) => {
        if (!cancelled) {
          message.error(err.message || "作品加载失败");
          setLoadedId(String(id));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, message]);

  useEffect(() => {
    if (!dirty || !id) return undefined;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      try {
        const saved = await updateWork(id, { title, canvasJson: stringifyCanvas(canvas) });
        setWork(saved);
        setDirty(false);
      } catch (err) {
        message.error(err.message || "自动保存失败");
      } finally {
        setSaving(false);
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [canvas, title, dirty, id, message]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      setStageBox({ width: el.clientWidth || 960, height: el.clientHeight || 640 });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const selected = useMemo(
    () => canvas.elements.find((item) => item.id === selectedId) || null,
    [canvas, selectedId],
  );

  const fitZoom = Math.max(
    0.05,
    Math.min(1, (stageBox.width - 96) / canvas.width, (stageBox.height - 96) / canvas.height),
  );
  const zoom = zoomMode === "fit" ? fitZoom : zoomMode;
  const zoomLabel = `${Math.max(1, Math.round(zoom * 100))}%`;
  const zoomRef = useRef(zoom);

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useEffect(() => {
    canvasRef.current = canvas;
  }, [canvas]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      const scale = zoomRef.current || 1;
      const dx = (event.clientX - drag.start.px) / scale;
      const dy = (event.clientY - drag.start.py) / scale;
      if (drag.type === "move") {
        setCanvas((current) =>
          updateElement(current, drag.id, {
            x: drag.start.x + dx,
            y: drag.start.y + dy,
          }),
        );
        return;
      }
      const box = applyHandleResize(drag.start, drag.handle, dx, dy);
      if (drag.kind === "text") {
        const live = canvasRef.current.elements.find((item) => item.id === drag.id) || drag.start;
        const width = Math.min(TEXT_BOX_MAX_WIDTH, box.width);
        const fontSize = drag.start.height
          ? Math.max(8, Math.round((drag.start.fontSize || 16) * (box.height / drag.start.height)))
          : live.fontSize;
        const fitted = fitTextBox({ ...live, width, fontSize, autoWidth: false });
        setCanvas((current) =>
          updateElement(current, drag.id, {
            x: box.x,
            y: box.y,
            width,
            height: fitted.height,
            fontSize,
            autoWidth: false,
          }),
        );
        return;
      }
      setCanvas((current) => updateElement(current, drag.id, box));
    };
    const handlePointerUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      const current = canvasRef.current.elements.find((item) => item.id === drag.id);
      const origin = drag.snapshot.elements.find((item) => item.id === drag.id);
      if (
        current &&
        origin &&
        current.x === origin.x &&
        current.y === origin.y &&
        current.width === origin.width &&
        current.height === origin.height
      ) {
        return;
      }
      setPast((value) => [...value, drag.snapshot].slice(-40));
      setFuture([]);
      setDirty(true);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  useEffect(() => {
    const handleWheel = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const next = zoomByWheelDelta(zoomRef.current, event.deltaY);
      zoomRef.current = next;
      setZoomMode(next);
    };
    window.addEventListener("wheel", handleWheel, { passive: false, capture: true });
    return () => window.removeEventListener("wheel", handleWheel, { capture: true });
  }, []);

  const mutateCanvas = (next) => {
    setPast((value) => [...value, canvas].slice(-40));
    setFuture([]);
    setCanvas(next);
    setDirty(true);
  };

  const patchSelected = (patch) => {
    if (!selectedId) return;
    setCanvas((current) => {
      const item = current.elements.find((entry) => entry.id === selectedId);
      const nextPatch = item?.type === "text" ? patchTextElement(item, patch) : patch;
      return updateElement(current, selectedId, nextPatch);
    });
    setDirty(true);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    mutateCanvas(removeElement(canvas, selectedId));
    setSelectedId(null);
    setEditingId(null);
  };

  const finishTextEdit = () => {
    if (selected?.type === "text" && isBlankText(selected.text)) {
      deleteSelected();
      return;
    }
    setEditingId(null);
  };

  const duplicateSelected = () => {
    if (!selectedId) return;
    const next = duplicateElement(canvas, selectedId);
    const created = next.elements[next.elements.length - 1];
    mutateCanvas(next);
    setSelectedId(created.id);
    setEditingId(null);
  };

  const beginMove = (event, item) => {
    if (event.button !== 0 || editingId === item.id) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    setEditingId(null);
    if (item.locked) return;
    dragRef.current = {
      type: "move",
      id: item.id,
      kind: item.type,
      start: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        fontSize: item.fontSize,
        px: event.clientX,
        py: event.clientY,
      },
      snapshot: canvasRef.current,
    };
  };

  const beginResize = (event, handle) => {
    if (event.button !== 0 || !selected || selected.locked) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      type: "resize",
      id: selected.id,
      kind: selected.type,
      handle,
      start: {
        x: selected.x,
        y: selected.y,
        width: selected.width,
        height: selected.height,
        fontSize: selected.fontSize,
        px: event.clientX,
        py: event.clientY,
      },
      snapshot: canvasRef.current,
    };
  };

  const placeElement = (next) => {
    const created = next.elements[next.elements.length - 1];
    mutateCanvas(next);
    setSelectedId(created.id);
    setAddPanelOpen(false);
    setEditingId(null);
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (event.target.closest("input, textarea, [contenteditable='true']")) return;
      if (!selectedId || editingId) return;
      event.preventDefault();
      setPast((value) => [...value, canvas].slice(-40));
      setFuture([]);
      setCanvas(removeElement(canvas, selectedId));
      setDirty(true);
      setSelectedId(null);
      setEditingId(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvas, selectedId, editingId]);

  const undo = () => {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setPast((value) => value.slice(0, -1));
    setFuture((value) => [canvas, ...value]);
    setCanvas(prev);
    setDirty(true);
  };

  const redo = () => {
    if (!future.length) return;
    const [next, ...rest] = future;
    setFuture(rest);
    setPast((value) => [...value, canvas]);
    setCanvas(next);
    setDirty(true);
  };

  const handlePublish = async () => {
    try {
      if (dirty) {
        await updateWork(id, { title, canvasJson: stringifyCanvas(canvas) });
        setDirty(false);
      }
      const published = await publishWork(id);
      setWork(published);
      message.success("已发布");
    } catch (err) {
      message.error(err.message || "发布失败");
    }
  };

  const handleTool = (toolId) => {
    if (toolId === "add") {
      setAddPanelOpen((open) => !open);
      setActiveTool("add");
      return;
    }
    setAddPanelOpen(false);
    setActiveTool(toolId);
    if (toolId === "text") {
      placeElement(addTextElement(canvas));
      return;
    }
    if (toolId === "material") {
      placeElement(addRectElement(canvas));
      return;
    }
    if (toolId === "background") {
      setSelectedId(null);
      return;
    }
    message.info("功能开发中");
  };

  const handleAddSelect = (action) => {
    if (action === "text-h1") {
      placeElement(addTextElement(canvas, { text: "标题", fontSize: 72, fontWeight: 700 }));
      return;
    }
    if (action === "text-h2") {
      placeElement(addTextElement(canvas, { text: "副标题", fontSize: 48 }));
      return;
    }
    if (action === "text-body") {
      placeElement(addTextElement(canvas, { text: "正文", fontSize: 28 }));
      return;
    }
    if (action === "shape-square") {
      placeElement(addRectElement(canvas));
      return;
    }
    message.info("功能开发中");
  };

  const openResize = () => {
    setResizeWidth(String(canvas.width));
    setResizeHeight(String(canvas.height));
    setResizeOpen(true);
  };

  const applyResize = () => {
    const nextWidth = parseSize(resizeWidth);
    const nextHeight = parseSize(resizeHeight);
    if (nextWidth < 1 || nextHeight < 1 || nextWidth > 30000 || nextHeight > 30000) {
      message.warning("请输入 1–30000 之间的宽和高");
      return;
    }
    mutateCanvas({ ...canvas, width: nextWidth, height: nextHeight });
    setZoomMode("fit");
    setResizeOpen(false);
  };

  const saveHint = saving ? "保存中…" : dirty ? "未保存" : work?.status === "PUBLISHED" ? "已发布" : "已保存至云端";

  return (
    <div className="editor-page">
      <header className="editor-chrome">
        <div className="editor-chrome-left">
          <button type="button" className="editor-icon-btn" aria-label="返回首页" onClick={() => navigate("/")}>
            <HomeOutlined aria-hidden />
          </button>
          <Dropdown
            menu={{
              items: [{ key: "home", label: "返回首页" }],
              onClick: () => navigate("/"),
            }}
          >
            <button type="button" className="editor-file-btn">
              文件
              <DownOutlined aria-hidden />
            </button>
          </Dropdown>
          <span className="editor-save-status">
            <CloudOutlined aria-hidden />
            {saveHint}
          </span>
          <label className="editor-filename">
            <input
              aria-label="作品名称"
              value={title}
              maxLength={128}
              onChange={(event) => {
                setTitle(event.target.value);
                setDirty(true);
              }}
            />
            <DownOutlined aria-hidden />
          </label>
          <button type="button" className="editor-icon-btn" aria-label="撤销" disabled={!past.length} onClick={undo}>
            <UndoOutlined aria-hidden />
          </button>
          <button type="button" className="editor-icon-btn" aria-label="重做" disabled={!future.length} onClick={redo}>
            <RedoOutlined aria-hidden />
          </button>
        </div>
        <div className="editor-chrome-right">
          <div className="editor-promo">仅8元/月起</div>
          <button type="button" className="editor-icon-btn" aria-label="版权" onClick={() => message.info("功能开发中")}>
            <CopyrightOutlined aria-hidden />
          </button>
          <Button className="editor-publish" onClick={handlePublish}>
            发布
          </Button>
          <button type="button" className="editor-ai-btn" onClick={() => message.info("功能开发中")}>
            <RobotOutlined aria-hidden />
            AI 对话
          </button>
          <Button type="primary" className="editor-export" onClick={() => message.info("导出功能开发中")}>
            导出
          </Button>
          <button type="button" className="editor-icon-btn" aria-label="更多" onClick={() => message.info("功能开发中")}>
            <EllipsisOutlined aria-hidden />
          </button>
        </div>
      </header>

      <div className="editor-workspace">
        <aside className="editor-rail" aria-label="编辑工具">
          {LEFT_TOOLS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                type="button"
                key={item.id}
                className={`editor-rail-item ${item.id === "add" && addPanelOpen ? "is-add-open" : ""} ${activeTool === item.id && !(item.id === "add" && addPanelOpen) ? "is-active" : ""}`}
                onClick={() => handleTool(item.id)}
              >
                {item.id === "add" ? (
                  <AddToolIcon filled={addPanelOpen} />
                ) : Icon ? (
                  <Icon aria-hidden />
                ) : (
                  <BackgroundToolIcon />
                )}
                <span>{item.label}</span>
              </button>
            );
          })}
        </aside>

        <EditorAddPanel open={addPanelOpen} onClose={() => setAddPanelOpen(false)} onSelect={handleAddSelect} />

        <Spin spinning={loading} wrapperClassName="editor-stage-spin">
          <div className="editor-stage-wrap">
            <div className="editor-canvas-area" ref={stageRef} onClick={() => { setSelectedId(null); setEditingId(null); }}>
              <div
                className="editor-stage-frame"
                style={{
                  width: canvas.width * zoom,
                  height: canvas.height * zoom,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  className="editor-artboard"
                  style={{
                    width: canvas.width,
                    height: canvas.height,
                    transform: `scale(${zoom})`,
                  }}
                  onClick={() => {
                    setSelectedId(null);
                    setEditingId(null);
                  }}
                >
                  <div
                    className="editor-artboard-fill"
                    style={{
                      background: canvas.background,
                      opacity: canvas.backgroundOpacity / 100,
                    }}
                  />
                  {canvas.elements.map((item) => (
                    <div
                      key={item.id}
                      className={`editor-el ${item.type === "text" ? "is-text" : ""} ${selectedId === item.id ? "is-selected" : ""} ${editingId === item.id ? "is-editing" : ""} ${item.locked ? "is-locked" : ""}`}
                      style={{
                        left: item.x,
                        top: item.y,
                        width: item.width,
                        height: item.height,
                        ...(item.type === "text"
                          ? textElementStyle(item)
                          : { background: item.fill, color: item.color }),
                      }}
                      onPointerDown={(event) => beginMove(event, item)}
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(item.id);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(item.id);
                        if (item.type === "text" && !item.locked) setEditingId(item.id);
                      }}
                    >
                      {item.type === "text" && editingId !== item.id ? (
                        <span className="editor-el-copy">{formatTextContent(item)}</span>
                      ) : null}
                    </div>
                  ))}
                </div>
                {selected?.type === "text" && editingId === selected.id ? (
                  <textarea
                    className="editor-inline-text"
                    aria-label="编辑文字"
                    name="canvas-text"
                    autoComplete="off"
                    value={selected.text}
                    autoFocus
                    style={{
                      left: selected.x * zoom,
                      top: selected.y * zoom,
                      minWidth: Math.max(80, (selected.fontSize || 16) * zoom + 16),
                      maxWidth: TEXT_BOX_MAX_WIDTH * zoom,
                      width:
                        selected.autoWidth === false
                          ? Math.max(80, selected.width * zoom)
                          : "max-content",
                      minHeight: Math.max(
                        36,
                        (selected.fontSize || 16) * (Number(selected.lineHeight) || 1.4) * zoom + 16,
                        selected.height * zoom,
                      ),
                      height: "auto",
                      ...textPaintStyle(selected),
                      fontSize: Math.max(12, (selected.fontSize || 16) * zoom),
                      letterSpacing: `${(Number(selected.letterSpacing) || 0) * zoom}px`,
                      overflow: "visible",
                      transform: "none",
                    }}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => patchSelected({ text: event.target.value })}
                    onBlur={finishTextEdit}
                  />
                ) : null}
                {selected && editingId !== selected.id ? (
                  <div
                    className="editor-transform"
                    role="group"
                    aria-label="拖拽图层"
                    style={{
                      left: selected.x * zoom,
                      top: selected.y * zoom,
                      width: selected.width * zoom,
                      height: selected.height * zoom,
                    }}
                    onPointerDown={(event) => beginMove(event, selected)}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (selected.type === "text" && !selected.locked) setEditingId(selected.id);
                    }}
                  >
                    {selected.locked
                      ? null
                      : TRANSFORM_HANDLES.map((handle) => (
                          <button
                            type="button"
                            key={handle.id}
                            className={`editor-handle is-${handle.id}`}
                            aria-label={`缩放 ${handle.label}`}
                            onPointerDown={(event) => beginResize(event, handle.id)}
                          />
                        ))}
                    {selected.locked ? null : (
                      <button
                        type="button"
                        className="editor-el-delete"
                        aria-label="从画布删除"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteSelected();
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                      >
                        <DeleteOutlined aria-hidden />
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="editor-dock editor-dock-left">
              <BlockOutlined aria-hidden />
              <span>画板 1/1</span>
              <DownOutlined aria-hidden />
            </div>
            <div className="editor-dock editor-dock-right">
              <Dropdown
                menu={{
                  items: [
                    { key: "fit", label: "适应画布" },
                    { key: "0.5", label: "50%" },
                    { key: "1", label: "100%" },
                    { key: "1.5", label: "150%" },
                  ],
                  onClick: ({ key }) => setZoomMode(key === "fit" ? "fit" : Number(key)),
                }}
              >
                <button type="button" className="editor-zoom-btn" aria-label="缩放">
                  {zoomLabel}
                  <DownOutlined aria-hidden />
                </button>
              </Dropdown>
              <button
                type="button"
                className="editor-help-btn"
                aria-label="帮助"
                onClick={() => message.info("功能开发中")}
              >
                <QuestionCircleOutlined aria-hidden />
              </button>
            </div>
          </div>
        </Spin>

        <aside className="editor-props">
          {selected?.type === "text" ? (
            <EditorTextPanel
              item={selected}
              onChange={patchSelected}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onEmptyText={deleteSelected}
              onLayer={(direction) => mutateCanvas(moveElementLayer(canvas, selected.id, direction))}
            />
          ) : selected?.type === "rect" ? (
            <>
              <div className="editor-props-head">
                <h2>图形</h2>
                <div className="editor-props-actions">
                  <button type="button" aria-label="删除图层" onClick={deleteSelected}>
                    <DeleteOutlined aria-hidden />
                  </button>
                </div>
              </div>
              <div className="editor-prop-label">
                <h3>填充色</h3>
                <label className="editor-color">
                  <input
                    type="color"
                    aria-label="填充色"
                    value={selected.fill}
                    onChange={(event) => patchSelected({ fill: event.target.value })}
                  />
                </label>
              </div>
            </>
          ) : (
            <>
              <div className="editor-props-head">
                <h2>画板</h2>
                <div className="editor-props-actions">
                  <button type="button" aria-label="复制画板" onClick={() => message.info("功能开发中")}>
                    <CopyOutlined aria-hidden />
                  </button>
                  <button type="button" aria-label="新增画板" onClick={() => message.info("功能开发中")}>
                    <PlusOutlined aria-hidden />
                  </button>
                  <button type="button" aria-label="删除画板" onClick={() => message.info("功能开发中")}>
                    <DeleteOutlined aria-hidden />
                  </button>
                </div>
              </div>

              <section className="editor-prop-block">
                <div className="editor-prop-label">
                  <span>尺寸</span>
                  <strong>
                    {canvas.width} × {canvas.height} px
                  </strong>
                </div>
                <div className="editor-prop-row">
                  <button type="button" className="editor-prop-btn" onClick={openResize}>
                    调整尺寸
                  </button>
                  <button
                    type="button"
                    className="editor-prop-btn"
                    onClick={() => message.info("尺寸延展为会员功能")}
                  >
                    尺寸延展
                    <svg className="editor-vip-crown" viewBox="0 0 16 16" aria-hidden="true">
                      <path fill="#E6B325" d="M2.2 12.4h11.6L12 6.2 8 9.1 4 6.2 2.2 12.4Z" />
                      <circle cx="2.4" cy="5.4" r="1.2" fill="#F5D76E" />
                      <circle cx="8" cy="4.4" r="1.2" fill="#F5D76E" />
                      <circle cx="13.6" cy="5.4" r="1.2" fill="#F5D76E" />
                    </svg>
                  </button>
                </div>
                {resizeOpen ? (
                  <div className="editor-resize-pop">
                    <label className="editor-resize-field">
                      宽
                      <input
                        aria-label="宽"
                        inputMode="numeric"
                        value={resizeWidth}
                        onChange={(event) => setResizeWidth(event.target.value.replace(/[^\d]/g, ""))}
                      />
                    </label>
                    <label className="editor-resize-field">
                      高
                      <input
                        aria-label="高"
                        inputMode="numeric"
                        value={resizeHeight}
                        onChange={(event) => setResizeHeight(event.target.value.replace(/[^\d]/g, ""))}
                      />
                    </label>
                    <button type="button" className="editor-resize-apply" onClick={applyResize}>
                      应用
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="editor-prop-block">
                <h3>背景图</h3>
                <div className="editor-prop-row">
                  <button type="button" className="editor-prop-btn" onClick={() => message.info("功能开发中")}>
                    <UploadOutlined aria-hidden />
                    上传图片
                  </button>
                  <button type="button" className="editor-prop-btn" onClick={() => message.info("功能开发中")}>
                    背景
                  </button>
                </div>
              </section>

              <section className="editor-prop-block">
                <div className="editor-prop-label">
                  <h3>背景色</h3>
                  <label className="editor-color">
                    <input
                      type="color"
                      aria-label="背景色"
                      value={canvas.background}
                      onChange={(event) => mutateCanvas({ ...canvas, background: event.target.value })}
                    />
                  </label>
                </div>
                <div className="editor-opacity">
                  <span>不透明度</span>
                  <Slider
                    min={0}
                    max={100}
                    value={canvas.backgroundOpacity}
                    onChange={(value) => {
                      setCanvas((current) => ({ ...current, backgroundOpacity: value }));
                      setDirty(true);
                    }}
                  />
                  <em>{canvas.backgroundOpacity}</em>
                </div>
              </section>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
