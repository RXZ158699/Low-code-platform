import { createContext, useContext, useMemo, useState } from "react";
import { Dropdown } from "antd";
import { DownOutlined } from "@ant-design/icons";
import SearchPill from "./SearchPill.jsx";
import cameraIcon from "../assets/icons/camera.svg";
import slidersIcon from "../assets/icons/sliders.svg";

export const DISCOVER_STICKY_HEIGHT = 128;

const CATEGORIES = [
  "模板推荐",
  "素材",
  "小红书",
  "公众号",
  "电商",
  "节日热点",
  "教育培训",
  "企业行政",
  "金融保险",
  "本地生活",
  "零售百货",
];

const MEDIA_TYPES = ["图片模板", "PPT模板", "视频模板", "H5模板"];

const FILTERS = ["渠道", "物料", "行业"];

const FILTER_OPTIONS = [
  { key: "all", label: "不限" },
  { key: "hot", label: "热门" },
];

const DiscoverNavContext = createContext(null);

export function DiscoverNavProvider({ children }) {
  const [category, setCategory] = useState("模板推荐");
  const [mediaType, setMediaType] = useState("图片模板");
  const value = useMemo(
    () => ({ category, setCategory, mediaType, setMediaType }),
    [category, mediaType],
  );
  return <DiscoverNavContext.Provider value={value}>{children}</DiscoverNavContext.Provider>;
}

function useDiscoverNav() {
  const context = useContext(DiscoverNavContext);
  const [category, setCategory] = useState("模板推荐");
  const [mediaType, setMediaType] = useState("图片模板");
  return context ?? { category, setCategory, mediaType, setMediaType };
}

export function DiscoverSearchTabs() {
  const { category, setCategory } = useDiscoverNav();

  return (
    <div className="discover-search-tabs">
      <SearchPill
        className="discover-search"
        withButton={false}
        placeholder="搜索你想要的创意模板、素材与作品"
        suffix={
          <button type="button" className="discover-camera" aria-label="以图搜图">
            <img src={cameraIcon} alt="" />
          </button>
        }
      />
      <nav className="discover-categories" aria-label="发现分类">
        {CATEGORIES.map((item) => (
          <button
            key={item}
            type="button"
            className={`discover-category ${category === item ? "active" : ""}`}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </nav>
    </div>
  );
}

export function DiscoverToolbar() {
  const { mediaType, setMediaType } = useDiscoverNav();

  return (
    <div className="discover-toolbar">
      <div className="discover-types" role="tablist" aria-label="模板类型">
        {MEDIA_TYPES.map((item) => (
          <button
            key={item}
            type="button"
            className={`discover-type ${mediaType === item ? "active" : ""}`}
            onClick={() => setMediaType(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="discover-filters">
        {FILTERS.map((label) => (
          <Dropdown key={label} menu={{ items: FILTER_OPTIONS }} trigger={["click"]}>
            <button type="button" className="discover-filter">
              {label}
              <DownOutlined aria-hidden="true" />
            </button>
          </Dropdown>
        ))}
        <button type="button" className="discover-filter-more" aria-label="更多筛选">
          <img src={slidersIcon} alt="" />
        </button>
      </div>
    </div>
  );
}

export default function DiscoverStickyHeader({ pinned, scale, left, width }) {
  const height = DISCOVER_STICKY_HEIGHT * scale;
  return (
    <div
      className={`discover-sticky ${pinned ? "pinned" : ""}`}
      style={{
        top: 0,
        marginLeft: left,
        marginBottom: -height,
        width,
        height,
        background: pinned ? "#fff" : "transparent",
      }}
    >
      <div
        className="discover-sticky-inner"
        style={{ width: width / scale, transform: `scale(${scale})` }}
      >
        <DiscoverSearchTabs />
      </div>
    </div>
  );
}
