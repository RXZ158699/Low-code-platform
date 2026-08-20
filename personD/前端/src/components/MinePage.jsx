import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { App as AntdApp, Button, Dropdown, Input, Modal, Select, Spin, Switch } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownOutlined,
  EllipsisOutlined,
  FolderOutlined,
  PlusOutlined,
  ShareAltOutlined,
  UserAddOutlined,
} from "@ant-design/icons";
import SearchPill from "./SearchPill.jsx";
import cameraIcon from "../assets/icons/camera.svg";
import downloadIcon from "../assets/icons/download.svg";
import mineEmptyIcon from "../assets/icons/mine-empty.svg";
import card1 from "../assets/templates/card-1.png";
import card2 from "../assets/templates/card-2.png";
import card3 from "../assets/templates/card-3.png";
import card4 from "../assets/templates/card-4.png";
import { createWork, deleteWork, listWorks } from "../api/works.js";
import { deleteAsset, listAssets, uploadAsset } from "../api/assets.js";
import { createTeam, inviteMember, listTeams } from "../api/teams.js";
import { createShare, sharePageUrl } from "../api/shares.js";
import { useAppPage } from "../AppPageContext.jsx";
import { useCreatePopover } from "./CreatePopover.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";
import { useNavigate } from "react-router-dom";

const SPACE_TABS = ["我的空间", "最近", "收藏夹", "草稿箱", "回收站", "分享管理", "发布"];
const TYPE_TABS = [
  { key: "all", label: "全部" },
  { key: "works", label: "作品" },
  { key: "uploads", label: "我上传的" },
];
const FILTERS = ["颜色", "类别", "类型", "标签", "添加时间"];
const FILTER_OPTIONS = [{ key: "all", label: "不限" }];
const FALLBACK_COVERS = [card1, card2, card3, card4];
const PLACEHOLDER_SPACES = new Set(["收藏夹", "回收站"]);
const ASSET_SPACES = new Set(["我的空间", "最近"]);
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
const IMAGE_NAME = /\.(jpe?g|png|webp|gif)$/i;

function statusLabel(status) {
  if (status === "PUBLISHED") return "已发布";
  return "草稿";
}

function formatTime(value) {
  if (!value) return "";
  return String(value).replace("T", " ").slice(0, 16);
}

function queryStatus(spaceTab) {
  if (spaceTab === "草稿箱") return "DRAFT";
  if (spaceTab === "发布") return "PUBLISHED";
  return undefined;
}

function toWorkItem(work) {
  return {
    kind: "work",
    id: work.id,
    title: work.title,
    imageUrl: work.thumbnailUrl,
    subtitle: `${statusLabel(work.status)} · ${formatTime(work.updatedAt)}`,
    sortAt: work.updatedAt || work.createdAt || "",
  };
}

function toAssetItem(asset) {
  return {
    kind: "asset",
    id: asset.id,
    title: asset.fileName || "未命名图片",
    imageUrl: asset.url,
    subtitle: `图片 · ${formatTime(asset.createdAt)}`,
    sortAt: asset.createdAt || "",
  };
}

function mergeByDate(assets, works) {
  return [...assets, ...works].sort((left, right) => String(right.sortAt).localeCompare(String(left.sortAt)));
}

function itemKey(item) {
  return `${item.kind}-${item.id}`;
}

function isImageFile(file) {
  if (file.type && file.type.startsWith("image/")) {
    return IMAGE_NAME.test(file.name) || /image\/(jpeg|png|webp|gif)/.test(file.type);
  }
  return IMAGE_NAME.test(file.name);
}

export default function MinePage() {
  const { setPage, scale, sidebarVisualWidth, stickyBarWidth } = useAppPage();
  const pageScale = scale || 1;
  const { setOpen } = useCreatePopover();
  const { user, ready } = useAuth();
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [spaceTab, setSpaceTab] = useState("我的空间");
  const [typeTab, setTypeTab] = useState("all");
  const [showFolders, setShowFolders] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteTeamId, setInviteTeamId] = useState();
  const [shareOpen, setShareOpen] = useState(false);
  const [shareWorkId, setShareWorkId] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [state, setState] = useState({
    loading: true,
    works: [],
    assets: [],
    workTotal: 0,
    assetTotal: 0,
    error: null,
  });
  const { loading, works, assets, workTotal, assetTotal, error } = state;

  const skipList = PLACEHOLDER_SPACES.has(spaceTab);

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    if (!user || skipList) {
      return undefined;
    }
    let cancelled = false;
    const includeAssets = ASSET_SPACES.has(spaceTab);
    Promise.all([
      listWorks({ status: queryStatus(spaceTab), page: 1, size: 24 }),
      includeAssets
        ? listAssets({ scope: "mine", fileType: "image", page: 1, size: 24 })
        : Promise.resolve({ total: 0, records: [] }),
    ])
      .then(([worksPage, assetsPage]) => {
        if (cancelled) return;
        setState({
          loading: false,
          works: (worksPage.records || []).map(toWorkItem),
          assets: (assetsPage.records || []).map(toAssetItem),
          workTotal: worksPage.total || 0,
          assetTotal: assetsPage.total || 0,
          error: null,
        });
      })
      .catch((err) => {
        if (!cancelled) {
          setState({
            loading: false,
            works: [],
            assets: [],
            workTotal: 0,
            assetTotal: 0,
            error: err.message || "加载失败",
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [spaceTab, skipList, ready, user]);

  const countLabel = useMemo(() => {
    if (PLACEHOLDER_SPACES.has(spaceTab)) return 0;
    return workTotal + assetTotal;
  }, [spaceTab, workTotal, assetTotal]);

  const openFilePicker = () => {
    if (!user) {
      openLoginTab();
      return;
    }
    fileInputRef.current?.click();
  };

  const handleFilesSelected = async (event) => {
    const picked = Array.from(event.target.files || []);
    event.target.value = "";
    if (picked.length === 0) {
      return;
    }
    const images = picked.filter(isImageFile);
    if (images.length === 0) {
      message.error("请选择 jpg / png / webp / gif 图片");
      return;
    }
    if (images.length < picked.length) {
      message.warning("已忽略不支持的文件，仅上传图片");
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    const results = await Promise.allSettled(images.map((file) => uploadAsset(file)));
    const uploaded = results.filter((item) => item.status === "fulfilled").map((item) => toAssetItem(item.value));
    const failed = results.length - uploaded.length;

    if (uploaded.length > 0) {
      message.success(uploaded.length === 1 ? `已上传「${uploaded[0].title}」` : `已上传 ${uploaded.length} 张图片`);
      if (PLACEHOLDER_SPACES.has(spaceTab)) {
        setSpaceTab("我的空间");
      }
      setTypeTab("uploads");
      setState((prev) => ({
        ...prev,
        loading: false,
        assets: [...uploaded, ...prev.assets.filter((item) => !uploaded.some((row) => row.id === item.id))],
        assetTotal: prev.assetTotal + uploaded.length,
        error: null,
      }));
    } else {
      setState((prev) => ({ ...prev, loading: false }));
    }
    if (failed > 0) {
      const firstError = results.find((item) => item.status === "rejected")?.reason;
      message.error(firstError?.message || `${failed} 张图片上传失败`);
    }
  };

  const handleCreate = async () => {
    if (!user) {
      openLoginTab();
      return;
    }
    try {
      const work = await createWork({ title: "未命名作品" });
      message.success(`已创建「${work.title}」`);
      setOpen(false);
      if (PLACEHOLDER_SPACES.has(spaceTab)) {
        setSpaceTab("我的空间");
      }
      setTypeTab("all");
      const item = toWorkItem(work);
      setState((prev) => ({
        ...prev,
        works: [item, ...prev.works.filter((row) => row.id !== work.id)],
        workTotal: prev.workTotal + 1,
        loading: false,
        error: null,
      }));
      navigate(`/works/${work.id}`);
    } catch (err) {
      message.error(err.message || "创建失败");
    }
  };

  const toggleSelected = (item) => {
    const key = itemKey(item);
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const handleCreateDesign = (item) => {
    if (item.kind === "work") {
      navigate(`/works/${item.id}`);
      return;
    }
    message.info("图片已上传，可在编辑器中继续使用");
  };

  const openInvite = async () => {
    if (!user) {
      openLoginTab();
      return;
    }
    try {
      const mine = await listTeams();
      setTeams(Array.isArray(mine) ? mine : []);
      setInviteTeamId(mine?.[0]?.id);
      setInviteOpen(true);
    } catch (err) {
      message.error(err.message || "加载团队失败");
    }
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      message.error("请输入团队名称");
      return;
    }
    try {
      const team = await createTeam(teamName.trim());
      setTeams((prev) => [team, ...prev]);
      setInviteTeamId(team.id);
      setTeamName("");
      message.success(`已创建团队「${team.name}」`);
    } catch (err) {
      message.error(err.message || "创建团队失败");
    }
  };

  const handleInviteMember = async () => {
    if (!inviteTeamId || !inviteUsername.trim()) {
      message.error("请选择团队并输入用户名");
      return;
    }
    try {
      await inviteMember(inviteTeamId, inviteUsername.trim());
      message.success("已发送邀请");
      setInviteUsername("");
    } catch (err) {
      message.error(err.message || "邀请失败");
    }
  };

  const openShare = (workId) => {
    if (!user) {
      openLoginTab();
      return;
    }
    setShareWorkId(workId);
    setShareUrl("");
    setShareOpen(true);
  };

  const handleCreateShare = async (permission = "VIEW") => {
    try {
      const share = await createShare(shareWorkId, { permission });
      const url = sharePageUrl(share.token);
      setShareUrl(url);
      await navigator.clipboard?.writeText(url);
      message.success("分享链接已复制");
    } catch (err) {
      message.error(err.message || "创建分享失败");
    }
  };

  const handleDownload = async (item) => {
    const url = item.imageUrl;
    if (!url) {
      message.info("暂无可下载的图片");
      return;
    }
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("download failed");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = item.title || "download";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  const handleDelete = (item) => {
    modal.confirm({
      title: item.kind === "asset" ? "删除图片" : "删除作品",
      content: `确定删除「${item.title}」吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        if (item.kind === "asset") {
          await deleteAsset(item.id);
        } else {
          await deleteWork(item.id);
        }
        message.success("已删除");
        setState((prev) => ({
          ...prev,
          works: item.kind === "work" ? prev.works.filter((row) => row.id !== item.id) : prev.works,
          assets: item.kind === "asset" ? prev.assets.filter((row) => row.id !== item.id) : prev.assets,
          workTotal: item.kind === "work" ? Math.max(0, prev.workTotal - 1) : prev.workTotal,
          assetTotal: item.kind === "asset" ? Math.max(0, prev.assetTotal - 1) : prev.assetTotal,
        }));
      },
    });
  };

  const visibleRecords = useMemo(() => {
    if (skipList || !user) return [];
    if (typeTab === "works") return works;
    if (typeTab === "uploads") return assets;
    return mergeByDate(assets, works);
  }, [skipList, user, typeTab, works, assets]);
  const selectedItems = useMemo(
    () => visibleRecords.filter((item) => selectedKeys.has(itemKey(item))),
    [visibleRecords, selectedKeys],
  );
  const selectedCount = selectedItems.length;
  const selecting = selectedCount > 0;
  const [selectBarMounted, setSelectBarMounted] = useState(false);

  useEffect(() => {
    if (selecting) {
      setSelectBarMounted(true);
      return undefined;
    }
    if (!selectBarMounted) return undefined;
    const timer = window.setTimeout(() => setSelectBarMounted(false), 420);
    return () => window.clearTimeout(timer);
  }, [selecting, selectBarMounted]);
  const allVisibleSelected =
    visibleRecords.length > 0 && selectedCount === visibleRecords.length;
  const listError = skipList || !user ? null : error;
  const listLoading = !ready || (Boolean(user) && !skipList && loading);
  const showEmpty = !listLoading && !listError && visibleRecords.length === 0;
  const showUploadTile = !showEmpty && !listError && typeTab === "uploads";
  const toolbarFilters = selecting ? FILTERS.slice(0, 3) : FILTERS;

  const clearSelection = () => setSelectedKeys(new Set());

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      clearSelection();
      return;
    }
    setSelectedKeys(new Set(visibleRecords.map(itemKey)));
  };

  const downloadSelected = async () => {
    if (selectedItems.length === 0) return;
    await Promise.all(selectedItems.map((item) => handleDownload(item)));
  };

  const deleteSelected = () => {
    modal.confirm({
      title: "删除所选内容",
      content: `确定删除选中的 ${selectedCount} 项吗？`,
      okText: "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await Promise.all(
          selectedItems.map((item) => (item.kind === "asset" ? deleteAsset(item.id) : deleteWork(item.id))),
        );
        const removed = new Set(selectedItems.map(itemKey));
        setState((prev) => ({
          ...prev,
          works: prev.works.filter((row) => !removed.has(itemKey(row))),
          assets: prev.assets.filter((row) => !removed.has(itemKey(row))),
          workTotal: Math.max(0, prev.workTotal - selectedItems.filter((item) => item.kind === "work").length),
          assetTotal: Math.max(0, prev.assetTotal - selectedItems.filter((item) => item.kind === "asset").length),
        }));
        clearSelection();
        message.success("已删除");
      },
    });
  };

  return (
    <div className={`mine-page ${selecting ? "is-selecting" : ""}`}>
      <input
        ref={fileInputRef}
        className="mine-file-input"
        type="file"
        accept={IMAGE_ACCEPT}
        multiple
        aria-label="选择本地图片"
        onChange={handleFilesSelected}
      />
      <div className="mine-main">
        <SearchPill
          className="mine-search"
          withButton={false}
          placeholder="搜索你想要的创意模板、素材与作品"
          suffix={
            <button type="button" className="mine-camera" aria-label="以图搜图">
              <img src={cameraIcon} alt="" />
            </button>
          }
        />

        <div className="mine-space-row">
          <nav className="mine-space-tabs" aria-label="我的空间分类">
            {SPACE_TABS.map((item) => (
              <button
                key={item}
                type="button"
                className={`mine-space-tab ${spaceTab === item ? "active" : ""}`}
                onClick={() => {
                  setSpaceTab(item);
                  clearSelection();
                  setState((prev) => ({ ...prev, loading: true, error: null }));
                }}
              >
                {item}
                {item === "分享管理" ? <span className="mine-upgrade">升级</span> : null}
              </button>
            ))}
          </nav>
          <div className="mine-space-actions">
            <button type="button" className="mine-invite" onClick={openInvite}>
              <UserAddOutlined aria-hidden />
              邀请成员
            </button>
            <button type="button" className="mine-add" onClick={handleCreate}>
              <PlusOutlined aria-hidden />
              添加
            </button>
          </div>
        </div>

        <div className="mine-toolbar">
          {selecting ? (
            <button type="button" className="mine-selected-count" onClick={toggleSelectAll}>
              <span className="mine-check-badge" aria-hidden="true">
                <CheckOutlined />
              </span>
              已选 {selectedCount}/{visibleRecords.length}
            </button>
          ) : (
            <div className="mine-types" role="tablist" aria-label="内容类型">
              {TYPE_TABS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  className={`mine-type ${typeTab === item.key ? "active" : ""}`}
                  onClick={() => {
                    setTypeTab(item.key);
                    clearSelection();
                  }}
                >
                  {item.key === "all" ? `${item.label} (${countLabel})` : item.label}
                </button>
              ))}
            </div>
          )}
          <div className="mine-filters">
            {toolbarFilters.map((label, index) => (
              <Dropdown key={label} menu={{ items: FILTER_OPTIONS }} trigger={["click"]}>
                <button type="button" className="mine-filter">
                  {index === 0 ? <i className="mine-color-dot" aria-hidden="true" /> : null}
                  {label}
                  <DownOutlined aria-hidden="true" />
                </button>
              </Dropdown>
            ))}
            {selecting ? null : (
              <>
                <label className="mine-folder-toggle">
                  <Switch size="small" checked={showFolders} onChange={setShowFolders} />
                  显示文件夹内容
                </label>
                <button type="button" className="mine-view-btn" aria-label="排序">
                  <span className="mine-sort-icon" />
                </button>
                <button type="button" className="mine-view-btn is-active" aria-label="网格视图">
                  <span className="mine-grid-icon" />
                </button>
              </>
            )}
          </div>
        </div>

        <Spin spinning={listLoading}>
          <div className="mine-body">
            {listError ? <div className="mine-status">加载失败：{listError}</div> : null}
            {showEmpty ? (
              <div className="mine-empty">
                <img src={mineEmptyIcon} alt="" />
                <p className="mine-empty-title">拖放文件到这里，开始云端作图</p>
                <p className="mine-empty-sub">点击上传文件，支持上传本地文件</p>
                <div className="mine-empty-actions">
                  <button type="button" className="mine-empty-btn" onClick={openFilePicker}>
                    上传文件
                  </button>
                  <button
                    type="button"
                    className="mine-empty-btn"
                    onClick={() => {
                      setOpen(false);
                      setPage("create");
                    }}
                  >
                    从「稿定设计」导入
                  </button>
                </div>
              </div>
            ) : null}
            {!showEmpty && !listError ? (
              <div className="mine-grid">
                {showUploadTile ? (
                  <article className="mine-card">
                    <button type="button" className="mine-card-cover mine-card-upload" onClick={openFilePicker}>
                      上传图片
                    </button>
                    <div className="mine-card-meta">
                      <div className="mine-card-copy">
                        <strong>从本地选择</strong>
                        <span>jpg / png / webp / gif</span>
                      </div>
                    </div>
                  </article>
                ) : null}
                {visibleRecords.map((item, index) => {
                  const key = itemKey(item);
                  const selected = selectedKeys.has(key);
                  return (
                    <article className={`mine-card ${selected ? "is-selected" : ""}`} key={key}>
                      <div className="mine-card-cover">
                        <img
                          src={item.imageUrl || FALLBACK_COVERS[index % FALLBACK_COVERS.length]}
                          alt={item.title}
                        />
                        <div
                          className="mine-card-hover"
                          onClick={() => {
                            if (selecting) {
                              toggleSelected(item);
                              return;
                            }
                            handleCreateDesign(item);
                          }}
                        >
                          <button
                            type="button"
                            className={`mine-card-check ${selected ? "is-checked" : ""}`}
                            aria-label={`选择 ${item.title}`}
                            aria-pressed={selected}
                            onClick={(event) => {
                              event.stopPropagation();
                              toggleSelected(item);
                            }}
                          >
                            {selected ? <CheckOutlined /> : null}
                          </button>
                          <button
                            type="button"
                            className="mine-card-download"
                            aria-label={`下载 ${item.title}`}
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDownload(item);
                            }}
                          >
                            <img src={downloadIcon} alt="" />
                          </button>
                          <div className="mine-card-hover-bar">
                            <button
                              type="button"
                              className="mine-card-create"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleCreateDesign(item);
                              }}
                            >
                              创建设计
                            </button>
                            <Dropdown
                              menu={{
                                items: [
                                  ...(item.kind === "work"
                                    ? [{ key: "share", label: "分享" }]
                                    : []),
                                  { key: "delete", label: "删除", danger: true },
                                ],
                                onClick: ({ key: action }) => {
                                  if (action === "delete") handleDelete(item);
                                  if (action === "share") openShare(item.id);
                                },
                              }}
                              trigger={["click"]}
                            >
                              <button
                                type="button"
                                className="mine-card-hover-more"
                                aria-label={`更多操作 ${item.title}`}
                                onClick={(event) => event.stopPropagation()}
                              >
                                ···
                              </button>
                            </Dropdown>
                          </div>
                        </div>
                      </div>
                      <div className="mine-card-meta">
                        <div className="mine-card-copy">
                          <strong>{item.title}</strong>
                          <span>{item.subtitle}</span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : null}
            {!showEmpty && !listError ? <p className="mine-loaded">已全部加载完成</p> : null}
          </div>
        </Spin>
        {selectBarMounted
          ? createPortal(
              <div
                className={`mine-select-bar ${selecting ? "is-open" : "is-leaving"}`}
                role="toolbar"
                aria-label="已选作品操作"
                style={{
                  position: "fixed",
                  left: sidebarVisualWidth,
                  width: stickyBarWidth,
                  bottom: 24 * pageScale,
                  "--page-scale": pageScale,
                }}
              >
                <div
                  className="mine-select-bar-scale"
                  style={{
                    width: stickyBarWidth / pageScale,
                    transform: `scale(${pageScale})`,
                  }}
                >
                  <div className="mine-select-bar-inner">
                    <span className="mine-select-bar-count">
                      <span className="mine-check-badge" aria-hidden="true">
                        <CheckOutlined />
                      </span>
                      已选 {selectedCount}
                    </span>
                    <button
                      type="button"
                      aria-label="移动到文件夹"
                      onClick={() => message.info("文件夹功能开发中")}
                    >
                      <FolderOutlined />
                    </button>
                    <button type="button" aria-label="分享" onClick={() => {
                      const work = selectedItems.find((item) => item.kind === "work");
                      if (!work) {
                        message.info("请选择一个作品再分享");
                        return;
                      }
                      openShare(work.id);
                    }}>
                      <ShareAltOutlined />
                    </button>
                    <button type="button" aria-label="下载所选" onClick={downloadSelected}>
                      <img src={downloadIcon} alt="" />
                    </button>
                    <button type="button" aria-label="删除所选" onClick={deleteSelected}>
                      <DeleteOutlined />
                    </button>
                    <button type="button" aria-label="更多所选操作" onClick={() => message.info("更多操作开发中")}>
                      <EllipsisOutlined />
                    </button>
                    <i className="mine-select-bar-split" aria-hidden="true" />
                    <button type="button" aria-label="取消选择" onClick={clearSelection}>
                      <CloseOutlined />
                    </button>
                  </div>
                </div>
              </div>,
              document.body,
            )
          : null}
      </div>
      <Modal
        title="邀请成员"
        open={inviteOpen}
        onCancel={() => setInviteOpen(false)}
        footer={null}
      >
        <div className="profile-form">
          <label>
            创建团队
            <Input
              value={teamName}
              placeholder="团队名称"
              onChange={(event) => setTeamName(event.target.value)}
            />
          </label>
          <Button onClick={handleCreateTeam}>创建</Button>
          <label>
            邀请到团队
            <Select
              value={inviteTeamId}
              placeholder="选择团队"
              options={teams.map((team) => ({ value: team.id, label: team.name }))}
              onChange={setInviteTeamId}
            />
          </label>
          <label>
            用户名
            <Input
              value={inviteUsername}
              placeholder="对方用户名"
              onChange={(event) => setInviteUsername(event.target.value)}
            />
          </label>
          <Button type="primary" onClick={handleInviteMember}>
            邀请
          </Button>
        </div>
      </Modal>
      <Modal
        title="分享作品"
        open={shareOpen}
        onCancel={() => setShareOpen(false)}
        footer={null}
      >
        <div className="profile-form">
          <Button onClick={() => handleCreateShare("VIEW")}>创建只读链接</Button>
          <Button onClick={() => handleCreateShare("EDIT")}>创建可编辑链接</Button>
          {shareUrl ? (
            <Input readOnly value={shareUrl} />
          ) : (
            <p className="mine-empty-sub">生成后将自动复制到剪贴板</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
