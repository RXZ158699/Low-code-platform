import paintbrushIcon from "../assets/icons/paintbrush.svg";
import shoppingBagIcon from "../assets/icons/shopping-bag.svg";
import videoIcon from "../assets/icons/video.svg";
import imageIcon from "../assets/icons/image.svg";
import graduationCapIcon from "../assets/icons/graduation-cap.svg";
import layoutDashboardIcon from "../assets/icons/layout-dashboard.svg";
import { useCreatePopover } from "./CreatePopover.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { isAdmin } from "../auth/access.js";

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
  const { user } = useAuth();

  // 创建类入口（图片创作/更多）仅管理员可见，其余功能人人可见
  const visibleFeatures = FEATURES.filter((feature) => {
    if (feature.opensCanvas || feature.hasPopover) return isAdmin(user);
    return true;
  });

  return (
    <section className="features-row" aria-label="功能入口">
      {visibleFeatures.map((feature) => {
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
