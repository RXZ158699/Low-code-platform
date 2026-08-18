import { createContext, useContext, useEffect, useMemo, useState } from "react";
import plusIcon from "../assets/icons/plus.svg";
import imageIcon from "../assets/icons/image.svg";
import folderPlusIcon from "../assets/icons/folder-plus.svg";
import cropSparkIcon from "../assets/icons/crop-spark.svg";
import shoppingBagIcon from "../assets/icons/shopping-bag.svg";
import videoIcon from "../assets/icons/video.svg";
import cutoutIcon from "../assets/icons/cutout.svg";
import wandIcon from "../assets/icons/wand.svg";
import collageIcon from "../assets/icons/collage.svg";
import psIcon from "../assets/icons/ps.svg";
import articleIcon from "../assets/icons/article.svg";
import scissorsIcon from "../assets/icons/scissors.svg";

const CREATE_ACTIONS = [
  { label: "新增画布", icon: plusIcon },
  { label: "导入图片", icon: imageIcon },
  { label: "打开本地", icon: folderPlusIcon },
];

const CREATE_TOOLS = [
  { label: "AI 画布", icon: cropSparkIcon },
  { label: "AI 电商", icon: shoppingBagIcon },
  { label: "视频创作", icon: videoIcon },
  { label: "图片创作", icon: imageIcon },
  { label: "AI 抠图", icon: cutoutIcon },
  { label: "图片编辑", icon: wandIcon },
  { label: "拼图", icon: collageIcon },
  { label: "在线PS", icon: psIcon },
  { label: "图文创作", icon: articleIcon },
  { label: "视频剪辑", icon: scissorsIcon },
];

const CreatePopoverContext = createContext(null);

export function CreatePopoverProvider({ children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (event.target.closest("[data-create-popover]")) return;
      setOpen(false);
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const value = useMemo(() => ({ open, setOpen }), [open]);

  return (
    <CreatePopoverContext.Provider value={value}>{children}</CreatePopoverContext.Provider>
  );
}

export function useCreatePopover() {
  const context = useContext(CreatePopoverContext);
  if (!context) {
    return { open: false, setOpen: () => {} };
  }
  return context;
}

export default function CreatePopover() {
  return (
    <div className="create-popover" aria-label="创建设计">
      <div className="create-popover-inner">
        <section className="create-popover-section">
          <h3 className="create-popover-title">创建设计</h3>
          <div className="create-actions">
            {CREATE_ACTIONS.map((item) => (
              <button type="button" className="create-action-card" key={item.label}>
                <img src={item.icon} alt="" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="create-popover-section">
          <h3 className="create-popover-title">应用场景/工具</h3>
          <div className="create-tools">
            {CREATE_TOOLS.map((item) => (
              <button type="button" className="create-tool" key={item.label}>
                <span className="create-tool-icon">
                  <img src={item.icon} alt="" />
                </span>
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
