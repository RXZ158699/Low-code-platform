import { useEffect, useState } from "react";
import { Spin } from "antd";
import { Link, useParams } from "react-router-dom";
import { getShare } from "../api/shares.js";
import { parseCanvas, textElementStyle } from "../canvas.js";
import CanvasTextCopy from "../components/CanvasTextCopy.jsx";

export default function ShareViewPage() {
  const { token } = useParams();
  const [state, setState] = useState({ loading: true, work: null, error: null });

  useEffect(() => {
    let cancelled = false;
    getShare(token)
      .then((work) => {
        if (!cancelled) setState({ loading: false, work, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ loading: false, work: null, error: err.message || "链接无效" });
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const canvas = parseCanvas(state.work?.canvasJson);

  return (
    <div className="share-page">
      <header className="share-top">
        <Link to="/">返回首页</Link>
        <strong>{state.work?.title || "分享作品"}</strong>
      </header>
      <Spin spinning={state.loading}>
        {state.error ? <div className="template-status">{state.error}</div> : null}
        {state.work ? (
          <div className="editor-stage">
            <div
              className="editor-artboard is-readonly"
              style={{ width: canvas.width, height: canvas.height, transform: `scale(${Math.min(1, 640 / canvas.width)})` }}
            >
              {canvas.elements.map((item) => (
                <div
                  key={item.id}
                  className={item.type === "text" ? "editor-el is-text" : "editor-el"}
                  style={{
                    left: item.x,
                    top: item.y,
                    width: item.width,
                    height: item.height,
                    ...(item.type === "text"
                      ? textElementStyle(item)
                      : { background: item.fill, color: item.color }),
                  }}
                >
                  {item.type === "text" ? <CanvasTextCopy item={item} /> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </Spin>
    </div>
  );
}
