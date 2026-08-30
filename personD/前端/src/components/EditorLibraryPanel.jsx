import { useEffect, useState } from "react";
import { LeftOutlined } from "@ant-design/icons";
import { Spin } from "antd";
import { listAssets } from "../api/assets.js";
import { listTeamAssets, listTeams } from "../api/teams.js";
import TemplateCover from "./TemplateCover.jsx";
import { loadHomepageTemplates } from "./TemplateShowcase.jsx";
import card1 from "../assets/templates/card-1.png";
import card2 from "../assets/templates/card-2.png";
import card3 from "../assets/templates/card-3.png";
import card4 from "../assets/templates/card-4.png";
import { startAddDrag } from "../addDrag.js";

const FALLBACK_COVERS = [card1, card2, card3, card4];

const TITLES = {
  template: "模板",
  image: "图片",
  mine: "我的",
  team: "团队",
};

function asRecords(data) {
  if (Array.isArray(data)) return data;
  return data?.records || [];
}

function toAssetCard(item) {
  return {
    id: item.id,
    title: item.fileName || "未命名素材",
    cover: item.url,
    item,
  };
}

export default function EditorLibraryPanel({ open, kind, onClose, onPick }) {
  const [data, setData] = useState({ key: "", items: [], emptyHint: "暂无内容" });
  const title = TITLES[kind] || "资源";
  const loading = Boolean(open && kind && data.key !== kind);
  const items = data.key === kind ? data.items : [];
  const emptyHint = data.key === kind ? data.emptyHint : "暂无内容";

  useEffect(() => {
    if (!open || !kind) return undefined;
    let cancelled = false;

    const load = async () => {
      if (kind === "template") {
        const result = await loadHomepageTemplates({ category: "all" });
        return {
          items: result.templates.map((item) => ({
            id: item.id,
            title: item.title || "未命名模板",
            ratio: item.ratio,
            item,
          })),
          emptyHint: result.notice || "暂无内容",
        };
      }
      if (kind === "image") {
        const page = await listAssets({
          scope: "public",
          fileType: "image",
          page: 1,
          size: 24,
        });
        return { items: asRecords(page).map(toAssetCard), emptyHint: "暂无内容" };
      }
      if (kind === "mine") {
        const page = await listAssets({ scope: "mine", page: 1, size: 24 });
        return { items: asRecords(page).map(toAssetCard), emptyHint: "暂无内容" };
      }
      const teams = await listTeams();
      const list = Array.isArray(teams) ? teams : [];
      if (list.length === 0) {
        return { items: [], emptyHint: "还没有团队" };
      }
      const page = await listTeamAssets(list[0].id, { page: 1, size: 24 });
      return { items: asRecords(page).map(toAssetCard), emptyHint: "暂无内容" };
    };

    load()
      .then((next) => {
        if (cancelled) return;
        setData({ key: kind, items: next.items, emptyHint: next.emptyHint });
      })
      .catch(() => {
        if (cancelled) return;
        setData({ key: kind, items: [], emptyHint: "加载失败" });
      });

    return () => {
      cancelled = true;
    };
  }, [open, kind]);

  return (
    <div
      className={`editor-add-panel editor-library-panel ${open ? "is-open" : ""}`}
      role="dialog"
      aria-label={title}
      aria-hidden={!open}
    >
      <div className="editor-add-panel-body">
        <section className="editor-add-section">
          <div className="editor-add-section-head">
            <h3>{title}</h3>
          </div>
          {loading ? (
            <div className="editor-library-status">
              <Spin />
            </div>
          ) : items.length === 0 ? (
            <div className="editor-library-status">{emptyHint}</div>
          ) : (
            <div className="editor-add-media-grid">
              {items.map((entry, index) => (
                <button
                  type="button"
                  className="editor-add-card editor-library-card"
                  key={`${kind}-${entry.id}`}
                  draggable
                  onDragStart={(event) =>
                    startAddDrag(event, "library", {
                      kind,
                      item: entry.item,
                    })
                  }
                  onClick={() =>
                    onPick?.({
                      kind,
                      item: entry.item,
                    })
                  }
                >
                  {kind === "template" ? (
                    <div
                      className="editor-library-cover"
                      style={{ aspectRatio: entry.ratio || "3 / 4" }}
                      draggable={false}
                    >
                      <TemplateCover template={entry.item} />
                    </div>
                  ) : (
                    <img
                      src={entry.cover || FALLBACK_COVERS[index % FALLBACK_COVERS.length]}
                      alt=""
                      draggable={false}
                    />
                  )}
                  <span>{entry.title}</span>
                </button>
              ))}
            </div>
          )}
        </section>
      </div>
      <button
        type="button"
        className="editor-add-collapse"
        aria-label={`收起${title}面板`}
        onClick={onClose}
      >
        <LeftOutlined aria-hidden />
      </button>
    </div>
  );
}
