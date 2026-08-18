import { useState } from "react";
import { Avatar, Button, Dropdown, Tooltip, App as AntdApp } from "antd";
import lightbulbIcon from "../assets/icons/lightbulb.svg";
import bookmarkIcon from "../assets/icons/bookmark.svg";
import userCogIcon from "../assets/icons/user-cog.svg";
import plusCircleIcon from "../assets/icons/plus-circle.svg";
import awardIcon from "../assets/icons/award.svg";
import CreatePopover, { useCreatePopover } from "./CreatePopover.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";

const NAV_ITEMS = [
  { key: "create", label: "创作", icon: lightbulbIcon },
  { key: "discover", label: "发现", icon: bookmarkIcon },
  { key: "mine", label: "我的", icon: userCogIcon },
  { key: "new", label: "创建", icon: plusCircleIcon },
];

export default function Sidebar() {
  const [active, setActive] = useState("create");
  const { open } = useCreatePopover();
  const { user, logout } = useAuth();
  const { message } = AntdApp.useApp();

  const handleLogout = async () => {
    await logout();
    message.success("已退出登录");
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
                onClick={() => setActive(item.key)}
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
              items: [{ key: "logout", label: "退出登录" }],
              onClick: ({ key }) => {
                if (key === "logout") handleLogout();
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
    </aside>
  );
}
