import { isMediaElement } from "../canvas.js";

export default function CanvasMedia({ item }) {
  if (!isMediaElement(item) || !item.src) return null;
  if (item.type === "video") {
    return (
      <video
        className="editor-el-media"
        src={item.src}
        aria-label={item.name || "画布视频"}
        muted
        playsInline
        loop
        preload="metadata"
      />
    );
  }
  return <img className="editor-el-media" src={item.src} alt={item.name || "画布图片"} draggable={false} />;
}
