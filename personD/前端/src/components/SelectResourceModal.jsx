import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Switch, Spin, App as AntdApp } from "antd";
import {
  CaretDownOutlined,
  CaretRightOutlined,
  CloseOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { listAssets, uploadAsset } from "../api/assets.js";
import { mediaKind } from "../mediaFile.js";

const IMAGE_ACCEPT =
  "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";

const NAV_ITEMS = [
  { id: "space", label: "我的空间" },
  { id: "photos", label: "照片" },
];

function asRecords(data) {
  if (Array.isArray(data)) return data;
  return data?.records || [];
}

function toPhoto(item) {
  return {
    id: item.id,
    url: item.url,
    name: item.fileName || item.title || "未命名图片",
  };
}

function EmptySearchMark() {
  return (
    <svg
      className="select-resource-empty-art"
      viewBox="0 0 220 168"
      aria-hidden="true"
    >
      <ellipse cx="118" cy="154" rx="42" ry="7" fill="#EEF2F6" />
      <path
        fill="#7EB6F5"
        d="M18 86c8-28 34-48 58-44 14 2 22 12 20 24-2 14-16 22-36 28-22 7-46 6-42-8Z"
      />
      <path
        fill="#5B9BE8"
        d="M70 68c10 4 18 14 16 26-8 4-18 6-28 6 4-12 6-24 12-32Z"
      />
      <path
        fill="#C9D3DE"
        d="M86 78c8-6 22-4 28 6l18 34c4 8-2 16-12 16H96c-10 0-16-8-12-16L98 86c2-4 0-8-4-8H86Z"
      />
      <rect x="108" y="72" width="22" height="40" rx="6" fill="#4B5563" />
      <rect x="112" y="76" width="14" height="10" rx="3" fill="#9CA8B6" />
      <circle cx="119" cy="108" r="7" fill="#E8EEF5" />
      <path fill="#D7E9F8" d="M126 96 196 58l8 22-70 28Z" />
      <path fill="#C5DFF4" d="M128 102 198 68l4 12-68 26Z" />
      <path fill="#1F2937" d="M168 78 176 70 178 80Z" />
      <path fill="#111827" d="M154 92 162 86 161 98Z" />
      <rect
        x="178"
        y="88"
        width="9"
        height="9"
        rx="1.5"
        fill="#1F2937"
        transform="rotate(18 182 92)"
      />
    </svg>
  );
}

export default function SelectResourceModal({ open, onClose, onSelectImage }) {
  const { message } = AntdApp.useApp();
  const fileRef = useRef(null);
  const [nav, setNav] = useState("space");
  const [search, setSearch] = useState("");
  const [includeChildren, setIncludeChildren] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [photosStatus, setPhotosStatus] = useState("idle");
  const [uploading, setUploading] = useState(false);
  const [sessionOpen, setSessionOpen] = useState(open);

  if (open !== sessionOpen) {
    setSessionOpen(open);
    if (open) {
      setNav("space");
      setSearch("");
      setIncludeChildren(false);
      setPhotosStatus("loading");
    }
  }

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    listAssets({ scope: "mine", fileType: "image", page: 1, size: 48 })
      .then((page) => {
        if (cancelled) return;
        const incoming = asRecords(page)
          .map(toPhoto)
          .filter((item) => item.url);
        setPhotos((prev) => {
          const extra = prev.filter(
            (item) => !incoming.some((row) => row.id === item.id),
          );
          return [...extra, ...incoming];
        });
        setPhotosStatus("ready");
      })
      .catch(() => {
        if (cancelled) return;
        setPhotosStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const navLabel = NAV_ITEMS.find((item) => item.id === nav)?.label || "我的空间";
  const visiblePhotos = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return photos;
    return photos.filter((item) =>
      String(item.name || "").toLowerCase().includes(keyword),
    );
  }, [photos, search]);
  const showPhotos = nav === "photos";
  const showEmpty = !showPhotos || visiblePhotos.length === 0;
  const showPhotosLoading =
    showPhotos && photosStatus === "loading" && photos.length === 0;
  const showPhotosError =
    showPhotos && photosStatus === "error" && photos.length === 0;

  if (!open) return null;

  const applyImage = (url, { close = false } = {}) => {
    if (!url) return;
    onSelectImage?.(url);
    if (close) onClose?.();
  };

  const handleFiles = async (fileList) => {
    const picked = Array.from(fileList || []);
    const images = picked.filter((file) => mediaKind(file) === "image");
    if (images.length === 0) {
      message.error("请选择 jpg / png / webp / gif 图片");
      return;
    }
    if (images.length < picked.length) {
      message.warning("已忽略不支持的文件");
    }
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of images) {
        const asset = await uploadAsset(file, { fileType: "image" });
        const photo = toPhoto(asset);
        if (photo.url) uploaded.push(photo);
      }
      if (uploaded.length === 0) {
        message.error("上传失败");
        return;
      }
      setPhotos((prev) => {
        const next = uploaded.filter(
          (item) => !prev.some((row) => row.id === item.id),
        );
        return [...next, ...prev];
      });
      setPhotosStatus("ready");
      setNav("photos");
      setSearch("");
      applyImage(uploaded[0].url);
      message.success(
        uploaded.length === 1
          ? `已上传「${uploaded[0].name}」`
          : `已上传 ${uploaded.length} 张图片`,
      );
    } catch (err) {
      message.error(err.message || "上传失败");
    } finally {
      setUploading(false);
    }
  };

  const dialog = (
    <div
      className="select-resource-overlay"
      data-select-resource-modal=""
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="select-resource-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="select-resource-title"
      >
        <header className="select-resource-header">
          <h2 id="select-resource-title">选择资源</h2>
          <button
            type="button"
            className="select-resource-close"
            aria-label="关闭"
            onClick={onClose}
          >
            <CloseOutlined aria-hidden />
          </button>
        </header>

        <div className="select-resource-body">
          <aside className="select-resource-side">
            <nav className="select-resource-nav" aria-label="资源位置">
              {NAV_ITEMS.map((item) => {
                const active = nav === item.id;
                return (
                  <button
                    type="button"
                    key={item.id}
                    className={`select-resource-nav-item${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setNav(item.id)}
                  >
                    {active ? (
                      <CaretDownOutlined aria-hidden />
                    ) : (
                      <CaretRightOutlined aria-hidden />
                    )}
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <section className="select-resource-main">
            <div className="select-resource-toolbar">
              <div className="select-resource-heading">
                <h3>{navLabel}</h3>
                <label className="select-resource-toggle">
                  <Switch
                    size="small"
                    checked={includeChildren}
                    aria-label="显示子文件内容"
                    onChange={setIncludeChildren}
                  />
                  <span>显示子文件内容</span>
                </label>
              </div>
              <div className="select-resource-tools">
                <label className="select-resource-search">
                  <input
                    type="search"
                    value={search}
                    autoComplete="off"
                    placeholder={`在「${navLabel}」内搜索`}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  <SearchOutlined aria-hidden />
                </label>
                <button
                  type="button"
                  className="select-resource-upload"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                >
                  {uploading ? "上传中…" : "上传资源"}
                </button>
              </div>
            </div>

            <input
              ref={fileRef}
              className="editor-add-file-input"
              type="file"
              accept={IMAGE_ACCEPT}
              multiple
              aria-label="选择要上传的图片"
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                event.target.value = "";
                handleFiles(files);
              }}
            />

            <div className="select-resource-content">
              {showPhotosLoading ? (
                <div className="select-resource-empty" role="status">
                  <Spin />
                  <p>正在加载照片</p>
                </div>
              ) : showPhotosError ? (
                <div className="select-resource-empty" role="status">
                  <p>照片加载失败，请稍后重试</p>
                </div>
              ) : showEmpty ? (
                <div className="select-resource-empty">
                  <EmptySearchMark />
                  <p>没有找到相关结果</p>
                </div>
              ) : (
                <div className="select-resource-grid">
                  {visiblePhotos.map((photo) => (
                    <button
                      type="button"
                      key={photo.id}
                      className="select-resource-photo"
                      aria-label={`选择「${photo.name}」`}
                      onClick={() => applyImage(photo.url, { close: true })}
                    >
                      <img src={photo.url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );

  return createPortal(dialog, document.body);
}
