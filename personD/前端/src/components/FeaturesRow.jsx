import paintbrushIcon from "../assets/icons/paintbrush.svg";
import shoppingBagIcon from "../assets/icons/shopping-bag.svg";
import videoIcon from "../assets/icons/video.svg";
import imageIcon from "../assets/icons/image.svg";
import graduationCapIcon from "../assets/icons/graduation-cap.svg";
import layoutDashboardIcon from "../assets/icons/layout-dashboard.svg";
import { useCreatePopover } from "./CreatePopover.jsx";

const FEATURES = [
  { title: "AI 画布", icon: paintbrushIcon },
  { title: "AI 电商", icon: shoppingBagIcon },
  { title: "视频创作", icon: videoIcon },
  { title: "图片创作", icon: imageIcon, opensCanvas: true },
  { title: "SKILL HUB", icon: graduationCapIcon },
  { title: "更多", icon: layoutDashboardIcon, hasPopover: true },
];

export default function FeaturesRow() {
  const { open, setOpen, setCanvasModalOpen, setCanvasModalTab } = useCreatePopover();

  return (
    <section className="features-row" aria-label="功能入口">
      {FEATURES.map((feature) => {
        if (feature.opensCanvas) {
          return (
            <button
              type="button"
              className="feature-item feature-canvas-btn"
              key={feature.title}
              onClick={() => {
                setCanvasModalTab("canvas");
                setCanvasModalOpen(true);
              }}
            >
              <div className="feature-icon">
                <img src={feature.icon} alt="" />
              </div>
              <p className="feature-title">{feature.title}</p>
            </button>
          );
        }

        if (!feature.hasPopover) {
          return (
            <div className="feature-item" key={feature.title}>
              <div className="feature-icon">
                <img src={feature.icon} alt="" />
              </div>
              <p className="feature-title">{feature.title}</p>
            </div>
          );
        }

        return (
          <div
            className={`feature-item has-create-popover ${open ? "popover-open" : ""}`}
            key={feature.title}
            data-create-popover=""
          >
            <button
              type="button"
              className="feature-more-btn"
              aria-haspopup="dialog"
              aria-expanded={open}
              onClick={() => setOpen((value) => !value)}
            >
              <div className="feature-icon">
                <img src={feature.icon} alt="" />
              </div>
              <p className="feature-title">{feature.title}</p>
            </button>
          </div>
        );
      })}
    </section>
  );
}
