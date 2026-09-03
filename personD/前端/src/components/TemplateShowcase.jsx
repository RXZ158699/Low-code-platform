import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Button, Spin, Tag, App as AntdApp } from "antd";
import {
  LeftOutlined,
  RightOutlined,
  StarFilled,
  StarOutlined,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import logoDot from "../assets/icons/logo-dot.svg";
import { TEMPLATE_CATEGORIES } from "../config/templateCategories.js";
import { TEMPLATE_CATALOG } from "../data/templateCatalog.js";
import {
  listHotTemplates,
  listTemplates,
  getTemplate,
  favoriteTemplate,
  unfavoriteTemplate,
  createWorkFromTemplate,
} from "../api/templates.js";
import { createWork } from "../api/works.js";
import {
  createEmptyCanvas,
  parseCanvas,
  stringifyCanvas,
} from "../canvas.js";
import { useAuth } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";
import TemplateCover from "./TemplateCover.jsx";
import TemplateDetailModal from "./TemplateDetailModal.jsx";

const PAGE_SIZE = 36;
const HOT_LIMIT = 20;
const KEYWORD_SIZE = 12;
const COLUMN_COUNT = 4;
const ROW_FILL_COUNT = 4;
const ROW_GAP = 20;

function asRecords(data) {
  if (Array.isArray(data)) return data;
  return data?.records || [];
}

function filterCatalog(activeKey) {
  if (activeKey === "hot") {
    return TEMPLATE_CATALOG.filter((template) => template.hot);
  }
  const active = TEMPLATE_CATEGORIES.find((item) => item.key === activeKey);
  if (active?.apiCategory) {
    return TEMPLATE_CATALOG.filter(
      (template) => template.category === active.apiCategory,
    );
  }
  return TEMPLATE_CATALOG;
}

function normalizeKeyword(keyword) {
  return String(keyword || "").trim().toLowerCase();
}

export function matchesTemplateKeyword(template, keyword) {
  const needle = normalizeKeyword(keyword);
  if (!needle) return true;
  const haystack = [
    template.title,
    template.category,
    template.kicker,
    ...(template.tags || []),
  ]
    .filter(Boolean)
    .map((item) => String(item).toLowerCase())
    .join(" ");
  return haystack.includes(needle);
}

export function searchLocalTemplates(activeKey, keyword) {
  return filterCatalog(activeKey)
    .filter((template) => matchesTemplateKeyword(template, keyword))
    .slice(0, KEYWORD_SIZE)
    .map((template) => ({
      ...template,
      jsonData: canvasJsonForLocalTemplate(template),
    }));
}

function searchScopeKey(activeKey) {
  const active = TEMPLATE_CATEGORIES.find((item) => item.key === activeKey);
  return active?.apiCategory ? activeKey : "all";
}

function isLocalTemplate(template) {
  return String(template.id).startsWith("local-");
}

const ROW_FILLER_POOL = {
  "主题海报": TEMPLATE_CATALOG.filter(
    (template) =>
      template.tags.includes("商务") || template.tags.includes("科技"),
  ),
  "活动营销": TEMPLATE_CATALOG.filter((template) =>
    template.tags.includes("促销"),
  ),
  "小红书种草": TEMPLATE_CATALOG.filter(
    (template) =>
      template.tags.includes("美食") || template.tags.includes("旅行"),
  ),
  "公众号封面": TEMPLATE_CATALOG.filter(
    (template) =>
      template.tags.includes("科技") || template.tags.includes("旅行"),
  ),
  "邀请函": TEMPLATE_CATALOG.filter((template) =>
    template.tags.includes("婚礼"),
  ),
  "电商海报": TEMPLATE_CATALOG.filter(
    (template) =>
      template.tags.includes("促销") || template.tags.includes("美食"),
  ),
  "节日祝福": TEMPLATE_CATALOG.filter((template) =>
    template.tags.includes("节日"),
  ),
};

function fillGroupItems(group) {
  const items = [...group.items];
  if (items.length >= ROW_FILL_COUNT) return items;
  let pool = ROW_FILLER_POOL[group.name] || TEMPLATE_CATALOG;
  if (pool.length === 0) pool = TEMPLATE_CATALOG;
  const missing = ROW_FILL_COUNT - items.length;
  for (let index = 0; index < missing; index += 1) {
    const source = pool[index % pool.length];
    const filled = {
      ...source,
      id: `local-fill-${group.name}-${index}-${source.id}`,
      category: group.name,
      title: `${group.name}灵感示例 ${String(index + 1).padStart(2, "0")}`,
      authorNickname: "一稿",
    };
    filled.jsonData = canvasJsonForLocalTemplate(filled);
    items.push(filled);
  }
  return items;
}

function enrichWithCatalog(template) {
  const match = TEMPLATE_CATALOG.find(
    (item) => item.title === template.title,
  );
  if (!match) return template;
  return {
    ...template,
    ratio: match.ratio,
    palette: match.palette,
    accent: match.accent,
    kicker: match.kicker,
  };
}

function dimensionsForRatio(ratio = "") {
  const map = {
    "3 / 4": { width: 1080, height: 1440 },
    "1 / 1": { width: 1080, height: 1080 },
    "9 / 16": { width: 1080, height: 1920 },
    "16 / 9": { width: 1920, height: 1080 },
    "4 / 3": { width: 1440, height: 1080 },
  };
  return map[String(ratio).trim()] || { width: 1080, height: 1440 };
}

export function canvasJsonForLocalTemplate(template) {
  const { width, height } = dimensionsForRatio(template.ratio);
  const canvas = createEmptyCanvas(width, height);
  canvas.background = template.palette?.[0] || "#2563eb";
  const accent = template.accent || "#ffffff";
  const kicker = template.kicker || "YIGAO";
  const tags = (template.tags || []).slice(0, 2).join(" · ");

  if (template.coverImageUrl) {
    canvas.background = "#111827";
    canvas.elements = [
      {
        id: "template-image",
        type: "image",
        src: template.coverImageUrl,
        name: template.title || "模板图片",
        x: 0,
        y: 0,
        width,
        height,
      },
      seedTextElement({
        id: "template-title",
        text: template.title,
        x: Math.round(width * 0.08),
        y: Math.round(height * 0.4),
        width: Math.round(width * 0.84),
        fontSize: Math.max(30, Math.round(width * 0.058)),
        fontWeight: 900,
        color: "#ffffff",
        lineHeight: 1.18,
        height: Math.round(Math.max(30, Math.round(width * 0.058)) * 2.4),
        boxBackground: "#000000",
        boxBackgroundOpacity: 38,
      }),
    ];
    return stringifyCanvas(canvas);
  }

  canvas.elements = [
    {
      id: "template-deco-circle",
      type: "shape",
      kind: "circle",
      x: Math.round(width * 0.9),
      y: Math.round(-height * 0.04),
      width: Math.round(width * 0.14),
      height: Math.round(width * 0.14),
      fill: accent,
      opacity: 35,
      strokeVisible: false,
    },
    {
      id: "template-deco-rect",
      type: "shape",
      kind: "square",
      x: Math.round(-width * 0.05),
      y: Math.round(height * 0.76),
      width: Math.round(width * 0.1),
      height: Math.round(width * 0.1),
      fill: accent,
      opacity: 22,
      cornerRadius: 16,
      rotate: 24,
      strokeVisible: false,
    },
    seedTextElement({
      id: "template-kicker",
      text: kicker,
      x: Math.round(width * 0.1),
      y: Math.round(height * 0.08),
      width: Math.round(width * 0.8),
      fontSize: Math.max(14, Math.round(width * 0.024)),
      fontWeight: 800,
      color: "rgba(255, 255, 255, 0.85)",
      letterSpacing: 2,
      lineHeight: 1,
    }),
    seedTextElement({
      id: "template-title",
      text: template.title,
      x: Math.round(width * 0.08),
      y: Math.round(height * 0.4),
      width: Math.round(width * 0.84),
      fontSize: Math.max(28, Math.round(width * 0.055)),
      fontWeight: 900,
      color: "#ffffff",
      lineHeight: 1.18,
      height: Math.round(Math.max(28, Math.round(width * 0.055)) * 2.6),
    }),
  ];
  if (tags) {
    canvas.elements.push(
      seedTextElement({
        id: "template-tags",
        text: tags,
        x: Math.round(width * 0.2),
        y: Math.round(height * 0.62),
        width: Math.round(width * 0.6),
        fontSize: Math.max(16, Math.round(width * 0.024)),
        fontWeight: 600,
        color: "#ffffff",
        boxBackground: "#ffffff",
        boxBackgroundOpacity: 18,
      }),
    );
  }
  return stringifyCanvas(canvas);
}

function seedTextElement({
  id,
  text,
  x,
  y,
  width,
  fontSize,
  fontWeight,
  color,
  letterSpacing = 0,
  lineHeight = 1.4,
  height,
  boxBackground = "",
  boxBackgroundOpacity = 100,
}) {
  return {
    id,
    type: "text",
    x,
    y,
    width,
    height: height || Math.round(fontSize * lineHeight),
    text,
    fontSize,
    fontWeight,
    color,
    letterSpacing,
    textAlign: "center",
    lineHeight,
    autoWidth: false,
    boxBackground,
    boxBackgroundOpacity,
  };
}

export function applyCatalogCanvas(template) {
  if (isLocalTemplate(template)) {
    return {
      template: { ...template, jsonData: canvasJsonForLocalTemplate(template) },
      fromCatalog: true,
    };
  }
  const match = TEMPLATE_CATALOG.find(
    (item) => item.title === template?.title,
  );
  if (!match || template?.coverImageUrl) {
    return { template, fromCatalog: false };
  }
  if (!isLocalTemplate(template) && parseCanvas(template.jsonData).elements.length > 1) {
    return { template, fromCatalog: false };
  }
  return {
    template: { ...template, ...match, jsonData: canvasJsonForLocalTemplate(match) },
    fromCatalog: true,
  };
}

export async function loadHomepageTemplates({ category, keyword } = {}) {
  const useKeyword = Boolean(keyword);
  const activeKey = category || "all";
  const active = TEMPLATE_CATEGORIES.find((item) => item.key === activeKey);
  const fallback = () =>
    filterCatalog(activeKey)
      .slice(0, PAGE_SIZE)
      .map((template) => ({
        ...template,
        jsonData: canvasJsonForLocalTemplate(template),
      }));

  if (useKeyword) {
    const local = searchLocalTemplates(searchScopeKey(activeKey), keyword);
    const requestParams = { keyword, page: 1, size: KEYWORD_SIZE };
    if (active?.apiCategory) {
      requestParams.category = active.apiCategory;
    }
    try {
      const data = await listTemplates(requestParams);
      const remote = asRecords(data).map(enrichWithCatalog);
      const seen = new Set();
      remote.forEach((template) => {
        if (template.id != null) seen.add(String(template.id));
        if (template.title) seen.add(template.title);
      });
      const merged = [
        ...remote,
        ...local.filter(
          (template) =>
            !seen.has(String(template.id)) && !seen.has(template.title),
        ),
      ];
      return {
        templates: merged,
        notice:
          remote.length === 0 && local.length > 0
            ? "后端暂无匹配模板，当前展示内置示例模板"
            : "",
        error: null,
      };
    } catch (error) {
      if (local.length > 0) {
        return {
          templates: local,
          notice: "后端暂不可用，当前展示内置示例模板",
          error: null,
        };
      }
      return {
        templates: [],
        notice: "",
        error: error.message || "加载失败",
      };
    }
  }

  try {
    const data =
      activeKey === "hot"
        ? await listHotTemplates(HOT_LIMIT)
        : await listTemplates({
            category: active?.apiCategory,
            page: 1,
            size: PAGE_SIZE,
          });
    const records = asRecords(data);
    if (records.length > 0) {
      return { templates: records.map(enrichWithCatalog), notice: "", error: null };
    }
    return {
      templates: fallback(),
      notice: "后端暂无模板，当前展示内置示例模板",
      error: null,
    };
  } catch {
    return {
      templates: fallback(),
      notice: "后端暂不可用，当前展示内置示例模板",
      error: null,
    };
  }
}

function TemplateCard({
  template,
  onOpen,
  favorited,
  favoriteLoading,
  onToggleFavorite,
  using,
  onUse,
}) {
  const showFavorite = !isLocalTemplate(template);
  return (
    <div className="template-card" onClick={onOpen}>
      <TemplateCover template={template} />
      <div className="template-overlay">
        <div className="template-card-head">
          <img src={logoDot} alt="" />
          <span className="template-logo-text">
            {template.authorNickname || "一稿"}
          </span>
        </div>
        {template.coverImageUrl ? (
          <div className="template-card-body">
            <p className="template-title-main">
              {template.category || "热门"}
            </p>
            <p className="template-title-en">
              {(template.tags || []).slice(0, 2).join(" · ") || "模板"}
            </p>
          </div>
        ) : null}
        <div className="template-card-foot">
          <span className="template-name">{template.title}</span>
          {showFavorite ? (
            <Button
              size="small"
              className={`favorite-btn ${favorited ? "is-favorited" : ""}`}
              icon={favorited ? <StarFilled /> : <StarOutlined />}
              loading={favoriteLoading}
              aria-label={`${favorited ? "取消收藏" : "收藏"} ${template.title}`}
              onClick={(event) => {
                event.stopPropagation();
                onToggleFavorite();
              }}
            />
          ) : null}
          <Button
            size="small"
            className="use-btn"
            loading={using}
            onClick={(event) => {
              event.stopPropagation();
              onUse();
            }}
          >
            使用
          </Button>
        </div>
      </div>
    </div>
  );
}

function CategoryTemplateRow({ name, children }) {
  const rowRef = useRef(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const hasOverflow = children?.length > ROW_FILL_COUNT;

  const updateArrows = useCallback(() => {
    const element = rowRef.current;
    if (!element) return;
    setCanLeft(element.scrollLeft > 2);
    setCanRight(
      element.scrollLeft + element.clientWidth < element.scrollWidth - 2,
    );
  }, []);

  useEffect(() => {
    const element = rowRef.current;
    if (!element) return;
    updateArrows();
    element.addEventListener("scroll", updateArrows, { passive: true });
    let observer;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(updateArrows);
      observer.observe(element);
    }
    return () => {
      element.removeEventListener("scroll", updateArrows);
      if (observer) observer.disconnect();
    };
  }, [updateArrows]);

  const scrollByPage = (direction) => {
    const element = rowRef.current;
    if (!element) return;
    const step = Math.max(element.clientWidth - ROW_GAP, 260);
    if (typeof element.scrollBy === "function") {
      element.scrollBy({ left: direction * step, behavior: "smooth" });
    } else {
      element.scrollLeft += direction * step;
    }
  };

  return (
    <section className="template-group">
      <h3 className="template-group-title">{name}</h3>
      <div className="template-row-wrap">
        {hasOverflow ? (
          <button
            type="button"
            className={`template-row-arrow is-left ${
              canLeft ? "" : "is-disabled"
            }`}
            onClick={() => scrollByPage(-1)}
            aria-label={`${name}向左滑动`}
          >
            <LeftOutlined />
          </button>
        ) : null}
        <div className="template-row" ref={rowRef}>
          {children}
        </div>
        {hasOverflow ? (
          <button
            type="button"
            className={`template-row-arrow is-right ${
              canRight ? "" : "is-disabled"
            }`}
            onClick={() => scrollByPage(1)}
            aria-label={`${name}向右滑动`}
          >
            <RightOutlined />
          </button>
        ) : null}
      </div>
    </section>
  );
}

export default function TemplateShowcase({
  keyword = "",
  category,
  onCategoryChange,
}) {
  const [tab, setTab] = useState(category || "hot");
  const activeKey = category || tab;
  const [state, setState] = useState({
    loading: true,
    templates: [],
    error: null,
    notice: "",
  });
  const { loading, templates, error, notice } = state;
  const [usingId, setUsingId] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailTemplate, setDetailTemplate] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const { user } = useAuth();
  const { message } = AntdApp.useApp();
  const navigate = useNavigate();
  const [favoritedIds, setFavoritedIds] = useState(() => new Set());
  const [favoriteLoadingId, setFavoriteLoadingId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    loadHomepageTemplates({ category: activeKey, keyword })
      .then((result) => {
        if (cancelled) return;
        setState({
          loading: false,
          templates: result.templates,
          error: result.error,
          notice: result.notice,
        });
      })
      .catch(() => {
        if (cancelled) return;
        setState({
          loading: false,
          templates: keyword
            ? searchLocalTemplates(searchScopeKey(activeKey), keyword)
            : filterCatalog(activeKey).slice(0, PAGE_SIZE),
          error: null,
          notice: "后端暂不可用，当前展示内置示例模板",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [keyword, activeKey]);

  const columns = useMemo(() => {
    const result = Array.from({ length: COLUMN_COUNT }, () => []);
    templates.forEach((template, index) => {
      result[index % COLUMN_COUNT].push(template);
    });
    return result;
  }, [templates]);

  const groupedRows = useMemo(() => {
    if (keyword) return [];
    const groups = new Map();
    templates.forEach((template) => {
      const categoryName = template.category || "热门";
      if (!groups.has(categoryName)) groups.set(categoryName, []);
      groups.get(categoryName).push(template);
    });
    return Array.from(groups.entries()).map(([name, items]) => ({
      name,
      items,
    }));
  }, [templates, keyword]);

  const handleCategoryChange = (key) => {
    if (onCategoryChange) onCategoryChange(key);
    else setTab(key);
  };

  const handleUse = async (template) => {
    if (!user) {
      message.info("请先登录后再使用模板");
      openLoginTab();
      return;
    }
    setUsingId(template.id);
    try {
      const prepared = applyCatalogCanvas(template);
      const work = prepared.fromCatalog
        ? await createWork({
            title: prepared.template.title,
            canvasJson: prepared.template.jsonData,
          })
        : await createWorkFromTemplate(template.id);
      message.success(`已创建作品「${work.title}」`);
      navigate(`/works/${work.id}`);
    } catch (err) {
      message.error(err.message || "创建作品失败");
    } finally {
      setUsingId(null);
    }
  };

  const isTemplateFavorited = (template) =>
    favoritedIds.has(String(template.id));

  const handleToggleFavorite = async (template) => {
    if (!user) {
      message.info("请先登录后再收藏模板");
      openLoginTab();
      return;
    }
    const id = String(template.id);
    const favorited = favoritedIds.has(id);
    setFavoriteLoadingId(id);
    try {
      if (favorited) {
        await unfavoriteTemplate(template.id);
      } else {
        await favoriteTemplate(template.id);
      }
      setFavoritedIds((prev) => {
        const next = new Set(prev);
        if (favorited) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
      message.success(favorited ? "已取消收藏" : "已收藏");
    } catch (err) {
      message.error(err.message || (favorited ? "取消收藏失败" : "收藏失败"));
    } finally {
      setFavoriteLoadingId(null);
    }
  };

  const openDetail = async (template) => {
    setDetailOpen(true);
    setDetailLoading(true);
    if (isLocalTemplate(template)) {
      setDetailTemplate(template);
      setDetailLoading(false);
      return;
    }
    try {
      const detail = await getTemplate(template.id);
      setDetailTemplate(detail || template);
    } catch {
      setDetailTemplate(template);
    } finally {
      setDetailLoading(false);
    }
  };

  const closeDetail = () => {
    if (usingId) return;
    setDetailOpen(false);
    setDetailTemplate(null);
  };

  return (
    <section className="showcase">
      <div className="showcase-header">
        <h2 className="showcase-title">
          <span>
            {keyword ? `「${keyword}」的搜索结果` : "模版专场"}
          </span>
          <Tag className="promo-tag">限时精品</Tag>
        </h2>
        <div className="showcase-tabs" role="tablist" aria-label="模板分类">
          {TEMPLATE_CATEGORIES.map((item) => (
            <Tag
              key={item.key}
              className={`category-tag ${activeKey === item.key && !keyword ? "active" : ""}`}
              onClick={() => handleCategoryChange(item.key)}
              role="tab"
              aria-selected={activeKey === item.key}
            >
              {item.label}
            </Tag>
          ))}
        </div>
      </div>

      {notice ? <div className="template-notice">{notice}</div> : null}

      <Spin spinning={loading}>
        {error ? (
          <div className="template-status">
            模板加载失败：{error}（请确认后端已启动）
          </div>
        ) : templates.length === 0 && !loading ? (
          <div className="template-status">暂无模板，换个分类或关键词试试</div>
        ) : (
          groupedRows.length > 0 ? (
            <div className="template-grouped">
              {groupedRows.map((group) => (
                <CategoryTemplateRow name={group.name} key={group.name}>
                  {fillGroupItems(group).map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onOpen={() => openDetail(template)}
                      favorited={isTemplateFavorited(template)}
                      favoriteLoading={favoriteLoadingId === String(template.id)}
                      onToggleFavorite={() => handleToggleFavorite(template)}
                      using={usingId === template.id}
                      onUse={() => handleUse(template)}
                    />
                  ))}
                </CategoryTemplateRow>
              ))}
            </div>
          ) : (
            <div className="template-waterfall">
              {columns.map((column, columnIndex) => (
                <div className="template-column" key={columnIndex}>
                  {column.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onOpen={() => openDetail(template)}
                      favorited={isTemplateFavorited(template)}
                      favoriteLoading={favoriteLoadingId === String(template.id)}
                      onToggleFavorite={() => handleToggleFavorite(template)}
                      using={usingId === template.id}
                      onUse={() => handleUse(template)}
                    />
                  ))}
                </div>
              ))}
            </div>
          )
        )}
      </Spin>
      <TemplateDetailModal
        open={detailOpen}
        template={detailTemplate}
        loading={detailLoading}
        using={usingId === detailTemplate?.id}
        favorited={detailTemplate ? isTemplateFavorited(detailTemplate) : false}
        favoriteLoading={favoriteLoadingId === String(detailTemplate?.id)}
        onToggleFavorite={
          detailTemplate && !isLocalTemplate(detailTemplate)
            ? () => handleToggleFavorite(detailTemplate)
            : undefined
        }
        onClose={closeDetail}
        onUse={() => handleUse(detailTemplate)}
      />
    </section>
  );
}
