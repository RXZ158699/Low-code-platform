import { useEffect, useMemo, useRef, useState } from "react";
import { Dropdown, Spin } from "antd";
import {
  EditOutlined,
  EllipsisOutlined,
  FullscreenOutlined,
  LeftOutlined,
  MessageOutlined,
  MinusOutlined,
  PlusOutlined,
  ShareAltOutlined,
} from "@ant-design/icons";
import {
  isCollageElement,
  isDoodleElement,
  isMediaElement,
  isShapeElement,
  isTextAutoWidth,
  parseCanvas,
  SHAPE_LABELS,
  shapeKind,
  elementRotateStyle,
  textElementStyle,
} from "../canvas.js";
import CanvasCollage from "./CanvasCollage.jsx";
import CanvasDoodle from "./CanvasDoodle.jsx";
import CanvasMedia from "./CanvasMedia.jsx";
import CanvasShape from "./CanvasShape.jsx";
import CanvasTextCopy from "./CanvasTextCopy.jsx";
import TextBubble from "./TextBubble.jsx";
import { getBubbleProps } from "../bubbleText.js";

function formatDetailTime(value) {
  if (!value) return "—";
  return String(value).replace("T", " ").slice(0, 16).replace(/-/g, "/");
}

function formatBytes(bytes) {
  const size = Number(bytes) || 0;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(2)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

function canvasBytes(canvasJson) {
  if (!canvasJson) return 0;
  return new Blob([
    typeof canvasJson === "string" ? canvasJson : JSON.stringify(canvasJson),
  ]).size;
}

function SparkleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.5c.3 2.8 1.2 4.4 3.2 5.8-2 .9-3 2.6-3.2 5.7-.3-3.1-1.2-4.8-3.2-5.7C10.8 6.9 11.7 5.3 12 2.5Zm6.8 9.2c.2 1.5.7 2.4 1.8 3.2-1.1.5-1.6 1.4-1.8 3.1-.2-1.7-.7-2.6-1.8-3.1 1.1-.8 1.6-1.7 1.8-3.2ZM5.4 13.4c.2 1.2.6 1.9 1.5 2.6-.9.4-1.3 1.2-1.5 2.6-.2-1.4-.6-2.2-1.5-2.6.9-.7 1.3-1.4 1.5-2.6Z"
      />
    </svg>
  );
}

function FitIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M4.5 12 11 6.2v11.6L4.5 12Zm15 0L13 6.2v11.6L19.5 12Z"
      />
    </svg>
  );
}

function CanvasPreview({ canvas, thumbnailUrl, title, zoom, flipped }) {
  const data = parseCanvas(canvas);
  const hasElements = data.elements.length > 0;
  if (!hasElements && thumbnailUrl) {
    return (
      <img
        className="mine-detail-thumb"
        src={thumbnailUrl}
        alt={title || ""}
        style={{
          width: data.width * zoom,
          height: data.height * zoom,
          transform: flipped ? "scaleX(-1)" : undefined,
        }}
      />
    );
  }
  return (
    <div
      className="mine-detail-artboard-shell"
      style={{
        width: data.width * zoom,
        height: data.height * zoom,
        transform: flipped ? "scaleX(-1)" : undefined,
      }}
    >
      <div
        className="mine-detail-artboard"
        style={{
          width: data.width,
          height: data.height,
          transform: `scale(${zoom})`,
        }}
      >
        <div
          className="editor-artboard-fill"
          style={{
            background: data.background,
            opacity: (Number(data.backgroundOpacity) || 100) / 100,
          }}
        />
        {data.elements.map((item) => (
          <div
            key={item.id}
            className={`editor-el ${item.type === "text" ? "is-text" : ""} ${getBubbleProps(item) ? "has-bubble" : ""} ${isShapeElement(item) ? "is-shape" : ""} ${isDoodleElement(item) ? "is-doodle" : ""} ${
              isMediaElement(item) ? "is-media" : ""
            } ${isCollageElement(item) ? "is-collage" : ""} ${item.type === "text" && isTextAutoWidth(item) ? "is-auto-width" : ""}`}
            aria-label={
              isShapeElement(item)
                ? SHAPE_LABELS[shapeKind(item)]
                : isCollageElement(item)
                  ? "拼图"
                  : isMediaElement(item)
                    ? item.name ||
                      (item.type === "video" ? "画布视频" : "画布图片")
                    : isDoodleElement(item)
                      ? "涂鸦"
                    : undefined
            }
            style={{
              left: item.x,
              top: item.y,
              width: item.width,
              height: item.height,
              ...(item.type === "text"
                ? textElementStyle(item)
                : elementRotateStyle(item)),
            }}
          >
            {item.type === "text" ? (
              <>
                {getBubbleProps(item) ? <TextBubble item={item} /> : null}
                <CanvasTextCopy item={item} />
              </>
            ) : isShapeElement(item) ? (
              <CanvasShape item={item} />
            ) : isDoodleElement(item) ? (
              <CanvasDoodle item={item} />
            ) : isCollageElement(item) ? (
              <CanvasCollage item={item} />
            ) : isMediaElement(item) ? (
              <CanvasMedia item={item} />
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MineWorkDetail({
  work,
  locationLabel,
  loading,
  onBack,
  onEdit,
  onShare,
  onDelete,
  onSoon,
  readOnly = false,
}) {
  const stageRef = useRef(null);
  const [stageBox, setStageBox] = useState({ width: 720, height: 520 });
  const [zoomMode, setZoomMode] = useState("fit");
  const [flipped, setFlipped] = useState(false);
  const canvas = useMemo(
    () => parseCanvas(work?.canvasJson),
    [work?.canvasJson],
  );

  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const measure = () =>
      setStageBox({
        width: el.clientWidth || 720,
        height: el.clientHeight || 520,
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const fitZoom = Math.max(
    0.05,
    Math.min(
      1,
      (stageBox.width - 72) / canvas.width,
      (stageBox.height - 88) / canvas.height,
    ),
  );
  const zoom = zoomMode === "fit" ? fitZoom : zoomMode;
  const zoomLabel = `${Math.max(1, Math.round(zoom * 100))}%`;

  const bumpZoom = (delta) => {
    const current = zoomMode === "fit" ? fitZoom : zoomMode;
    setZoomMode(
      Math.min(4, Math.max(0.05, Math.round((current + delta) * 100) / 100)),
    );
  };

  const enterFullscreen = () => {
    stageRef.current?.requestFullscreen?.();
  };

  const fileSize = formatBytes(canvasBytes(work?.canvasJson));

  return (
    <section className="mine-detail" aria-label="作品详情">
      <button
        type="button"
        className="mine-detail-back"
        aria-label="返回"
        onClick={onBack}
      >
        <LeftOutlined />
      </button>
      <div className="mine-detail-stage" ref={stageRef}>
        <Spin spinning={loading}>
          <div className="mine-detail-stage-inner">
            <CanvasPreview
              canvas={work?.canvasJson}
              thumbnailUrl={work?.imageUrl}
              title={work?.title}
              zoom={zoom}
              flipped={flipped}
            />
          </div>
        </Spin>
        <div className="mine-detail-zoom" role="toolbar" aria-label="预览缩放">
          <button
            type="button"
            aria-label="缩小"
            onClick={() => bumpZoom(-0.1)}
          >
            <MinusOutlined />
          </button>
          <button
            type="button"
            className="mine-detail-zoom-value"
            onClick={() => setZoomMode("fit")}
          >
            {zoomLabel}
          </button>
          <button type="button" aria-label="放大" onClick={() => bumpZoom(0.1)}>
            <PlusOutlined />
          </button>
          <i className="mine-detail-zoom-split" />
          <button
            type="button"
            aria-label="镜像画布"
            onClick={() => setFlipped((value) => !value)}
          >
            <FitIcon />
          </button>
          <button type="button" aria-label="全屏预览" onClick={enterFullscreen}>
            <FullscreenOutlined />
          </button>
        </div>
      </div>
      <aside className="mine-detail-side">
        <div className="mine-detail-side-tools">
          {!readOnly && (
            <button type="button" aria-label="分享" onClick={onShare}>
              <ShareAltOutlined />
            </button>
          )}
          <button type="button" aria-label="评论" onClick={onSoon}>
            <MessageOutlined />
          </button>
          {!readOnly && (
            <Dropdown
              menu={{
                items: [
                  { key: "share", label: "分享" },
                  { key: "delete", label: "删除", danger: true },
                ],
                onClick: ({ key }) => {
                  if (key === "share") onShare();
                  if (key === "delete") onDelete();
                },
              }}
              trigger={["click"]}
            >
              <button type="button" aria-label="更多操作">
                <EllipsisOutlined />
              </button>
            </Dropdown>
          )}
        </div>
        <h1 className="mine-detail-title">{work?.title || "未命名作品"}</h1>
        <div className="mine-detail-actions">
          {!readOnly && (
            <button
              type="button"
              className="mine-detail-edit"
              aria-label="编辑"
              onClick={onEdit}
            >
              <span aria-hidden="true">
                <EditOutlined />
              </span>
              编辑
            </button>
          )}
          <button type="button" className="mine-detail-ai" onClick={onSoon}>
            <SparkleIcon />
            AI 编辑
          </button>
        </div>
        <h2 className="mine-detail-section">基本信息</h2>
        <dl className="mine-detail-meta">
          <div>
            <dt>文件位置</dt>
            <dd>{locationLabel}</dd>
          </div>
          <div>
            <dt>大小</dt>
            <dd>{fileSize}</dd>
          </div>
          <div>
            <dt>添加时间</dt>
            <dd>{formatDetailTime(work?.createdAt)}</dd>
          </div>
          <div>
            <dt>修改时间</dt>
            <dd>{formatDetailTime(work?.updatedAt)}</dd>
          </div>
        </dl>
        <h2 className="mine-detail-section">标签</h2>
        <button type="button" className="mine-detail-tag" onClick={onSoon}>
          + 添加标签
        </button>
      </aside>
    </section>
  );
}
