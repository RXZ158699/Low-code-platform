import { useEffect, useState } from "react";
import { Spin } from "antd";
import { Link, useParams } from "react-router-dom";
import { getShare, probeShareEdit } from "../api/shares.js";
import {
  isCollageElement,
  isMediaElement,
  isShapeElement,
  parseCanvas,
  SHAPE_LABELS,
  shapeKind,
  elementRotateStyle,
  textElementStyle,
} from "../canvas.js";
import CanvasCollage from "../components/CanvasCollage.jsx";
import CanvasMedia from "../components/CanvasMedia.jsx";
import CanvasShape from "../components/CanvasShape.jsx";
import CanvasTextCopy from "../components/CanvasTextCopy.jsx";
import WorkEditorPage from "./WorkEditorPage.jsx";

export default function ShareViewPage() {
  const { token } = useParams();
  const [state, setState] = useState({
    loading: true,
    work: null,
    error: null,
    canEdit: false,
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([getShare(token), probeShareEdit(token)])
      .then(([work, canEdit]) => {
        if (!cancelled)
          setState({ loading: false, work, error: null, canEdit });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            loading: false,
            work: null,
            error: err.message || "链接无效",
            canEdit: false,
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  if (!state.loading && state.canEdit) {
    return <WorkEditorPage shareToken={token} />;
  }

  const canvas = parseCanvas(state.work?.canvasJson);

  return (
    <div className="share-page">
      <header className="share-top">
        <Link to="/">返回首页</Link>
        <strong>{state.work?.title || "分享作品"}</strong>
      </header>
      <Spin spinning={state.loading}>
        {state.error ? (
          <div className="template-status">{state.error}</div>
        ) : null}
        {state.work ? (
          <div className="editor-stage">
            <div
              className="editor-artboard is-readonly"
              style={{
                width: canvas.width,
                height: canvas.height,
                transform: `scale(${Math.min(1, 640 / canvas.width)})`,
              }}
            >
              {canvas.elements.map((item) => (
                <div
                  key={item.id}
                  className={`editor-el ${item.type === "text" ? "is-text" : ""} ${isShapeElement(item) ? "is-shape" : ""} ${isMediaElement(item) ? "is-media" : ""} ${isCollageElement(item) ? "is-collage" : ""}`}
                  aria-label={
                    isShapeElement(item)
                      ? SHAPE_LABELS[shapeKind(item)]
                      : isCollageElement(item)
                        ? "拼图"
                        : isMediaElement(item)
                          ? item.name ||
                            (item.type === "video" ? "画布视频" : "画布图片")
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
                    <CanvasTextCopy item={item} />
                  ) : isShapeElement(item) ? (
                    <CanvasShape item={item} />
                  ) : isCollageElement(item) ? (
                    <CanvasCollage item={item} />
                  ) : isMediaElement(item) ? (
                    <CanvasMedia item={item} />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Spin>
    </div>
  );
}
