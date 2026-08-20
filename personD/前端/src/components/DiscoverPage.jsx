import { useEffect, useMemo, useState } from "react";
import { App as AntdApp, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { DiscoverToolbar, DISCOVER_STICKY_HEIGHT, useDiscoverNav } from "./DiscoverHeader.jsx";
import { createWorkFromTemplate, listHotTemplates, listTemplates } from "../api/templates.js";
import { listAssets } from "../api/assets.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";
import card1 from "../assets/templates/card-1.png";
import card2 from "../assets/templates/card-2.png";
import card3 from "../assets/templates/card-3.png";
import card4 from "../assets/templates/card-4.png";

const FALLBACK_COVERS = [card1, card2, card3, card4];

const CATEGORY_QUERY = {
  模板推荐: { hot: true },
  小红书: { category: "小红书种草" },
  公众号: { category: "公众号封面" },
  电商: { keyword: "电商" },
  节日热点: { category: "活动营销" },
  教育培训: { keyword: "教育" },
  企业行政: { keyword: "企业" },
  金融保险: { keyword: "金融" },
  本地生活: { keyword: "生活" },
  零售百货: { keyword: "零售" },
  素材: { assets: true },
};

function asRecords(data) {
  if (Array.isArray(data)) return data;
  return data?.records || [];
}

function splitColumns(items, count = 4) {
  const columns = Array.from({ length: count }, () => []);
  items.forEach((item, index) => {
    columns[index % count].push(item);
  });
  return columns;
}

export default function DiscoverPage() {
  const { category, keyword } = useDiscoverNav();
  const { user } = useAuth();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [usingId, setUsingId] = useState(null);
  const [state, setState] = useState({ loading: true, items: [], error: null });

  useEffect(() => {
    let cancelled = false;
    const query = CATEGORY_QUERY[category] || { keyword: category };
    const request = keyword
      ? listTemplates({ keyword, page: 1, size: 16 })
      : query.hot
        ? listHotTemplates(12)
        : query.assets
          ? user
            ? listAssets({ scope: "public", fileType: "image", page: 1, size: 16 })
            : Promise.resolve({ records: [] })
          : listTemplates({
              category: query.category,
              keyword: query.keyword,
              page: 1,
              size: 16,
            });

    request
      .then((data) => {
        if (cancelled) return;
        const records = asRecords(data).map((item) =>
          item.fileName
            ? {
                id: `asset-${item.id}`,
                title: item.fileName,
                category: "素材",
                coverImageUrl: item.url,
                kind: "asset",
              }
            : { ...item, kind: "template" },
        );
        setState({ loading: false, items: records, error: null });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({ loading: false, items: [], error: err.message || "加载失败" });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [category, keyword, user]);

  const columns = useMemo(() => splitColumns(state.items), [state.items]);

  const handleUse = async (item) => {
    if (item.kind !== "template") {
      message.info("素材已在「我的」中管理");
      return;
    }
    if (!user) {
      openLoginTab();
      return;
    }
    setUsingId(item.id);
    try {
      const work = await createWorkFromTemplate(item.id);
      message.success(`已创建作品「${work.title}」`);
      navigate(`/works/${work.id}`);
    } catch (err) {
      message.error(err.message || "创建失败");
    } finally {
      setUsingId(null);
    }
  };

  return (
    <div className="discover-page">
      <div className="discover-main">
        <div className="discover-sticky-spacer" style={{ height: DISCOVER_STICKY_HEIGHT }} />
        <DiscoverToolbar />
        <Spin spinning={state.loading}>
          {state.error ? <div className="template-status">加载失败：{state.error}</div> : null}
          {!state.loading && !state.error && state.items.length === 0 ? (
            <div className="template-status">
              {category === "素材" && !user ? "登录后可浏览公开素材" : "暂无内容，换个分类或关键词试试"}
            </div>
          ) : null}
          <div className="discover-masonry">
            {columns.map((column, index) => (
              <div className="discover-col" key={index}>
                {column.map((card, cardIndex) => (
                  <article className="discover-card is-live" key={card.id}>
                    <img
                      src={card.coverImageUrl || FALLBACK_COVERS[(index + cardIndex) % FALLBACK_COVERS.length]}
                      alt={card.title}
                    />
                    {card.category ? <span className="discover-tag">{card.category}</span> : null}
                    <div className="discover-card-foot">
                      <strong>{card.title}</strong>
                      <button
                        type="button"
                        disabled={usingId === card.id}
                        onClick={() => handleUse(card)}
                      >
                        {card.kind === "template" ? "使用" : "查看"}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </Spin>
      </div>
    </div>
  );
}
