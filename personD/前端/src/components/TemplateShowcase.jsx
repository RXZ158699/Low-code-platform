import { useEffect, useState } from "react";
import { Button, Spin, Tag, App as AntdApp } from "antd";
import { useNavigate } from "react-router-dom";
import card1 from "../assets/templates/card-1.png";
import card2 from "../assets/templates/card-2.png";
import card3 from "../assets/templates/card-3.png";
import card4 from "../assets/templates/card-4.png";
import logoDot from "../assets/icons/logo-dot.svg";
import { listTemplates, createWorkFromTemplate } from "../api/templates.js";
import { useAuth } from "../auth/AuthContext.jsx";

const TEMPLATE_TABS = [
  { key: "poster", label: "主题海报" },
  { key: "promo", label: "活动营销" },
  { key: "xiaohongshu", label: "小红书种草" },
  { key: "gzh", label: "公众号封面" },
];

const FALLBACK_COVERS = [card1, card2, card3, card4];
const PAGE_SIZE = 8;

export default function TemplateShowcase({ keyword = "" }) {
  const [tab, setTab] = useState("poster");
  // 初次加载前 loading 为 true；切换 tab/关键词时保留旧数据避免闪烁，故不在 effect 里同步重置
  const [state, setState] = useState({ loading: true, templates: [], error: null });
  const { loading, templates, error } = state;
  const [usingId, setUsingId] = useState(null);
  const { user } = useAuth();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const category = keyword ? undefined : TEMPLATE_TABS.find((item) => item.key === tab)?.label;
    listTemplates({ category, keyword: keyword || undefined, page: 1, size: PAGE_SIZE })
      .then((pageData) => {
        if (!cancelled) {
          setState({ loading: false, templates: pageData.records || [], error: null });
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setState((prev) => ({ ...prev, loading: false, error: err.message || "加载失败" }));
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tab, keyword]);

  const handleUse = async (template) => {
    if (!user) {
      message.info("请先登录后再使用模板");
      navigate("/login");
      return;
    }
    setUsingId(template.id);
    try {
      const work = await createWorkFromTemplate(template.id);
      message.success(`已创建作品「${work.title}」，编辑器开发中`);
    } catch (err) {
      message.error(err.message || "创建作品失败");
    } finally {
      setUsingId(null);
    }
  };

  return (
    <section className="showcase">
      <div className="showcase-header">
        <h2 className="showcase-title">
          <span>{keyword ? `「${keyword}」的搜索结果` : "七夕·情人节氛围模板专场"}</span>
          <Tag className="promo-tag">限时精品</Tag>
        </h2>
        <div className="showcase-tabs" role="tablist" aria-label="模板分类">
          {TEMPLATE_TABS.map((item) => (
            <Tag
              key={item.key}
              className={`category-tag ${tab === item.key && !keyword ? "active" : ""}`}
              onClick={() => setTab(item.key)}
              role="tab"
              aria-selected={tab === item.key}
            >
              {item.label}
            </Tag>
          ))}
        </div>
      </div>

      <Spin spinning={loading}>
        {error ? (
          <div className="template-status">模板加载失败：{error}（请确认后端已启动）</div>
        ) : templates.length === 0 && !loading ? (
          <div className="template-status">暂无模板，换个分类或关键词试试</div>
        ) : (
          <div className="template-cards">
            {templates.map((template, index) => (
              <div className="template-card" key={template.id}>
                <img
                  className="cover"
                  src={template.coverImageUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length]}
                  alt={template.title}
                />
                <div className="template-overlay">
                  <div className="template-card-head">
                    <img src={logoDot} alt="" />
                    <span className="template-logo-text">{template.authorNickname || "稿定"}</span>
                  </div>
                  <div className="template-card-body">
                    <p className="template-title-main">{template.category}</p>
                    <p className="template-title-en">
                      {(template.tags || []).slice(0, 2).join(" · ") || "模板"}
                    </p>
                  </div>
                  <div className="template-card-foot">
                    <span className="template-name">{template.title}</span>
                    <Button
                      size="small"
                      className="use-btn"
                      loading={usingId === template.id}
                      onClick={() => handleUse(template)}
                    >
                      使用
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Spin>
    </section>
  );
}
