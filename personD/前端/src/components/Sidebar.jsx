import { useState } from "react";
import { Avatar, Button, Dropdown, Input, Modal, Tooltip, App as AntdApp } from "antd";
import lightbulbIcon from "../assets/icons/lightbulb.svg";
import bookmarkIcon from "../assets/icons/bookmark.svg";
import userCogIcon from "../assets/icons/user-cog.svg";
import plusCircleIcon from "../assets/icons/plus-circle.svg";
import awardIcon from "../assets/icons/award.svg";
import CreatePopover, { useCreatePopover } from "./CreatePopover.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";
import { updateMe, uploadAvatar } from "../api/users.js";

const NAV_ITEMS = [
  { key: "create", label: "创作", icon: lightbulbIcon },
  { key: "discover", label: "发现", icon: bookmarkIcon },
  { key: "mine", label: "我的", icon: userCogIcon },
  { key: "new", label: "创建", icon: plusCircleIcon },
];

export default function Sidebar({ active: activeProp, onNavigate }) {
  const [internalActive, setInternalActive] = useState("create");
  const [profileOpen, setProfileOpen] = useState(false);
  const [nickname, setNickname] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const active = activeProp ?? internalActive;
  const { open } = useCreatePopover();
  const { user, logout, updateUser } = useAuth();
  const { message } = AntdApp.useApp();

  const handleNavClick = (key) => {
    if (key === "mine" && !user) {
      openLoginTab();
      return;
    }
    if (key === "new") {
      if (activeProp === undefined) {
        setInternalActive(key);
      }
      return;
    }
    onNavigate?.(key);
    if (activeProp === undefined) {
      setInternalActive(key);
    }
  };

  const handleLogout = async () => {
    await logout();
    message.success("已退出登录");
  };

  const openProfile = () => {
    setNickname(user?.nickname || user?.username || "");
    setProfileOpen(true);
  };

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const next = await updateMe({ nickname: nickname.trim() });
      updateUser(next);
      message.success("资料已更新");
      setProfileOpen(false);
    } catch (err) {
      message.error(err.message || "保存失败");
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const next = await uploadAvatar(file);
      updateUser(next);
      message.success("头像已更新");
    } catch (err) {
      message.error(err.message || "头像上传失败");
    }
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand-logo">稿定</div>
        <nav className="sidebar-nav" aria-label="主导航">
          {NAV_ITEMS.map((item) => (
            <div
              key={item.key}
              className={`sidebar-nav-wrap ${item.key === "new" ? "has-popover" : ""} ${item.key === "new" && open ? "popover-open" : ""}`}
              data-create-popover={item.key === "new" ? "" : undefined}
            >
              <button
                type="button"
                className={`sidebar-nav-item ${active === item.key ? "active" : ""}`}
                onClick={() => handleNavClick(item.key)}
                aria-current={active === item.key ? "page" : undefined}
                aria-haspopup={item.key === "new" ? "dialog" : undefined}
              >
                <span className="nav-icon">
                  <img src={item.icon} alt="" />
                </span>
                <span className="nav-label">{item.label}</span>
              </button>
              {item.key === "new" && <CreatePopover />}
            </div>
          ))}
        </nav>
      </div>

      <div className="sidebar-bottom">
        <Tooltip title="会员中心" placement="right">
          <button type="button" className="premium-entry" aria-label="会员中心">
            <img src={awardIcon} alt="" />
          </button>
        </Tooltip>

        {user ? (
          <Dropdown
            menu={{
              items: [
                { key: "profile", label: "编辑资料" },
                { key: "logout", label: "退出登录" },
              ],
              onClick: ({ key }) => {
                if (key === "logout") handleLogout();
                if (key === "profile") openProfile();
              },
            }}
            placement="topRight"
          >
            <button type="button" className="sidebar-user" aria-label="用户菜单">
              <Avatar size={36} src={user.avatar || undefined}>
                {(user.nickname || user.username || "?").slice(0, 1)}
              </Avatar>
              <span className="sidebar-user-name">{user.nickname || user.username}</span>
            </button>
          </Dropdown>
        ) : (
          <Button type="primary" className="sidebar-login-btn" onClick={openLoginTab}>
            登录
          </Button>
        )}
      </div>
      <Modal
        title="编辑资料"
        open={profileOpen}
        onCancel={() => setProfileOpen(false)}
        onOk={saveProfile}
        confirmLoading={savingProfile}
        okText="保存"
        cancelText="取消"
      >
        <div className="profile-form">
          <label>
            头像
            <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatar} />
          </label>
          <label>
            昵称
            <Input value={nickname} onChange={(event) => setNickname(event.target.value)} maxLength={32} />
          </label>
        </div>
      </Modal>
    </aside>
  );
}
