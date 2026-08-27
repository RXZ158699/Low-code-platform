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
  PlusCircleOutlined,
  PlusOutlined,
  QuestionCircleOutlined,
  RedoOutlined,
  RobotOutlined,
  TeamOutlined,
  UndoOutlined,
  UploadOutlined,
  UserOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
} from "@ant-design/icons";
import { useNavigate, useParams } from "react-router-dom";
import {
  getWork,
  publishWork,
  saveDraft,
  updateWork,
} from "../api/works.js";
import { uploadAsset } from "../api/assets.js";
import { getShare, updateShare } from "../api/shares.js";
import {
  addCollageElement,
  fillCollageCells,
  setCollageCellSrc,
  collageCellOffset,
  panCollageCell,
  addMediaElement,
  addShapeElement,
  addTextElement,
  applyHandleResize,
  applyTextHandleResize,
  applyTextStyle,
  boxFromDrag,
  canvasBackgroundStyle,
  DEFAULT_LINE_FILL,
  DEFAULT_SHAPE_FILL,
  duplicateElement,
  getSelectionRects,
  getTextGlyphs,
  hitTestTextOffset,
  isBlankText,
  isCollageElement,
  isCornerHandle,
  isLineKind,
  isMediaElement,
  isShapeElement,
  isShapeKind,
  isSpanStylePatch,
  isTextAutoWidth,
  itemForStylePanel,
  lineBounds,
  lineFromPoints,
  getLineProps,
  setLineEndpoint,
  MIN_ELEMENT_SIZE,
  SHAPE_LABELS,
  shapeKind,
  SPAN_STYLE_KEYS,
  moveElementLayer,
  parseCanvas,
  patchTextElement,
  pointerAngle,
  removeElement,
  clearCanvasElements,
  resizeCanvas,
  rotateFromDrag,
  snapMoveRect,
  snapResizeRect,
  SNAP_GUIDE_DISTANCE,
  stringifyCanvas,
  textElementStyle,
  TRANSFORM_HANDLES,
  updateElement,
  clampCanvasZoom,
  elementRotateStyle,
  fitTextBox,
  zoomByWheelDelta,
} from "../canvas.js";
import CanvasCollage from "../components/CanvasCollage.jsx";
import CanvasMedia from "../components/CanvasMedia.jsx";
import CanvasShape from "../components/CanvasShape.jsx";
import EditorAddPanel from "../components/EditorAddPanel.jsx";
import EditorLibraryPanel from "../components/EditorLibraryPanel.jsx";
import EditorBackgroundPanel from "../components/EditorBackgroundPanel.jsx";
import { applyCatalogCanvas } from "../components/TemplateShowcase.jsx";
import EditorMaterialPanel from "../components/EditorMaterialPanel.jsx";
import EditorCollagePanel from "../components/EditorCollagePanel.jsx";
import EditorColorPicker from "../components/EditorColorPicker.jsx";
import EditorLinePanel from "../components/EditorLinePanel.jsx";
import EditorShapePanel from "../components/EditorShapePanel.jsx";
import EditorTextPanel from "../components/EditorTextPanel.jsx";
import EditorTextPickerPanel from "../components/EditorTextPickerPanel.jsx";
import SelectResourceModal from "../components/SelectResourceModal.jsx";
import CanvasTextCopy from "../components/CanvasTextCopy.jsx";
import { canvasPreviewBlob } from "../canvasPreview.js";
import { mediaKind, readMediaSize } from "../mediaFile.js";
import { collageCellBoxes } from "../collageLayouts.js";

const LINE_SELECT_GAP = 8;
const LIBRARY_TOOLS = new Set(["template", "image", "mine", "team"]);

const LEFT_TOOLS = [
  { id: "add", label: "添加", icon: PlusCircleOutlined },
  { id: "template", label: "模板", icon: AppstoreOutlined },
  { id: "material", label: "素材", icon: BlockOutlined },
  { id: "text", label: "文字", icon: FontSizeOutlined },
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
        <path
          d="M12 7v10M7 12h10"
          stroke="#fff"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

function BackgroundToolIcon() {
  return (
    <span className="editor-rail-bg-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="20" height="20">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="3"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M5 19 19 5" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M9 19 19 9"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.45"
        />
        <path
          d="M5 15 15 5"
          stroke="currentColor"
          strokeWidth="1.2"
          opacity="0.45"
        />
      </svg>
    </span>
  );
}

function isEditorChrome(target, propsEl) {
  if (!target) return false;
  if (propsEl?.contains(target)) return true;
  return Boolean(
    typeof target.closest === "function" &&
    target.closest(
      ".ant-color-picker, .ant-popover, .ant-select-dropdown, .ant-dropdown, .ant-slider-tooltip",
    ),
  );
}

function parseSize(value) {
  const number = Number(String(value).replace(/[^\d]/g, ""));
  return Number.isInteger(number) && number > 0 ? number : 0;
}

export default function WorkEditorPage({ shareToken, shareCode } = {}) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { message } = AntdApp.useApp();
  const stageRef = useRef(null);
  const shareMode = Boolean(shareToken);
  const sourceKey = shareToken || id;
  const [work, setWork] = useState(null);
  const [title, setTitle] = useState("");
  const [canvas, setCanvas] = useState(() => parseCanvas(null));
  const [selectedId, setSelectedId] = useState(null);
  const [boardSelected, setBoardSelected] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [textRange, setTextRange] = useState(null);
  const textRangeRef = useRef(null);
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
  const [drawTool, setDrawTool] = useState(null);
  const [drawDraft, setDrawDraft] = useState(null);
  const [snapGuides, setSnapGuides] = useState({ vertical: [], horizontal: [] });
  const [resourceTarget, setResourceTarget] = useState(null);
  const dragRef = useRef(null);
  const canvasRef = useRef(canvas);
  const propsRef = useRef(null);
  const loading = loadedId !== String(sourceKey);

  useEffect(() => {
    let cancelled = false;
    const request = shareToken ? getShare(shareToken, shareCode) : getWork(id);
    request
      .then((data) => {
        if (cancelled) return;
        setWork(data);
        setTitle(data.title || "未命名作品");
        setCanvas(parseCanvas(data.canvasJson));
        setSelectedId(null);
        setBoardSelected(false);
        setEditingId(null);
        setTextRange(null);
        setDirty(false);
        setPast([]);
        setFuture([]);
        setLoadedId(String(sourceKey));
        if (!shareToken && id) {
          updateWork(id, {})
            .then((touched) => {
              if (!cancelled && touched) {
                setWork((prev) => ({ ...prev, ...touched }));
              }
            })
            .catch(() => {
              /* opening the editor still works if the timestamp touch fails */
            });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          message.error(err.message || "作品加载失败");
          setLoadedId(String(sourceKey));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id, shareToken, shareCode, sourceKey, message]);

  useEffect(() => {
    if (!dirty || !sourceKey) return undefined;
    const timer = window.setTimeout(async () => {
      setSaving(true);
      const payload = { title, canvasJson: stringifyCanvas(canvas) };
      try {
        const saved = shareToken
          ? await updateShare(shareToken, payload, shareCode)
          : await saveDraft(id, payload);
        setWork(saved);
        setDirty(false);
      } catch (err) {
        message.error(err.message || "自动保存失败");
        setSaving(false);
        return;
      }
      setSaving(false);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [canvas, title, dirty, id, shareToken, shareCode, sourceKey, message]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => {
      setStageBox({
        width: el.clientWidth || 960,
        height: el.clientHeight || 640,
      });
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
  const selectedLine =
    selected && isLineKind(shapeKind(selected)) ? getLineProps(selected) : null;

  const fitZoom = Math.max(
    0.05,
    Math.min(
      1,
      (stageBox.width - 96) / canvas.width,
      (stageBox.height - 96) / canvas.height,
    ),
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
    textRangeRef.current = textRange;
  }, [textRange]);

  const snapGuidePixels = (guides, scale) => {
    const area = stageRef.current;
    const frame = area?.querySelector(".editor-stage-frame");
    let offsetX = 0;
    let offsetY = 0;
    if (area && frame) {
      const areaRect = area.getBoundingClientRect();
      const frameRect = frame.getBoundingClientRect();
      offsetX = frameRect.left - areaRect.left;
      offsetY = frameRect.top - areaRect.top;
    }
    return {
      vertical: guides.vertical.map((line) => offsetX + line * scale),
      horizontal: guides.horizontal.map((line) => offsetY + line * scale),
    };
  };

  useEffect(() => {
    if (!editingId) return undefined;
    const handleMouseDown = (event) => {
      if (!isEditorChrome(event.target, propsRef.current)) return;
      if (
        event.target.closest(
          "input, textarea, select, [contenteditable='true']",
        )
      )
        return;
      event.preventDefault();
    };
    window.addEventListener("mousedown", handleMouseDown, true);
    return () => window.removeEventListener("mousedown", handleMouseDown, true);
  }, [editingId]);

  useEffect(() => {
    const handlePointerMove = (event) => {
      const drag = dragRef.current;
      if (!drag) return;
      if (drag.type === "draw-shape") {
        const bounds = drag.bounds;
        const x =
          ((event.clientX - bounds.left) / Math.max(1, bounds.width)) *
          drag.canvasWidth;
        const y =
          ((event.clientY - bounds.top) / Math.max(1, bounds.height)) *
          drag.canvasHeight;
        const live = isLineKind(drag.kind)
          ? lineFromPoints(drag.origin.x, drag.origin.y, x, y, 0) || {
              ...lineBounds(
                drag.origin.x,
                drag.origin.y,
                drag.origin.x,
                drag.origin.y,
              ),
              x1: drag.origin.x,
              y1: drag.origin.y,
              x2: drag.origin.x,
              y2: drag.origin.y,
            }
          : boxFromDrag(drag.origin.x, drag.origin.y, x, y, 0, true) || {
              x: drag.origin.x,
              y: drag.origin.y,
              width: 0,
              height: 0,
            };
        drag.box = isLineKind(drag.kind)
          ? lineFromPoints(drag.origin.x, drag.origin.y, x, y)
          : boxFromDrag(drag.origin.x, drag.origin.y, x, y, 3, true);
        setDrawDraft({
          id: "draw-draft",
          type: "shape",
          kind: drag.kind,
          fill: drag.fill,
          strokeWidth: isLineKind(drag.kind) ? 1 : undefined,
          ...live,
        });
        return;
      }
      if (drag.type === "rotate") {
        const currentAngle = pointerAngle(
          drag.cx,
          drag.cy,
          event.clientX,
          event.clientY,
        );
        setCanvas((current) =>
          updateElement(current, drag.id, {
            rotate: rotateFromDrag(
              drag.startRotate,
              drag.startAngle,
              currentAngle,
            ),
          }),
        );
        return;
      }
      const scale = zoomRef.current || 1;
      const dx = (event.clientX - drag.start.px) / scale;
      const dy = (event.clientY - drag.start.py) / scale;
      if (drag.type === "resize-canvas") {
        setCanvas(resizeCanvas(drag.snapshot, drag.handle, dx, dy));
        return;
      }
      if (drag.type === "move") {
        const currentCanvas = canvasRef.current;
        const isLineMove = Number.isFinite(drag.start.x1);
        const proposed = isLineMove
          ? {
              x: Math.min(drag.start.x1, drag.start.x2) + dx,
              y: Math.min(drag.start.y1, drag.start.y2) + dy,
              width: Math.abs(drag.start.x2 - drag.start.x1),
              height: Math.abs(drag.start.y2 - drag.start.y1),
            }
          : {
              x: drag.start.x + dx,
              y: drag.start.y + dy,
              width: drag.start.width,
              height: drag.start.height,
            };
        const snapped = snapMoveRect(
          proposed,
          currentCanvas.width,
          currentCanvas.height,
        );
        setSnapGuides(snapGuidePixels(snapped.guides, scale));
        const ox = snapped.x - proposed.x;
        const oy = snapped.y - proposed.y;
        const patch = {
          x: drag.start.x + dx + ox,
          y: drag.start.y + dy + oy,
        };
        if (isLineMove) {
          patch.x1 = drag.start.x1 + dx + ox;
          patch.y1 = drag.start.y1 + dy + oy;
          patch.x2 = drag.start.x2 + dx + ox;
          patch.y2 = drag.start.y2 + dy + oy;
        }
        setCanvas((current) => updateElement(current, drag.id, patch));
        return;
      }
      if (drag.type === "collage-pan") {
        setCanvas((current) => {
          const live = current.elements.find((entry) => entry.id === drag.id);
          if (!isCollageElement(live)) return current;
          return updateElement(
            current,
            drag.id,
            panCollageCell(live, drag.cellIndex, drag.start, dx, dy, {
              width: drag.start.boxWidth,
              height: drag.start.boxHeight,
            }),
          );
        });
        return;
      }
      if (drag.type === "line-endpoint") {
        const which = drag.which;
        const nextX =
          which === "start" ? drag.start.x1 + dx : drag.start.x2 + dx;
        const nextY =
          which === "start" ? drag.start.y1 + dy : drag.start.y2 + dy;
        setCanvas((current) =>
          updateElement(current, drag.id, setLineEndpoint(drag.start, which, nextX, nextY)),
        );
        return;
      }
      if (drag.type === "select-text") {
        const item = canvasRef.current.elements.find(
          (entry) => entry.id === drag.id,
        );
        if (!item || !drag.bounds) return;
        const localX =
          ((event.clientX - drag.bounds.left) /
            Math.max(1, drag.bounds.width)) *
          drag.boxWidth;
        const localY =
          ((event.clientY - drag.bounds.top) /
            Math.max(1, drag.bounds.height)) *
          drag.boxHeight;
        const offset = hitTestTextOffset(item, localX, localY);
        const start = Math.min(drag.anchor, offset);
        const end = Math.max(drag.anchor, offset);
        setTextRange(end > start ? { start, end } : null);
        return;
      }
      const liveItem = canvasRef.current.elements.find(
        (item) => item.id === drag.id,
      );
      if (isLineKind(shapeKind(liveItem || drag.start))) return;
      const minSize = MIN_ELEMENT_SIZE;
      const box = applyHandleResize(
        drag.start,
        drag.handle,
        dx,
        dy,
        minSize,
        isCornerHandle(drag.handle) || Boolean(drag.start.aspectLocked),
      );
      if (drag.kind === "text") {
        const live =
          canvasRef.current.elements.find((item) => item.id === drag.id) ||
          drag.start;
        const textBox = applyTextHandleResize(
          { ...live, ...drag.start },
          drag.handle,
          dx,
          dy,
        );
        const currentCanvas = canvasRef.current;
        const snapped = snapResizeRect(
          textBox,
          drag.handle,
          currentCanvas.width,
          currentCanvas.height,
        );
        const start = drag.start;
        const changed =
          snapped.x !== textBox.x ||
          snapped.y !== textBox.y ||
          snapped.width !== textBox.width ||
          snapped.height !== textBox.height;
        let nextBox = {
          x: snapped.x,
          y: snapped.y,
          width: snapped.width,
          height: snapped.height,
          fontSize: textBox.fontSize,
          autoWidth: false,
        };
        if (changed && isCornerHandle(drag.handle)) {
          const widthDriven = snapped.width !== textBox.width;
          const scale = widthDriven
            ? snapped.width / Math.max(1, textBox.width)
            : snapped.height / Math.max(1, textBox.height);
          const width = widthDriven ? snapped.width : textBox.width * scale;
          const fontSize = Math.max(
            8,
            Math.round((start.fontSize || 16) * scale),
          );
          const fitted = fitTextBox({
            ...live,
            ...start,
            width,
            fontSize,
            autoWidth: false,
          });
          nextBox = {
            x: snapped.x,
            y: snapped.y,
            width,
            height: fitted.height,
            fontSize,
            autoWidth: false,
          };
        } else if (
          changed &&
          (drag.handle.includes("e") || drag.handle.includes("w"))
        ) {
          const fitted = fitTextBox({
            ...live,
            ...start,
            width: snapped.width,
            autoWidth: false,
          });
          nextBox.height = fitted.height;
        }
        setSnapGuides(
          snapGuidePixels(
            {
              vertical: snapped.guides.vertical.filter((line) =>
                Math.abs(
                  (drag.handle.includes("w") ? nextBox.x : nextBox.x + nextBox.width) -
                    line,
                ) < 1e-9,
              ),
              horizontal: snapped.guides.horizontal.filter((line) =>
                Math.abs(
                  (drag.handle.includes("n") ? nextBox.y : nextBox.y + nextBox.height) -
                    line,
                ) < 1e-9,
              ),
            },
            scale,
          ),
        );
        setCanvas((current) =>
          updateElement(current, drag.id, nextBox),
        );
        return;
      }
      const currentCanvas = canvasRef.current;
      const snapped = snapResizeRect(
        box,
        drag.handle,
        currentCanvas.width,
        currentCanvas.height,
        SNAP_GUIDE_DISTANCE,
        minSize,
        isCornerHandle(drag.handle) || Boolean(drag.start.aspectLocked),
      );
      setSnapGuides(snapGuidePixels(snapped.guides, scale));
      setCanvas((current) =>
        updateElement(current, drag.id, {
          x: snapped.x,
          y: snapped.y,
          width: snapped.width,
          height: snapped.height,
        }),
      );
    };
    const handlePointerUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      setSnapGuides({ vertical: [], horizontal: [] });
      if (drag.type === "select-text") return;
      if (drag.type === "resize-canvas") {
        const current = canvasRef.current;
        const origin = drag.snapshot;
        if (current.width === origin.width && current.height === origin.height)
          return;
        setPast((value) => [...value, origin].slice(-40));
        setFuture([]);
        setDirty(true);
        return;
      }
      if (drag.type === "draw-shape") {
        setDrawDraft(null);
        if (!drag.box) return;
        const next = addShapeElement(canvasRef.current, drag.kind, {
          ...(isLineKind(drag.kind)
            ? {
                x1: drag.box.x1,
                y1: drag.box.y1,
                x2: drag.box.x2,
                y2: drag.box.y2,
              }
            : {
                x: drag.box.x,
                y: drag.box.y,
                width: Math.max(MIN_ELEMENT_SIZE, drag.box.width),
                height: Math.max(MIN_ELEMENT_SIZE, drag.box.height),
              }),
          fill: drag.fill,
        });
        const created = next.elements[next.elements.length - 1];
        setPast((value) => [...value, drag.snapshot].slice(-40));
        setFuture([]);
        setCanvas(next);
        setSelectedId(created.id);
        setBoardSelected(false);
        setDrawTool(null);
        setDirty(true);
        return;
      }
      const current = canvasRef.current.elements.find(
        (item) => item.id === drag.id,
      );
      const origin = drag.snapshot.elements.find((item) => item.id === drag.id);
      if (drag.type === "collage-pan") {
        const currentCell = current?.cells?.[drag.cellIndex];
        const originCell = origin?.cells?.[drag.cellIndex];
        const now = collageCellOffset(currentCell);
        const before = collageCellOffset(originCell);
        if (now.ox === before.ox && now.oy === before.oy) return;
        setPast((value) => [...value, drag.snapshot].slice(-40));
        setFuture([]);
        setDirty(true);
        return;
      }
      if (
        current &&
        origin &&
        current.x === origin.x &&
        current.y === origin.y &&
        current.width === origin.width &&
        current.height === origin.height &&
        current.x1 === origin.x1 &&
        current.y1 === origin.y1 &&
        current.x2 === origin.x2 &&
        current.y2 === origin.y2 &&
        current.rotate === origin.rotate
      ) {
        return;
      }
      setPast((value) => [...value, drag.snapshot].slice(-40));
      setFuture([]);
      setDirty(true);
    };
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
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
    window.addEventListener("wheel", handleWheel, {
      passive: false,
      capture: true,
    });
    return () =>
      window.removeEventListener("wheel", handleWheel, { capture: true });
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
      if (item?.type !== "text")
        return updateElement(current, selectedId, patch);
      if (isSpanStylePatch(patch)) {
        const stylePatch = applyTextStyle(item, textRangeRef.current, patch);
        const rest = { ...patch };
        for (const key of SPAN_STYLE_KEYS) {
          if (!Object.prototype.hasOwnProperty.call(stylePatch, key))
            delete rest[key];
        }
        return updateElement(
          current,
          selectedId,
          patchTextElement(item, { ...rest, ...stylePatch }),
        );
      }
      const nextPatch = patchTextElement(item, patch);
      return updateElement(current, selectedId, nextPatch);
    });
    setDirty(true);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    mutateCanvas(removeElement(canvas, selectedId));
    setSelectedId(null);
    setBoardSelected(true);
    setEditingId(null);
    setTextRange(null);
  };

  const clearBoardElements = () => {
    if (!canvas.elements.length) return;
    mutateCanvas(clearCanvasElements(canvas));
    setSelectedId(null);
    setBoardSelected(true);
    setEditingId(null);
    setTextRange(null);
  };

  const selectBoard = () => {
    if (drawTool) return;
    setSelectedId(null);
    setBoardSelected(true);
    setEditingId(null);
    setTextRange(null);
  };

  const finishTextEdit = (event) => {
    if (isEditorChrome(event?.relatedTarget, propsRef.current)) return;
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
    setBoardSelected(false);
    setEditingId(null);
    setTextRange(null);
  };

  const localPoint = (event, item, target) => {
    const bounds = target.getBoundingClientRect();
    return {
      bounds,
      x:
        ((event.clientX - bounds.left) / Math.max(1, bounds.width)) *
        item.width,
      y:
        ((event.clientY - bounds.top) / Math.max(1, bounds.height)) *
        item.height,
    };
  };

  const beginCollagePan = (event, item, cellIndex) => {
    if (event.button !== 0 || item.locked) return;
    const cell = item.cells?.[cellIndex];
    if (!cell?.src) return;
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(item.id);
    setBoardSelected(false);
    setEditingId(null);
    const offset = collageCellOffset(cell);
    const box = collageCellBoxes(item)[cellIndex] || {};
    dragRef.current = {
      type: "collage-pan",
      id: item.id,
      cellIndex,
      start: {
        ox: offset.ox,
        oy: offset.oy,
        px: event.clientX,
        py: event.clientY,
        boxWidth: box.width || item.width,
        boxHeight: box.height || item.height,
      },
      snapshot: canvasRef.current,
    };
  };

  const beginMove = (event, item) => {
    if (event.button !== 0 || editingId === item.id) return;
    event.preventDefault();
    event.stopPropagation();
    const alreadySelected = selectedId === item.id;
    setSelectedId(item.id);
    setBoardSelected(false);
    setEditingId(null);
    if (!alreadySelected) setTextRange(null);
    if (item.locked) return;
    if (alreadySelected && item.type === "text") {
      const local = localPoint(event, item, event.currentTarget);
      const hit = getTextGlyphs(item).some(
        (glyph) =>
          local.x >= glyph.x &&
          local.x <= glyph.x + glyph.width &&
          local.y >= glyph.y &&
          local.y <= glyph.y + glyph.height,
      );
      if (hit) {
        dragRef.current = {
          type: "select-text",
          id: item.id,
          anchor: hitTestTextOffset(item, local.x, local.y),
          bounds: local.bounds,
          boxWidth: item.width,
          boxHeight: item.height,
          start: { px: event.clientX, py: event.clientY },
          snapshot: canvasRef.current,
        };
        setTextRange(null);
        return;
      }
    }
    dragRef.current = {
      type: "move",
      id: item.id,
      kind: item.type,
      start: {
        x: item.x,
        y: item.y,
        width: item.width,
        height: item.height,
        x1: item.x1,
        y1: item.y1,
        x2: item.x2,
        y2: item.y2,
        fontSize: item.fontSize,
        px: event.clientX,
        py: event.clientY,
      },
      snapshot: canvasRef.current,
    };
  };

  const beginLineEndpoint = (event, which) => {
    if (event.button !== 0 || !selected || selected.locked) return;
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = {
      type: "line-endpoint",
      id: selected.id,
      which,
      start: {
        x: selected.x,
        y: selected.y,
        width: selected.width,
        height: selected.height,
        x1: selected.x1,
        y1: selected.y1,
        x2: selected.x2,
        y2: selected.y2,
        strokeWidth: selected.strokeWidth,
        px: event.clientX,
        py: event.clientY,
      },
      snapshot: canvasRef.current,
    };
  };

  const beginResize = (event, handle) => {
    if (
      event.button !== 0 ||
      !selected ||
      selected.locked ||
      isLineKind(shapeKind(selected))
    )
      return;
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
        aspectLocked: selected.aspectLocked,
        px: event.clientX,
        py: event.clientY,
      },
      snapshot: canvasRef.current,
    };
  };

  const beginRotate = (event) => {
    if (event.button !== 0 || !selected || selected.locked) return;
    event.preventDefault();
    event.stopPropagation();
    const frame = event.currentTarget.closest(".editor-stage-frame");
    const bounds = frame?.getBoundingClientRect();
    if (!bounds) return;
    const scaleX = bounds.width / Math.max(1, canvasRef.current.width);
    const scaleY = bounds.height / Math.max(1, canvasRef.current.height);
    const cx = bounds.left + (selected.x + selected.width / 2) * scaleX;
    const cy = bounds.top + (selected.y + selected.height / 2) * scaleY;
    dragRef.current = {
      type: "rotate",
      id: selected.id,
      cx,
      cy,
      startAngle: pointerAngle(cx, cy, event.clientX, event.clientY),
      startRotate: Number(selected.rotate) || 0,
      snapshot: canvasRef.current,
    };
  };

  const beginResizeBoard = (event, handle) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    setBoardSelected(true);
    setSelectedId(null);
    setEditingId(null);
    setTextRange(null);
    dragRef.current = {
      type: "resize-canvas",
      handle,
      start: {
        px: event.clientX,
        py: event.clientY,
      },
      snapshot: canvasRef.current,
    };
  };

  const beginDraw = (event) => {
    if (!drawTool || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = event.currentTarget.getBoundingClientRect();
    const canvasWidth = canvasRef.current.width;
    const canvasHeight = canvasRef.current.height;
    const x =
      ((event.clientX - bounds.left) / Math.max(1, bounds.width)) * canvasWidth;
    const y =
      ((event.clientY - bounds.top) / Math.max(1, bounds.height)) *
      canvasHeight;
    const fill = isLineKind(drawTool) ? DEFAULT_LINE_FILL : DEFAULT_SHAPE_FILL;
    dragRef.current = {
      type: "draw-shape",
      kind: drawTool,
      fill,
      bounds,
      canvasWidth,
      canvasHeight,
      origin: { x, y },
      box: null,
      snapshot: canvasRef.current,
    };
    setSelectedId(null);
    setBoardSelected(false);
    setEditingId(null);
    setTextRange(null);
    setDrawDraft({
      id: "draw-draft",
      type: "shape",
      kind: drawTool,
      fill,
      strokeWidth: isLineKind(drawTool) ? 1 : undefined,
      ...(isLineKind(drawTool)
        ? { ...lineBounds(x, y, x, y), x1: x, y1: y, x2: x, y2: y }
        : { x, y, width: 0, height: 0 }),
    });
  };

  const placeElement = (next) => {
    const created = next.elements[next.elements.length - 1];
    mutateCanvas(next);
    setSelectedId(created.id);
    setBoardSelected(false);
    setAddPanelOpen(false);
    setEditingId(null);
    setTextRange(null);
  };

  const placeTextPreset = (next) => {
    const created = next.elements[next.elements.length - 1];
    mutateCanvas(next);
    setSelectedId(created.id);
    setBoardSelected(false);
    setEditingId(null);
    setTextRange(null);
    setActiveTool("");
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && (drawTool || drawDraft)) {
        event.preventDefault();
        dragRef.current = null;
        setDrawTool(null);
        setDrawDraft(null);
        return;
      }
      if (event.key !== "Delete" && event.key !== "Backspace") return;
      if (event.target.closest("input, textarea, [contenteditable='true']"))
        return;
      if (!selectedId || editingId) return;
      event.preventDefault();
      setPast((value) => [...value, canvas].slice(-40));
      setFuture([]);
      setCanvas(removeElement(canvas, selectedId));
      setDirty(true);
      setSelectedId(null);
      setEditingId(null);
      setTextRange(null);
      setBoardSelected(true);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvas, selectedId, editingId, drawTool, drawDraft]);

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
        await saveDraft(id, { title, canvasJson: stringifyCanvas(canvas) });
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
    setDrawTool(null);
    setDrawDraft(null);
    setAddPanelOpen(false);
    if (toolId === "text") {
      setActiveTool((current) => (current === "text" ? "" : "text"));
      return;
    }
    if (LIBRARY_TOOLS.has(toolId)) {
      setActiveTool((current) => (current === toolId ? "" : toolId));
      return;
    }
    if (toolId === "material") {
      setActiveTool((current) => (current === "material" ? "" : "material"));
      return;
    }
    if (toolId === "background") {
      setActiveTool((current) => (current === "background" ? "" : "background"));
      setSelectedId(null);
      setBoardSelected(true);
      setTextRange(null);
      return;
    }
    setActiveTool(toolId);
    message.info("功能开发中");
  };

  const handleLibraryPick = (payload) => {
    if (payload?.kind === "template") {
      const prepared = applyCatalogCanvas(payload.item || {});
      const template = prepared.template;
      let next = parseCanvas(template.jsonData);
      if (next.elements.length === 0 && template.coverImageUrl) {
        next = addMediaElement(next, {
          type: "image",
          src: template.coverImageUrl,
          name: template.title || "模板",
        });
      }
      mutateCanvas(next);
      setSelectedId(null);
      setBoardSelected(true);
      setEditingId(null);
      setTextRange(null);
      return;
    }
    const asset = payload?.item;
    if (!asset?.url) return;
    placeElement(
      addMediaElement(canvas, {
        type: asset.fileType === "video" ? "video" : "image",
        src: asset.url,
        name: asset.fileName || asset.title || "素材",
      }),
    );
  };

  const handleMaterialPick = (payload) => {
    const pattern = payload?.item;
    if (!pattern?.src) return;
    placeElement(
      addMediaElement(canvas, {
        type: "image",
        src: pattern.src,
        name: pattern.name || "图案素材",
        width: pattern.width,
        height: pattern.height,
      }),
    );
    setActiveTool("");
  };

  const handleExport = async () => {
    try {
      const blob = await canvasPreviewBlob(canvas);
      if (!blob) {
        message.error("导出失败");
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${title || "未命名作品"}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      message.success("已导出图片");
    } catch (err) {
      message.error(err.message || "导出失败");
    }
  };

  const handleAddSelect = (action) => {
    if (action.startsWith("shape-")) {
      const kind = action.slice("shape-".length);
      if (isShapeKind(kind)) {
        setDrawDraft(null);
        setDrawTool((current) => (current === kind ? null : kind));
        setAddPanelOpen(false);
        setSelectedId(null);
        setBoardSelected(false);
        setEditingId(null);
        setTextRange(null);
        return;
      }
    }
    setDrawTool(null);
    setDrawDraft(null);
    if (action === "text-more") {
      setAddPanelOpen(false);
      setActiveTool("text");
      return;
    }
    if (action === "text-h1") {
      placeTextPreset(
        addTextElement(canvas, { text: "标题", fontSize: 120, fontWeight: 700 }),
      );
      return;
    }
    if (action === "text-h2") {
      placeTextPreset(addTextElement(canvas, { text: "副标题", fontSize: 70 }));
      return;
    }
    if (action === "text-body") {
      placeTextPreset(addTextElement(canvas, { text: "正文", fontSize: 50 }));
      return;
    }
    if (action === "text-warp") {
      placeTextPreset(
        addTextElement(canvas, {
          text: "变形文字",
          fontSize: 56,
          warp: { type: "arc", strength: 44 },
        }),
      );
      return;
    }
    if (typeof action === "string" && action.startsWith("collage:")) {
      const next = addCollageElement(canvas, action.slice("collage:".length));
      if (next.elements.length === canvas.elements.length) return;
      placeElement(next);
      return;
    }
    message.info("功能开发中");
  };

  const handleCollageImages = async (files) => {
    if (!selectedId) return;
    const picked = Array.from(files || []);
    const images = picked.filter((file) => mediaKind(file) === "image");
    if (images.length === 0) {
      message.error("请选择 jpg / png / webp / gif 图片");
      return;
    }
    if (images.length < picked.length) {
      message.warning("已忽略不支持的文件");
    }
    try {
      const uploaded = await Promise.all(
        images.map(async (file) => {
          const asset = await uploadAsset(file, { fileType: "image" });
          return asset.url;
        }),
      );
      const current = canvasRef.current.elements.find(
        (entry) => entry.id === selectedId,
      );
      if (!isCollageElement(current)) return;
      patchSelected(fillCollageCells(current, uploaded));
    } catch (err) {
      message.error(err.message || "上传失败");
    }
  };

  const openResourcePicker = (collageId, cellIndex) => {
    if (shareMode) return;
    const current = canvasRef.current.elements.find(
      (entry) => entry.id === collageId,
    );
    if (!isCollageElement(current) || current.locked) return;
    setSelectedId(collageId);
    setBoardSelected(false);
    setEditingId(null);
    setResourceTarget({ collageId, cellIndex });
  };

  const applyResourceImage = (src) => {
    if (!resourceTarget?.collageId || !src) return;
    const current = canvasRef.current.elements.find(
      (entry) => entry.id === resourceTarget.collageId,
    );
    if (!isCollageElement(current)) return;
    mutateCanvas(
      updateElement(
        canvasRef.current,
        resourceTarget.collageId,
        setCollageCellSrc(current, resourceTarget.cellIndex, src),
      ),
    );
  };

  const handleLocalFiles = async (files) => {
    const picked = Array.from(files || []);
    const media = picked.filter((file) => mediaKind(file));
    if (media.length === 0) {
      message.error("请选择 jpg / png / webp / gif / mp4 / webm 文件");
      return;
    }
    if (media.length < picked.length) {
      message.warning("已忽略不支持的文件");
    }
    try {
      const uploaded = await Promise.all(
        media.map(async (file) => {
          const kind = mediaKind(file);
          const [asset, size] = await Promise.all([
            uploadAsset(file, { fileType: kind }),
            readMediaSize(file),
          ]);
          return {
            type: kind,
            src: asset.url,
            name: asset.fileName || file.name,
            width: size.width,
            height: size.height,
          };
        }),
      );
      let next = canvasRef.current;
      for (const item of uploaded) {
        next = addMediaElement(next, item);
      }
      const created = next.elements[next.elements.length - 1];
      mutateCanvas(next);
      if (created) setSelectedId(created.id);
      setAddPanelOpen(false);
      setEditingId(null);
      setTextRange(null);
    } catch (err) {
      message.error(err.message || "上传失败");
    }
  };

  const openResize = () => {
    setResizeWidth(String(canvas.width));
    setResizeHeight(String(canvas.height));
    setResizeOpen(true);
  };

  const applyResize = () => {
    const nextWidth = parseSize(resizeWidth);
    const nextHeight = parseSize(resizeHeight);
    if (
      nextWidth < 1 ||
      nextHeight < 1 ||
      nextWidth > 30000 ||
      nextHeight > 30000
    ) {
      message.warning("请输入 1–30000 之间的宽和高");
      return;
    }
    mutateCanvas({ ...canvas, width: nextWidth, height: nextHeight });
    setZoomMode("fit");
    setResizeOpen(false);
  };

  const saveHint = saving
    ? "保存中…"
    : dirty
      ? "未保存"
      : work?.status === "PUBLISHED"
        ? "已发布"
        : work?.status === "ARCHIVED"
          ? "已归档"
        : "已保存至云端";

  return (
    <div className="editor-page">
      <header className="editor-chrome">
        <div className="editor-chrome-left">
          <button
            type="button"
            className="editor-icon-btn"
            aria-label="返回首页"
            onClick={() => navigate("/")}
          >
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
          <button
            type="button"
            className="editor-icon-btn"
            aria-label="撤销"
            disabled={!past.length}
            onClick={undo}
          >
            <UndoOutlined aria-hidden />
          </button>
          <button
            type="button"
            className="editor-icon-btn"
            aria-label="重做"
            disabled={!future.length}
            onClick={redo}
          >
            <RedoOutlined aria-hidden />
          </button>
        </div>
        <div className="editor-chrome-right">
          <div className="editor-promo">仅8元/月起</div>
          <button
            type="button"
            className="editor-icon-btn"
            aria-label="版权"
            onClick={() => message.info("功能开发中")}
          >
            <CopyrightOutlined aria-hidden />
          </button>
          {shareMode ? null : (
            <Button className="editor-publish" onClick={handlePublish}>
              发布
            </Button>
          )}
          <button
            type="button"
            className="editor-ai-btn"
            onClick={() => message.info("功能开发中")}
          >
            <RobotOutlined aria-hidden />
            AI 对话
          </button>
          <Button
            type="primary"
            className="editor-export"
            onClick={handleExport}
          >
            导出
          </Button>
          <button
            type="button"
            className="editor-icon-btn"
            aria-label="更多"
            onClick={() => message.info("功能开发中")}
          >
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

        <EditorAddPanel
          open={addPanelOpen}
          activeShape={drawTool}
          onClose={() => setAddPanelOpen(false)}
          onSelect={handleAddSelect}
          onLocalFiles={handleLocalFiles}
        />

        <EditorTextPickerPanel
          open={activeTool === "text"}
          onClose={() => setActiveTool("")}
          onPick={handleAddSelect}
        />

        <EditorLibraryPanel
          open={LIBRARY_TOOLS.has(activeTool)}
          kind={LIBRARY_TOOLS.has(activeTool) ? activeTool : "template"}
          onClose={() => setActiveTool("")}
          onPick={handleLibraryPick}
        />

        <EditorMaterialPanel
          open={activeTool === "material"}
          onClose={() => setActiveTool("")}
          onPick={handleMaterialPick}
        />

        <EditorBackgroundPanel
          open={activeTool === "background"}
          onClose={() => setActiveTool("")}
          canvas={canvas}
          onChange={(patch) => mutateCanvas({ ...canvas, ...patch })}
        />

        <Spin spinning={loading} wrapperClassName="editor-stage-spin">
          <div className="editor-stage-wrap">
            <div
              className="editor-canvas-area"
              ref={stageRef}
              onClick={() => {
                setSelectedId(null);
                setBoardSelected(false);
                setEditingId(null);
                setTextRange(null);
              }}
            >
              <div
                className="editor-stage-frame"
                style={{
                  width: canvas.width * zoom,
                  height: canvas.height * zoom,
                }}
                onClick={(event) => event.stopPropagation()}
              >
                <div
                  className={`editor-artboard${boardSelected && !selected ? " is-selected" : ""}`}
                  style={{
                    width: canvas.width,
                    height: canvas.height,
                    transform: `scale(${zoom})`,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    selectBoard();
                  }}
                >
                  <div
                    className="editor-artboard-fill"
                    style={{
                      ...canvasBackgroundStyle(canvas),
                      opacity: canvas.backgroundOpacity / 100,
                    }}
                  />
                  {canvas.elements.map((item) => (
                    <div
                      key={item.id}
                      className={`editor-el ${item.type === "text" ? "is-text" : ""} ${isShapeElement(item) ? "is-shape" : ""} ${isLineKind(shapeKind(item)) ? "is-line" : ""} ${isMediaElement(item) ? "is-media" : ""} ${isCollageElement(item) ? "is-collage" : ""} ${item.type === "text" && isTextAutoWidth(item) ? "is-auto-width" : ""} ${selectedId === item.id ? "is-selected" : ""} ${editingId === item.id ? "is-editing" : ""} ${item.locked ? "is-locked" : ""}`}
                      aria-label={
                        isShapeElement(item)
                          ? SHAPE_LABELS[shapeKind(item)]
                          : isCollageElement(item)
                            ? "拼图"
                            : undefined
                      }
                      style={{
                        left: item.x,
                        top: item.y,
                        width: item.width,
                        height: item.height,
                        ...(item.type === "text"
                          ? textElementStyle(item)
                          : isShapeElement(item) ||
                              isMediaElement(item) ||
                              isCollageElement(item)
                            ? elementRotateStyle(item)
                            : { background: item.fill, color: item.color }),
                      }}
                      onPointerDown={(event) => beginMove(event, item)}
                      onClick={(event) => {
                        event.stopPropagation();
                        if (item.id !== selectedId) setTextRange(null);
                        setSelectedId(item.id);
                        setBoardSelected(false);
                      }}
                      onDoubleClick={(event) => {
                        event.stopPropagation();
                        setSelectedId(item.id);
                        setBoardSelected(false);
                        if (item.type === "text" && !item.locked)
                          setEditingId(item.id);
                      }}
                    >
                      {item.type === "text" ? (
                        <span className="editor-el-text-host">
                          <CanvasTextCopy item={item} />
                          {editingId === item.id ? (
                            <textarea
                              className="editor-inline-text"
                              aria-label="编辑文字"
                              name="canvas-text"
                              autoComplete="off"
                              value={item.text}
                              autoFocus
                              onSelect={(event) => {
                                if (event.target !== document.activeElement)
                                  return;
                                const el = event.target;
                                setTextRange(
                                  el.selectionEnd > el.selectionStart
                                    ? {
                                        start: el.selectionStart,
                                        end: el.selectionEnd,
                                      }
                                    : null,
                                );
                              }}
                              onClick={(event) => event.stopPropagation()}
                              onChange={(event) =>
                                patchSelected({ text: event.target.value })
                              }
                              onBlur={finishTextEdit}
                            />
                          ) : null}
                        </span>
                      ) : isShapeElement(item) ? (
                        <CanvasShape item={item} />
                      ) : isCollageElement(item) ? (
                        <CanvasCollage
                          item={item}
                          onCellDoubleClick={
                            shareMode || item.locked
                              ? undefined
                              : (index) => openResourcePicker(item.id, index)
                          }
                          onCellPanStart={
                            shareMode || item.locked
                              ? undefined
                              : (index, event) =>
                                  beginCollagePan(event, item, index)
                          }
                        />
                      ) : isMediaElement(item) ? (
                        <CanvasMedia item={item} />
                      ) : null}
                    </div>
                  ))}
                  {drawDraft ? (
                    <div
                      className="editor-el is-shape is-drawing"
                      style={{
                        left: drawDraft.x,
                        top: drawDraft.y,
                        width: Math.max(0, drawDraft.width),
                        height: Math.max(0, drawDraft.height),
                      }}
                    >
                      <CanvasShape item={drawDraft} />
                    </div>
                  ) : null}
                  {drawTool ? (
                    <div
                      className="editor-draw-layer"
                      role="presentation"
                      aria-label={`在画布上绘制${SHAPE_LABELS[drawTool]}`}
                      onPointerDown={beginDraw}
                      onClick={(event) => event.stopPropagation()}
                    />
                  ) : null}
                </div>
                {boardSelected && !selected ? (
                  <div
                    className="editor-transform is-board"
                    role="group"
                    aria-label="缩放画布"
                    style={{
                      left: 0,
                      top: 0,
                      width: canvas.width * zoom,
                      height: canvas.height * zoom,
                    }}
                  >
                    {TRANSFORM_HANDLES.map((handle) => (
                      <button
                        type="button"
                        key={handle.id}
                        className={`editor-handle is-${handle.id}`}
                        aria-label={`缩放画布 ${handle.label}`}
                        onPointerDown={(event) => beginResizeBoard(event, handle.id)}
                      />
                    ))}
                  </div>
                ) : null}
                {selected && editingId !== selected.id ? (
                  selectedLine ? (
                    <div
                      className="editor-transform is-line"
                      role="group"
                      aria-label="调整线条"
                      style={{
                        left: 0,
                        top: 0,
                        width: canvas.width * zoom,
                        height: canvas.height * zoom,
                      }}
                    >
                      <button
                        type="button"
                        className="editor-line-stroke"
                        aria-label="拖动线条"
                        style={{
                          left: ((selectedLine.x1 + selectedLine.x2) / 2) * zoom,
                          top: ((selectedLine.y1 + selectedLine.y2) / 2) * zoom,
                          width: Math.max(1, selectedLine.length) * zoom + LINE_SELECT_GAP * 2,
                          height:
                            Math.max(selectedLine.strokeWidth, 1) * zoom +
                            LINE_SELECT_GAP * 2,
                          transform: `translate(-50%, -50%) rotate(${Math.atan2(
                            selectedLine.y2 - selectedLine.y1,
                            selectedLine.x2 - selectedLine.x1,
                          )}rad)`,
                        }}
                        onPointerDown={(event) => beginMove(event, selected)}
                      />
                      {selected.locked ? null : (
                        <>
                          <button
                            type="button"
                            className="editor-handle is-line-end"
                            aria-label="拖动起点"
                            style={{
                              left: selectedLine.x1 * zoom,
                              top: selectedLine.y1 * zoom,
                            }}
                            onPointerDown={(event) => beginLineEndpoint(event, "start")}
                          />
                          <button
                            type="button"
                            className="editor-handle is-line-end"
                            aria-label="拖动终点"
                            style={{
                              left: selectedLine.x2 * zoom,
                              top: selectedLine.y2 * zoom,
                            }}
                            onPointerDown={(event) => beginLineEndpoint(event, "end")}
                          />
                          <button
                            type="button"
                            className="editor-el-delete"
                            aria-label="从画布删除"
                            style={{
                              left: Math.max(selectedLine.x1, selectedLine.x2) * zoom,
                              top:
                                (selectedLine.x1 >= selectedLine.x2
                                  ? selectedLine.y1
                                  : selectedLine.y2) * zoom,
                            }}
                            onClick={(event) => {
                              event.stopPropagation();
                              deleteSelected();
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                          >
                            <DeleteOutlined aria-hidden />
                          </button>
                        </>
                      )}
                    </div>
                  ) : (
                  <div
                    className={`editor-transform ${selected.type === "text" && selectedId ? "is-text" : ""} ${isCollageElement(selected) ? "is-collage" : ""}`}
                    role="group"
                    aria-label="拖拽图层"
                    style={{
                      left: selected.x * zoom,
                      top: selected.y * zoom,
                      width: selected.width * zoom,
                      height: selected.height * zoom,
                      cursor: selected.type === "text" ? "text" : undefined,
                      ...elementRotateStyle(selected),
                    }}
                    onPointerDown={(event) => beginMove(event, selected)}
                    onDoubleClick={(event) => {
                      event.stopPropagation();
                      if (selected.type === "text" && !selected.locked)
                        setEditingId(selected.id);
                    }}
                  >
                    {selected.type === "text" && textRange
                      ? getSelectionRects(
                          selected,
                          textRange.start,
                          textRange.end,
                        ).map((rect, index) => (
                          <i
                            key={`${rect.x}-${rect.y}-${index}`}
                            className="editor-text-sel"
                            style={{
                              left: rect.x * zoom,
                              top: rect.y * zoom,
                              width: rect.width * zoom,
                              height: rect.height * zoom,
                            }}
                          />
                        ))
                      : null}
                    {selected.locked
                      ? null
                      : TRANSFORM_HANDLES.map((handle) => (
                          <button
                            type="button"
                            key={handle.id}
                            className={`editor-handle is-${handle.id}`}
                            aria-label={`缩放 ${handle.label}`}
                            onPointerDown={(event) =>
                              beginResize(event, handle.id)
                            }
                          />
                        ))}
                    {isCollageElement(selected) && !selected.locked
                      ? ["n", "s", "e", "w"].map((edge) => (
                          <span
                            key={edge}
                            className={`editor-collage-move-edge is-${edge}`}
                            onPointerDown={(event) =>
                              beginMove(event, selected)
                            }
                          />
                        ))
                      : null}
                    {selected.locked ? null : (
                      <>
                        {isCollageElement(selected) ? (
                          <button
                            type="button"
                            className="editor-el-rotate"
                            aria-label="旋转拼图"
                            onPointerDown={beginRotate}
                          >
                            <RedoOutlined aria-hidden />
                          </button>
                        ) : null}
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
                      </>
                    )}
                  </div>
                  )
                ) : null}
              </div>
            </div>

            <div className="editor-snap-overlay" aria-hidden="true">
              {snapGuides.vertical.map((value) => (
                <div
                  key={`guide-v-${value}`}
                  className="editor-snap-guide is-vertical"
                  style={{ left: value }}
                />
              ))}
              {snapGuides.horizontal.map((value) => (
                <div
                  key={`guide-h-${value}`}
                  className="editor-snap-guide is-horizontal"
                  style={{ top: value }}
                />
              ))}
            </div>

            <div className="editor-dock editor-dock-left">
              <BlockOutlined aria-hidden />
              <span>画板 1/1</span>
              <DownOutlined aria-hidden />
            </div>
            <div className="editor-dock editor-dock-right">
              <button
                type="button"
                className="editor-zoom-btn editor-zoom-nudge"
                aria-label="缩小"
                onClick={() => setZoomMode(clampCanvasZoom(zoom * 0.9))}
              >
                <ZoomOutOutlined aria-hidden />
              </button>
              <Dropdown
                menu={{
                  items: [
                    { key: "fit", label: "适应画布" },
                    { key: "0.25", label: "25%" },
                    { key: "0.5", label: "50%" },
                    { key: "1", label: "100%" },
                    { key: "1.5", label: "150%" },
                    { key: "2", label: "200%" },
                    { key: "4", label: "400%" },
                  ],
                  onClick: ({ key }) =>
                    setZoomMode(key === "fit" ? "fit" : Number(key)),
                }}
              >
                <button
                  type="button"
                  className="editor-zoom-btn"
                  aria-label="缩放"
                >
                  {zoomLabel}
                  <DownOutlined aria-hidden />
                </button>
              </Dropdown>
              <button
                type="button"
                className="editor-zoom-btn editor-zoom-nudge"
                aria-label="放大"
                onClick={() => setZoomMode(clampCanvasZoom(zoom * 1.1))}
              >
                <ZoomInOutlined aria-hidden />
              </button>
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

        <aside
          className="editor-props"
          ref={propsRef}
          onMouseDown={(event) => {
            if (editingId && !event.target.closest("input, textarea, select"))
              event.preventDefault();
          }}
        >
          {selected?.type === "text" ? (
            <EditorTextPanel
              item={itemForStylePanel(selected, textRange)}
              onChange={patchSelected}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onEmptyText={deleteSelected}
              onLayer={(direction) =>
                mutateCanvas(moveElementLayer(canvas, selected.id, direction))
              }
            />
          ) : isCollageElement(selected) ? (
            <EditorCollagePanel
              item={selected}
              canvas={canvas}
              onChange={patchSelected}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onLayer={(direction) =>
                mutateCanvas(moveElementLayer(canvas, selected.id, direction))
              }
              onAddImages={handleCollageImages}
            />
          ) : isLineKind(shapeKind(selected)) ? (
            <EditorLinePanel
              item={selected}
              onChange={patchSelected}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onLayer={(direction) =>
                mutateCanvas(moveElementLayer(canvas, selected.id, direction))
              }
            />
          ) : isShapeElement(selected) ? (
            <EditorShapePanel
              item={selected}
              onChange={patchSelected}
              onDelete={deleteSelected}
              onDuplicate={duplicateSelected}
              onLayer={(direction) =>
                mutateCanvas(moveElementLayer(canvas, selected.id, direction))
              }
            />
          ) : (
            <>
              <div className="editor-props-head">
                <h2>画板</h2>
                <div className="editor-props-actions">
                  <button
                    type="button"
                    aria-label="复制画板"
                    onClick={() => message.info("功能开发中")}
                  >
                    <CopyOutlined aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="新增画板"
                    onClick={() => message.info("功能开发中")}
                  >
                    <PlusOutlined aria-hidden />
                  </button>
                  <button
                    type="button"
                    aria-label="删除画板"
                    onClick={clearBoardElements}
                  >
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
                  <button
                    type="button"
                    className="editor-prop-btn"
                    onClick={openResize}
                  >
                    调整尺寸
                  </button>
                  <button
                    type="button"
                    className="editor-prop-btn"
                    onClick={() => message.info("尺寸延展为会员功能")}
                  >
                    尺寸延展
                    <svg
                      className="editor-vip-crown"
                      viewBox="0 0 16 16"
                      aria-hidden="true"
                    >
                      <path
                        fill="#E6B325"
                        d="M2.2 12.4h11.6L12 6.2 8 9.1 4 6.2 2.2 12.4Z"
                      />
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
                        onChange={(event) =>
                          setResizeWidth(
                            event.target.value.replace(/[^\d]/g, ""),
                          )
                        }
                      />
                    </label>
                    <label className="editor-resize-field">
                      高
                      <input
                        aria-label="高"
                        inputMode="numeric"
                        value={resizeHeight}
                        onChange={(event) =>
                          setResizeHeight(
                            event.target.value.replace(/[^\d]/g, ""),
                          )
                        }
                      />
                    </label>
                    <button
                      type="button"
                      className="editor-resize-apply"
                      onClick={applyResize}
                    >
                      应用
                    </button>
                  </div>
                ) : null}
              </section>

              <section className="editor-prop-block">
                <h3>背景图</h3>
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

              <section className="editor-prop-block">
                <div className="editor-prop-label">
                  <h3>背景色</h3>
                  <EditorColorPicker
                    label="背景色"
                    value={canvas.background}
                    fallback="#ffffff"
                    onChange={(background) =>
                      mutateCanvas({ ...canvas, background })
                    }
                  />
                </div>
                <div className="editor-opacity">
                  <span>不透明度</span>
                  <Slider
                    min={0}
                    max={100}
                    value={canvas.backgroundOpacity}
                    onChange={(value) => {
                      setCanvas((current) => ({
                        ...current,
                        backgroundOpacity: value,
                      }));
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
      {shareMode ? null : (
        <SelectResourceModal
          open={Boolean(resourceTarget)}
          onClose={() => setResourceTarget(null)}
          onSelectImage={applyResourceImage}
        />
      )}
    </div>
  );
}
