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
import MineWorkDetail from "./MineWorkDetail.jsx";
import cameraIcon from "../assets/icons/camera.svg";
import downloadIcon from "../assets/icons/download.svg";
import mineEmptyIcon from "../assets/icons/mine-empty.svg";
import card1 from "../assets/templates/card-1.png";
import card2 from "../assets/templates/card-2.png";
import card3 from "../assets/templates/card-3.png";
import card4 from "../assets/templates/card-4.png";
import { archiveWork, createWork, deleteWork, favoriteWork, getWork, listFavoriteWorks, listTrashedWorks, listWorks, purgeWork, restoreWork, unarchiveWork, unfavoriteWork } from "../api/works.js";
import { deleteAsset, favoriteAsset, getAsset, listAssetCategories, listAssets, listFavoriteAssets, listTrashedAssets, purgeAsset, restoreAsset, unfavoriteAsset, updateAsset, uploadAsset } from "../api/assets.js";
import {
  createTeam,
  deleteTeam,
  getTeam,
  inviteMember,
  listMembers,
  listTeamAssets,
  listTeams,
  listTeamWorks,
  removeMember,
  updateMemberRole,
  updateTeam,
} from "../api/teams.js";
import { createShare, deleteShare, listWorkShares, sharePageUrl } from "../api/shares.js";
import { useAppPage } from "../AppPageContext.jsx";
import { useCreatePopover } from "./CreatePopover.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";
import { isAdmin } from "../auth/access.js";
import { useNavigate } from "react-router-dom";
import { canvasPreviewBlob } from "../canvasPreview.js";

const SPACE_TABS = ["我的空间", "最近", "收藏夹", "草稿箱", "已归档", "回收站", "分享管理", "发布"];
const TYPE_TABS = [
  { key: "all", label: "全部" },
  { key: "works", label: "作品" },
  { key: "uploads", label: "我上传的" },
];
const FILTERS = ["颜色", "类别", "类型", "标签", "添加时间"];
const FILTER_OPTIONS = [{ key: "all", label: "不限" }];
const FALLBACK_COVERS = [card1, card2, card3, card4];
const PLACEHOLDER_SPACES = new Set();
const ASSET_SPACES = new Set(["我的空间", "最近"]);
const SHARE_TAB = "分享管理";
const TRASH_TAB = "回收站";
const FAVORITE_TAB = "收藏夹";
const ARCHIVED_TAB = "已归档";
const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
const IMAGE_NAME = /\.(jpe?g|png|webp|gif)$/i;

function statusLabel(status) {
  if (status === "PUBLISHED") return "已发布";
  if (status === "ARCHIVED") return "已归档";
  return "草稿";
}

function formatTime(value) {
  if (!value) return "";
  return String(value).replace("T", " ").slice(0, 16);
}

function queryStatus(spaceTab) {
  if (spaceTab === "草稿箱") return "DRAFT";
  if (spaceTab === "已归档") return "ARCHIVED";
  if (spaceTab === "发布") return "PUBLISHED";
  return undefined;
}

function permissionLabel(permission) {
  return permission === "EDIT" ? "可编辑" : "只读";
}

function canManageTeam(role) {
  return role === "OWNER" || role === "ADMIN";
}

function canDissolveTeam(role) {
  return role === "OWNER";
}

function toWorkItem(work) {
  const deletedAt = work.deletedAt;
  return {
    kind: "work",
    id: work.id,
    title: work.title,
    imageUrl: work.thumbnailUrl,
    canvasJson: work.canvasJson,
    createdAt: work.createdAt,
    updatedAt: work.updatedAt,
    deletedAt,
    status: work.status,
    subtitle: deletedAt
      ? `已删除 · ${formatTime(deletedAt)}`
      : `${statusLabel(work.status)} · ${formatTime(work.updatedAt)}`,
    sortAt: deletedAt || work.updatedAt || work.createdAt || "",
  };
}

function toAssetItem(asset) {
  const deletedAt = asset.deletedAt;
  return {
    kind: "asset",
    id: asset.id,
    title: asset.fileName || "未命名图片",
    imageUrl: asset.url,
    isPublic: Boolean(asset.isPublic),
    teamId: asset.teamId ?? null,
    category: asset.category || "",
    deletedAt,
    subtitle: deletedAt ? `已删除 · ${formatTime(deletedAt)}` : `图片 · ${formatTime(asset.createdAt)}`,
    sortAt: deletedAt || asset.createdAt || "",
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

const previewUrlCache = new Map();

function WorkCover({ item, fallback }) {
  const [src, setSrc] = useState(item.imageUrl || fallback);
  useEffect(() => {
    if (item.imageUrl) {
      setSrc(item.imageUrl);
      return undefined;
    }
    const cacheKey = `${item.kind}-${item.id}:${item.canvasJson || ""}`;
    const cached = previewUrlCache.get(cacheKey);
    if (cached) {
      setSrc(cached);
      return undefined;
    }
    if (!item.canvasJson) {
      setSrc(fallback);
      return undefined;
    }
    let cancelled = false;
    canvasPreviewBlob(item.canvasJson)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setSrc(fallback);
          return;
        }
        const url = URL.createObjectURL(blob);
        previewUrlCache.set(cacheKey, url);
        setSrc(url);
      })
      .catch(() => {
        if (!cancelled) setSrc(fallback);
      });
    return () => {
      cancelled = true;
    };
  }, [item.kind, item.id, item.imageUrl, item.canvasJson, fallback]);
  return <img src={src} alt={item.title} />;
}

export default function MinePage() {
  const { setPage, scale, sidebarVisualWidth, stickyBarWidth } = useAppPage();
  const pageScale = scale || 1;
  const { setOpen } = useCreatePopover();
  const { user, ready } = useAuth();
  const readOnly = !isAdmin(user);
  const { message, modal } = AntdApp.useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const skipCardOpenRef = useRef(false);
  const [spaceTab, setSpaceTab] = useState("我的空间");
  const [typeTab, setTypeTab] = useState("all");
  const [showFolders, setShowFolders] = useState(true);
  const [selectedKeys, setSelectedKeys] = useState(() => new Set());
  const [inviteOpen, setInviteOpen] = useState(false);
  const [teams, setTeams] = useState([]);
  const [teamName, setTeamName] = useState("");
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviteTeamId, setInviteTeamId] = useState();
  const [members, setMembers] = useState([]);
  const [renameName, setRenameName] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const [shareWorkId, setShareWorkId] = useState(null);
  const [shareUrl, setShareUrl] = useState("");
  const [shareAccessCode, setShareAccessCode] = useState("");
  const [shareLinks, setShareLinks] = useState([]);
  const [shareRows, setShareRows] = useState([]);
  const [activeTeamId, setActiveTeamId] = useState(null);
  const [activeTeam, setActiveTeam] = useState(null);
  const [assetOpen, setAssetOpen] = useState(false);
  const [assetDraft, setAssetDraft] = useState({
    id: null,
    isPublic: false,
    teamId: null,
    category: "",
  });
  const [categoryOptions, setCategoryOptions] = useState(FILTER_OPTIONS);
  const [assetCategory, setAssetCategory] = useState("all");
  const [detailWork, setDetailWork] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
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
  const shareManage = spaceTab === SHARE_TAB;
  const trashSpace = spaceTab === TRASH_TAB;
  const favoriteSpace = spaceTab === FAVORITE_TAB;
  const archivedSpace = spaceTab === ARCHIVED_TAB;
  const selectedTeam = teams.find((team) => team.id === inviteTeamId);
  const selectedTeamRole = selectedTeam?.myRole;

  useEffect(() => {
    if (!ready) {
      return undefined;
    }
    if (!user || skipList) {
      return undefined;
    }
    let cancelled = false;
    const includeAssets = !shareManage && !activeTeamId && ASSET_SPACES.has(spaceTab);

    async function loadMine() {
      if (shareManage) {
        const worksPage = await listWorks({ page: 1, size: 24 });
        const records = worksPage.records || [];
        const grouped = await Promise.all(
          records.map(async (work) => {
            const links = await listWorkShares(work.id);
            return (Array.isArray(links) ? links : []).map((link) => ({
              ...link,
              workId: work.id,
              workTitle: work.title,
            }));
          }),
        );
        if (cancelled) return;
        setShareRows(grouped.flat());
        setState({
          loading: false,
          works: records.map(toWorkItem),
          assets: [],
          workTotal: worksPage.total || 0,
          assetTotal: 0,
          error: null,
        });
        return;
      }

      if (trashSpace) {
        const [worksPage, assetsPage] = await Promise.all([
          listTrashedWorks({ page: 1, size: 24 }),
          listTrashedAssets({ page: 1, size: 24 }),
        ]);
        if (cancelled) return;
        setShareRows([]);
        setState({
          loading: false,
          works: (worksPage.records || []).map(toWorkItem),
          assets: (assetsPage.records || []).map(toAssetItem),
          workTotal: worksPage.total || 0,
          assetTotal: assetsPage.total || 0,
          error: null,
        });
        return;
      }

      if (favoriteSpace) {
        const [worksPage, assetsPage] = await Promise.all([
          listFavoriteWorks({ page: 1, size: 24 }),
          listFavoriteAssets({ page: 1, size: 24 }),
        ]);
        if (cancelled) return;
        setShareRows([]);
        setState({
          loading: false,
          works: (worksPage.records || []).map(toWorkItem),
          assets: (assetsPage.records || []).map(toAssetItem),
          workTotal: worksPage.total || 0,
          assetTotal: assetsPage.total || 0,
          error: null,
        });
        return;
      }

      if (activeTeamId) {
        const [team, worksPage, assetsPage] = await Promise.all([
          getTeam(activeTeamId),
          listTeamWorks(activeTeamId, { page: 1, size: 24 }),
          listTeamAssets(activeTeamId, { page: 1, size: 24 }),
        ]);
        if (cancelled) return;
        setActiveTeam(team);
        setState({
          loading: false,
          works: (worksPage.records || []).map(toWorkItem),
          assets: (assetsPage.records || []).map(toAssetItem),
          workTotal: worksPage.total || 0,
          assetTotal: assetsPage.total || 0,
          error: null,
        });
        return;
      }

      const [worksPage, assetsPage] = await Promise.all([
        listWorks({ status: queryStatus(spaceTab), page: 1, size: 24 }),
        includeAssets
          ? listAssets({
              scope: "mine",
              fileType: "image",
              category: assetCategory === "all" ? undefined : assetCategory,
              page: 1,
              size: 24,
            })
          : Promise.resolve({ total: 0, records: [] }),
      ]);
      if (cancelled) return;
      setShareRows([]);
      setState({
        loading: false,
        works: (worksPage.records || []).map(toWorkItem),
        assets: (assetsPage.records || []).map(toAssetItem),
        workTotal: worksPage.total || 0,
        assetTotal: assetsPage.total || 0,
        error: null,
      });
    }

    loadMine().catch((err) => {
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
  }, [spaceTab, skipList, shareManage, trashSpace, favoriteSpace, ready, user, activeTeamId, assetCategory]);

  useEffect(() => {
    if (!ready || !user || skipList || shareManage || trashSpace || favoriteSpace || activeTeamId) {
      return undefined;
    }
    let cancelled = false;
    listAssetCategories({ scope: "mine" })
      .then((items) => {
        if (cancelled) return;
        const rows = Array.isArray(items) ? items : [];
        setCategoryOptions([
          { key: "all", label: "不限" },
          ...rows.map((item) => ({ key: item.name, label: item.name })),
        ]);
      })
      .catch(() => {
        if (!cancelled) setCategoryOptions(FILTER_OPTIONS);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, user, skipList, shareManage, trashSpace, favoriteSpace, activeTeamId]);

  useEffect(() => {
    if (!inviteOpen || !inviteTeamId) {
      return undefined;
    }
    let cancelled = false;
    listMembers(inviteTeamId)
      .then((rows) => {
        if (!cancelled) setMembers(Array.isArray(rows) ? rows : []);
      })
      .catch((err) => {
        if (!cancelled) message.error(err.message || "加载成员失败");
      });
    return () => {
      cancelled = true;
    };
  }, [inviteOpen, inviteTeamId, message]);

  const countLabel = useMemo(() => {
    if (PLACEHOLDER_SPACES.has(spaceTab)) return 0;
    if (shareManage) return shareRows.length;
    return workTotal + assetTotal;
  }, [spaceTab, shareManage, shareRows.length, workTotal, assetTotal]);

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

  const openWorkDetail = (item) => {
    setDetailWork(item);
    setDetailLoading(true);
    getWork(item.id)
      .then((work) => setDetailWork(toWorkItem(work)))
      .catch((err) => message.error(err.message || "加载作品失败"))
      .finally(() => setDetailLoading(false));
  };

  const suppressCardOpen = () => {
    skipCardOpenRef.current = true;
    window.setTimeout(() => {
      skipCardOpenRef.current = false;
    }, 400);
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
      const nextTeams = Array.isArray(mine) ? mine : [];
      setTeams(nextTeams);
      const firstId = nextTeams[0]?.id;
      setInviteTeamId(firstId);
      setRenameName(nextTeams[0]?.name || "");
      setInviteRole("MEMBER");
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
      setRenameName(team.name || "");
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
      await inviteMember(inviteTeamId, inviteUsername.trim(), inviteRole);
      message.success("已发送邀请");
      setInviteUsername("");
      setInviteRole("MEMBER");
      const rows = await listMembers(inviteTeamId);
      setMembers(Array.isArray(rows) ? rows : []);
    } catch (err) {
      message.error(err.message || "邀请失败");
    }
  };

  const handleRenameTeam = async () => {
    if (!inviteTeamId || !renameName.trim()) {
      message.error("请输入团队名称");
      return;
    }
    try {
      const team = await updateTeam(inviteTeamId, renameName.trim());
      setTeams((prev) => prev.map((item) => (item.id === team.id ? { ...item, ...team } : item)));
      if (activeTeamId === team.id) setActiveTeam(team);
      message.success("已保存团队名称");
    } catch (err) {
      message.error(err.message || "重命名失败");
    }
  };

  const handleDissolveTeam = () => {
    if (!inviteTeamId) return;
    modal.confirm({
      title: "解散团队",
      content: `确定解散「${selectedTeam?.name || "该团队"}」吗？`,
      okText: "解散",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await deleteTeam(inviteTeamId);
        setTeams((prev) => prev.filter((item) => item.id !== inviteTeamId));
        if (activeTeamId === inviteTeamId) {
          setActiveTeamId(null);
          setActiveTeam(null);
        }
        const rest = teams.filter((item) => item.id !== inviteTeamId);
        setInviteTeamId(rest[0]?.id);
        setRenameName(rest[0]?.name || "");
        message.success("已解散团队");
      },
    });
  };

  const handleRemoveMember = async (member) => {
    try {
      await removeMember(inviteTeamId, member.userId);
      setMembers((prev) => prev.filter((item) => item.userId !== member.userId));
      message.success(`已移除 ${member.nickname || member.username}`);
    } catch (err) {
      message.error(err.message || "移除失败");
    }
  };

  const handleViewTeam = () => {
    if (!inviteTeamId) {
      message.error("请选择团队");
      return;
    }
    setInviteOpen(false);
    setSpaceTab("我的空间");
    setActiveTeamId(inviteTeamId);
    setState((prev) => ({ ...prev, loading: true, error: null }));
  };

  const refreshShareLinks = async (workId) => {
    const links = await listWorkShares(workId);
    setShareLinks(Array.isArray(links) ? links : []);
  };

  const openShare = async (workId) => {
    if (!user) {
      openLoginTab();
      return;
    }
    setShareWorkId(workId);
    setShareUrl("");
    setShareAccessCode("");
    setShareLinks([]);
    setShareOpen(true);
    try {
      await refreshShareLinks(workId);
    } catch (err) {
      message.error(err.message || "加载分享链接失败");
    }
  };

  const handleCreateShare = async (permission = "VIEW") => {
    try {
      const share = await createShare(shareWorkId, {
        permission,
        accessCode: shareAccessCode.trim() || undefined,
      });
      const url = sharePageUrl(share.token);
      setShareUrl(url);
      await navigator.clipboard?.writeText(url);
      message.success("分享链接已复制");
      await refreshShareLinks(shareWorkId);
    } catch (err) {
      message.error(err.message || "创建分享失败");
    }
  };

  const handleRevokeShare = async (link) => {
    try {
      await deleteShare(link.id);
      setShareLinks((prev) => prev.filter((item) => item.id !== link.id));
      setShareRows((prev) => prev.filter((item) => item.id !== link.id));
      message.success("已撤销分享链接");
    } catch (err) {
      message.error(err.message || "撤销失败");
    }
  };

  const openAssetSettings = async (item) => {
    if (!user) {
      openLoginTab();
      return;
    }
    setAssetDraft({
      id: item.id,
      isPublic: Boolean(item.isPublic),
      teamId: item.teamId ?? null,
      category: item.category || "",
    });
    setAssetOpen(true);
    try {
      const [asset, mine] = await Promise.all([getAsset(item.id), teams.length ? Promise.resolve(teams) : listTeams()]);
      if (!teams.length) setTeams(Array.isArray(mine) ? mine : []);
      setAssetDraft({
        id: asset.id,
        isPublic: Boolean(asset.isPublic),
        teamId: asset.teamId ?? null,
        category: asset.category || "",
      });
    } catch (err) {
      message.error(err.message || "加载素材失败");
    }
  };

  const handleSaveAsset = async () => {
    try {
      const saved = await updateAsset(assetDraft.id, {
        isPublic: assetDraft.isPublic,
        teamId: assetDraft.teamId,
        category: assetDraft.category || undefined,
      });
      setState((prev) => ({
        ...prev,
        assets: prev.assets.map((row) => (row.id === saved.id ? { ...row, ...toAssetItem({ ...row, ...saved }) } : row)),
      }));
      setAssetOpen(false);
      message.success("已保存素材设置");
    } catch (err) {
      message.error(err.message || "保存失败");
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

  const removeRecord = (item) => {
    setState((prev) => ({
      ...prev,
      works: item.kind === "work" ? prev.works.filter((row) => row.id !== item.id) : prev.works,
      assets: item.kind === "asset" ? prev.assets.filter((row) => row.id !== item.id) : prev.assets,
      workTotal: item.kind === "work" ? Math.max(0, prev.workTotal - 1) : prev.workTotal,
      assetTotal: item.kind === "asset" ? Math.max(0, prev.assetTotal - 1) : prev.assetTotal,
    }));
    if (item.kind === "work" && detailWork?.id === item.id) {
      setDetailWork(null);
    }
  };

  const handleRestore = async (item) => {
    try {
      if (item.kind === "asset") {
        await restoreAsset(item.id);
      } else {
        await restoreWork(item.id);
      }
      message.success("已还原");
      removeRecord(item);
    } catch (err) {
      message.error(err.message || "还原失败");
    }
  };

  const handleFavorite = async (item) => {
    try {
      if (item.kind === "asset") {
        await favoriteAsset(item.id);
      } else {
        await favoriteWork(item.id);
      }
      message.success("已收藏");
    } catch (err) {
      message.error(err.message || "收藏失败");
    }
  };

  const handleUnfavorite = async (item) => {
    try {
      if (item.kind === "asset") {
        await unfavoriteAsset(item.id);
      } else {
        await unfavoriteWork(item.id);
      }
      message.success("已取消收藏");
      if (favoriteSpace) {
        removeRecord(item);
      }
    } catch (err) {
      message.error(err.message || "取消收藏失败");
    }
  };

  const handleChangeRole = async (member, role) => {
    try {
      await updateMemberRole(inviteTeamId, member.userId, role);
      setMembers((prev) =>
        prev.map((row) => (row.userId === member.userId ? { ...row, role } : row)),
      );
      message.success(role === "ADMIN" ? "已设为管理员" : "已设为成员");
    } catch (err) {
      message.error(err.message || "角色变更失败");
    }
  };

  const handleArchive = async (item) => {
    if (item.kind !== "work") return;
    try {
      await archiveWork(item.id);
      message.success("已归档");
      removeRecord(item);
    } catch (err) {
      message.error(err.message || "归档失败");
    }
  };

  const handleUnarchive = async (item) => {
    if (item.kind !== "work") return;
    try {
      await unarchiveWork(item.id);
      message.success("已取消归档");
      removeRecord(item);
    } catch (err) {
      message.error(err.message || "取消归档失败");
    }
  };

  const handleDelete = (item) => {
    const permanent = trashSpace;
    modal.confirm({
      title: permanent ? "彻底删除" : item.kind === "asset" ? "删除图片" : "删除作品",
      content: permanent
        ? `确定彻底删除「${item.title}」吗？此操作不可恢复。`
        : `确定删除「${item.title}」吗？删除后可在回收站还原。`,
      okText: permanent ? "彻底删除" : "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        if (permanent) {
          if (item.kind === "asset") {
            await purgeAsset(item.id);
          } else {
            await purgeWork(item.id);
          }
          message.success("已彻底删除");
        } else if (item.kind === "asset") {
          await deleteAsset(item.id);
          message.success("已删除");
        } else {
          await deleteWork(item.id);
          message.success("已删除");
        }
        removeRecord(item);
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
  const showShareList = Boolean(user) && shareManage && !skipList;
  const showEmpty = !listLoading && !listError && (showShareList ? shareRows.length === 0 : visibleRecords.length === 0);
  const showUploadTile = !showEmpty && !listError && !showShareList && !trashSpace && !favoriteSpace && typeTab === "uploads";
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
    const permanent = trashSpace;
    modal.confirm({
      title: permanent ? "彻底删除所选内容" : "删除所选内容",
      content: permanent
        ? `确定彻底删除选中的 ${selectedCount} 项吗？此操作不可恢复。`
        : `确定删除选中的 ${selectedCount} 项吗？删除后可在回收站还原。`,
      okText: permanent ? "彻底删除" : "删除",
      okButtonProps: { danger: true },
      cancelText: "取消",
      onOk: async () => {
        await Promise.all(
          selectedItems.map((item) => {
            if (permanent) {
              return item.kind === "asset" ? purgeAsset(item.id) : purgeWork(item.id);
            }
            return item.kind === "asset" ? deleteAsset(item.id) : deleteWork(item.id);
          }),
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
        message.success(permanent ? "已彻底删除" : "已删除");
      },
    });
  };

  return (
    <div className={`mine-page ${selecting ? "is-selecting" : ""} ${detailWork ? "is-detail" : ""}`}>
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

        {detailWork ? (
          <MineWorkDetail
            work={detailWork}
            locationLabel={spaceTab}
            loading={detailLoading}
            readOnly={readOnly}
            onBack={() => setDetailWork(null)}
            onEdit={() => navigate(`/works/${detailWork.id}`)}
            onShare={() => openShare(detailWork.id)}
            onDelete={() => handleDelete(detailWork)}
            onSoon={() => message.info("功能开发中")}
          />
        ) : (
          <>
        <div className="mine-space-row">
          <nav className="mine-space-tabs" aria-label="我的空间分类">
            {SPACE_TABS.map((item) => (
              <button
                key={item}
                type="button"
                className={`mine-space-tab ${spaceTab === item ? "active" : ""}`}
                onClick={() => {
                  setSpaceTab(item);
                  setActiveTeamId(null);
                  setActiveTeam(null);
                  clearSelection();
                  setState((prev) => ({ ...prev, loading: true, error: null }));
                }}
              >
                {item}
                {item === "分享管理" ? (
                  <span className="mine-upgrade" aria-hidden="true">
                    升级
                  </span>
                ) : null}
              </button>
            ))}
          </nav>
          {!readOnly && (
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
          )}
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
            {toolbarFilters.map((label, index) => {
              const isCategory = label === "类别";
              return (
                <Dropdown
                  key={label}
                  menu={{
                    items: isCategory ? categoryOptions : FILTER_OPTIONS,
                    onClick: isCategory
                      ? ({ key }) => {
                          setAssetCategory(key);
                          clearSelection();
                        }
                      : undefined,
                  }}
                  trigger={["click"]}
                >
                  <button type="button" className="mine-filter">
                    {index === 0 ? <i className="mine-color-dot" aria-hidden="true" /> : null}
                    {isCategory && assetCategory !== "all" ? `类别 · ${assetCategory}` : label}
                    <DownOutlined aria-hidden="true" />
                  </button>
                </Dropdown>
              );
            })}
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
            {activeTeam ? (
              <div className="mine-team-banner">
                <span>
                  正在查看团队「{activeTeam.name}」
                </span>
                <button
                  type="button"
                  className="mine-empty-btn"
                  onClick={() => {
                    setActiveTeamId(null);
                    setActiveTeam(null);
                    setState((prev) => ({ ...prev, loading: true, error: null }));
                  }}
                >
                  返回我的空间
                </button>
              </div>
            ) : null}
            {listError ? <div className="mine-status">加载失败：{listError}</div> : null}
            {showEmpty ? (
              <div className="mine-empty">
                {favoriteSpace ? (
                  <>
                    <img src={mineEmptyIcon} alt="" />
                    <p className="mine-empty-title">收藏夹是空的</p>
                    <p className="mine-empty-sub">在作品或图片菜单中选择「收藏」，即可在这里查看</p>
                  </>
                ) : trashSpace ? (
                  <>
                    <img src={mineEmptyIcon} alt="" />
                    <p className="mine-empty-title">回收站是空的</p>
                    <p className="mine-empty-sub">删除的作品和图片会保留在这里，可还原或彻底删除</p>
                  </>
                ) : showShareList ? (
                  <>
                    <img src={mineEmptyIcon} alt="" />
                    <p className="mine-empty-title">还没有分享链接</p>
                    <p className="mine-empty-sub">在作品卡片菜单中选择「分享」，即可生成只读或可编辑链接</p>
                  </>
                ) : (
                  <>
                    <img src={mineEmptyIcon} alt="" />
                    <p className="mine-empty-title">拖放文件到这里，开始云端作图</p>
                    <p className="mine-empty-sub">点击上传文件，支持上传本地文件</p>
                    <div className="mine-empty-actions">
                      {!readOnly && (
                        <button type="button" className="mine-empty-btn" onClick={openFilePicker}>
                          上传文件
                        </button>
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          className="mine-empty-btn"
                          onClick={() => {
                            setOpen(false);
                            setPage("create");
                          }}
                        >
                          从「一稿设计」导入
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
            ) : null}
            {showShareList && !showEmpty && !listError ? (
              <div className="mine-share-list">
                {shareRows.map((link) => (
                  <div className="mine-share-row" key={link.id}>
                    <div className="mine-card-copy">
                      <strong>{link.workTitle || "未命名作品"}</strong>
                      <span>{permissionLabel(link.permission)}</span>
                    </div>
                    <Input readOnly value={sharePageUrl(link.token)} />
                    {!readOnly && (
                      <Button danger aria-label={`撤销链接 ${link.token}`} onClick={() => handleRevokeShare(link)}>
                        撤销
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            {!showEmpty && !listError && !showShareList ? (
              <div className="mine-grid">
                {!readOnly && showUploadTile ? (
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
                        <WorkCover item={item} fallback={FALLBACK_COVERS[index % FALLBACK_COVERS.length]} />
                        <div
                          className="mine-card-hover"
                          onClick={() => {
                            if (skipCardOpenRef.current) return;
                            if (selecting) {
                              toggleSelected(item);
                              return;
                            }
                            if (trashSpace) {
                              return;
                            }
                            if (favoriteSpace && item.kind !== "work") {
                              return;
                            }
                            if (item.kind === "work") {
                              openWorkDetail(item);
                              return;
                            }
                            message.info("图片已上传，可在编辑器中继续使用");
                          }}
                        >
                          {!readOnly && (
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
                          )}
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
                          {!readOnly && (
                          <div className="mine-card-hover-bar">
                            {trashSpace ? (
                              <button
                                type="button"
                                className="mine-card-create"
                                aria-label={`还原 ${item.title}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleRestore(item);
                                }}
                              >
                                还原
                              </button>
                            ) : archivedSpace ? (
                              <button
                                type="button"
                                className="mine-card-create"
                                aria-label={`取消归档 ${item.title}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleUnarchive(item);
                                }}
                              >
                                取消归档
                              </button>
                            ) : favoriteSpace ? (
                              <button
                                type="button"
                                className="mine-card-create"
                                aria-label={`取消收藏 ${item.title}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  handleUnfavorite(item);
                                }}
                              >
                                取消收藏
                              </button>
                            ) : (
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
                            )}
                            <Dropdown
                              menu={{
                                items: trashSpace
                                  ? [
                                      { key: "restore", label: "还原" },
                                      { key: "purge", label: "彻底删除", danger: true },
                                    ]
                                  : archivedSpace
                                    ? [
                                        { key: "unarchive", label: "取消归档" },
                                        { key: "delete", label: "删除", danger: true },
                                      ]
                                  : [
                                      favoriteSpace
                                        ? { key: "unfavorite", label: "取消收藏" }
                                        : { key: "favorite", label: "收藏" },
                                      ...(item.kind === "work"
                                        ? [
                                            { key: "share", label: "分享" },
                                            { key: "archive", label: "归档" },
                                          ]
                                        : [{ key: "asset", label: "素材设置" }]),
                                      { key: "delete", label: "删除", danger: true },
                                    ],
                                onClick: ({ key: action, domEvent }) => {
                                  domEvent?.stopPropagation();
                                  suppressCardOpen();
                                  if (action === "delete" || action === "purge") handleDelete(item);
                                  if (action === "restore") handleRestore(item);
                                  if (action === "favorite") handleFavorite(item);
                                  if (action === "unfavorite") handleUnfavorite(item);
                                  if (action === "archive") handleArchive(item);
                                  if (action === "unarchive") handleUnarchive(item);
                                  if (action === "share") openShare(item.id);
                                  if (action === "asset") openAssetSettings(item);
                                },
                              }}
                              trigger={["click"]}
                              onOpenChange={(open) => {
                                if (!open) suppressCardOpen();
                              }}
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
                          )}
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
          </>
        )}
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
          {!readOnly && (
            <>
              <label>
                创建团队
                <Input
                  value={teamName}
                  placeholder="团队名称"
                  onChange={(event) => setTeamName(event.target.value)}
                />
              </label>
              <Button onClick={handleCreateTeam}>创建</Button>
            </>
          )}
          <label>
            邀请到团队
            <Select
              value={inviteTeamId}
              placeholder="选择团队"
              options={teams.map((team) => ({ value: team.id, label: team.name }))}
              onChange={(value) => {
                setInviteTeamId(value);
                setRenameName(teams.find((team) => team.id === value)?.name || "");
              }}
            />
          </label>
          {inviteTeamId ? (
            <>
              <label>
                当前团队名称
                <Input
                  aria-label="团队名称"
                  value={renameName}
                  onChange={(event) => setRenameName(event.target.value)}
                />
              </label>
              {canManageTeam(selectedTeamRole) ? (
                <Button onClick={handleRenameTeam}>保存名称</Button>
              ) : null}
              <Button onClick={handleViewTeam}>查看团队内容</Button>
              {canDissolveTeam(selectedTeamRole) ? (
                <Button danger onClick={handleDissolveTeam}>
                  解散团队
                </Button>
              ) : null}
              <div className="mine-member-list">
                {members.map((member) => (
                  <div className="mine-member-row" key={member.userId}>
                    <span>
                      {member.nickname || member.username}
                      <em>{member.role === "OWNER" ? "所有者" : member.role === "ADMIN" ? "管理员" : "成员"}</em>
                    </span>
                    {canManageTeam(selectedTeamRole) && member.role !== "OWNER" ? (
                      <>
                        {member.role === "MEMBER" ? (
                          <Button
                            size="small"
                            aria-label={`设为管理员 ${member.nickname || member.username}`}
                            onClick={() => handleChangeRole(member, "ADMIN")}
                          >
                            设为管理员
                          </Button>
                        ) : (
                          <Button
                            size="small"
                            aria-label={`设为成员 ${member.nickname || member.username}`}
                            onClick={() => handleChangeRole(member, "MEMBER")}
                          >
                            设为成员
                          </Button>
                        )}
                        <Button
                          size="small"
                          danger
                          aria-label={`移除 ${member.nickname || member.username}`}
                          onClick={() => handleRemoveMember(member)}
                        >
                          移除
                        </Button>
                      </>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : null}
          <label>
            用户名
            <Input
              value={inviteUsername}
              placeholder="对方用户名"
              onChange={(event) => setInviteUsername(event.target.value)}
            />
          </label>
          <label>
            角色
            <Select
              aria-label="邀请角色"
              value={inviteRole}
              options={[
                { value: "MEMBER", label: "成员" },
                { value: "ADMIN", label: "管理员" },
              ]}
              onChange={setInviteRole}
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
          <label>
            提取码（选填）
            <Input
              value={shareAccessCode}
              maxLength={8}
              placeholder="4-8 位字母数字"
              onChange={(event) => setShareAccessCode(event.target.value)}
            />
          </label>
          {!readOnly && (
            <Button onClick={() => handleCreateShare("VIEW")}>创建只读链接</Button>
          )}
          {!readOnly && (
            <Button onClick={() => handleCreateShare("EDIT")}>创建可编辑链接</Button>
          )}
          {shareLinks.map((link) => (
            <div className="mine-share-row" key={link.id}>
              <span>{permissionLabel(link.permission)}</span>
              <Input readOnly value={sharePageUrl(link.token)} />
              <Button danger aria-label={`撤销链接 ${link.token}`} onClick={() => handleRevokeShare(link)}>
                撤销
              </Button>
            </div>
          ))}
          {shareUrl ? (
            <Input readOnly value={shareUrl} />
          ) : (
            <p className="mine-empty-sub">生成后将自动复制到剪贴板</p>
          )}
        </div>
      </Modal>
      <Modal title="素材设置" open={assetOpen} onCancel={() => setAssetOpen(false)} footer={null}>
        <div className="profile-form">
          <label className="mine-switch-row">
            公开
            <Switch
              checked={assetDraft.isPublic}
              onChange={(checked) => setAssetDraft((prev) => ({ ...prev, isPublic: checked }))}
              aria-label="公开"
            />
          </label>
          <label>
            分类
            <Input
              value={assetDraft.category}
              placeholder="可选"
              onChange={(event) => setAssetDraft((prev) => ({ ...prev, category: event.target.value }))}
            />
          </label>
          <label>
            所属团队
            <Select
              allowClear
              value={assetDraft.teamId ?? undefined}
              placeholder="不挂到团队"
              options={teams.map((team) => ({ value: team.id, label: team.name }))}
              onChange={(value) => setAssetDraft((prev) => ({ ...prev, teamId: value ?? null }))}
            />
          </label>
          <Button type="primary" onClick={handleSaveAsset}>
            保存设置
          </Button>
        </div>
      </Modal>
    </div>
  );
}
