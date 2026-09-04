import { useState } from "react";
import { Avatar, Button, Tooltip } from "antd";
import lightbulbIcon from "../assets/icons/lightbulb.svg";
import bookmarkIcon from "../assets/icons/bookmark.svg";
import userCogIcon from "../assets/icons/user-cog.svg";
import plusCircleIcon from "../assets/icons/plus-circle.svg";
import awardIcon from "../assets/icons/award.svg";
import CreatePopover, { useCreatePopover } from "./CreatePopover.jsx";
import { useMembership } from "./MembershipProvider.jsx";
import UserInfoModal from "./UserInfoModal.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { canAccess } from "../auth/access.js";
import { openLoginTab } from "../auth/openLoginTab.js";

const NAV_ITEMS = [
  { key: "create", label: "创作", icon: lightbulbIcon },
  { key: "discover", label: "发现", icon: bookmarkIcon },
  { key: "mine", label: "我的", icon: userCogIcon },
  { key: "new", label: "创建", icon: plusCircleIcon },
];

const NAV_PAGE = { create: "home", discover: "discover", mine: "mine" };

export default function Sidebar({ active: activeProp, onNavigate }) {
  const [internalActive, setInternalActive] = useState("create");
  const [userInfoOpen, setUserInfoOpen] = useState(false);
  const active = activeProp ?? internalActive;
  const { open } = useCreatePopover();
  const { setOpen: setMemberOpen } = useMembership();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.key === "new") return !!user;
    return canAccess(NAV_PAGE[item.key], user);
  });

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

  return (
    <aside className="sidebar">
      <div className="sidebar-top">
        <div className="brand-logo">一稿</div>
        <nav className="sidebar-nav" aria-label="主导航">
          {visibleItems.map((item) => (
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
          <button
            type="button"
            className="premium-entry"
            aria-label="会员中心"
            onClick={() => setMemberOpen(true)}
          >
            <img src={awardIcon} alt="" />
          </button>
        </Tooltip>

        {user ? (
          <button
            type="button"
            className="sidebar-user"
            aria-label="用户信息"
            onClick={() => setUserInfoOpen(true)}
          >
            <Avatar size={36} src={user.avatar || undefined}>
              {(user.nickname || user.username || "?").slice(0, 1)}
            </Avatar>
            <span className="sidebar-user-name">{user.nickname || user.username}</span>
          </button>
        ) : (
          <Button
            type="primary"
            className="sidebar-login-btn"
            onClick={openLoginTab}
            autoInsertSpace={false}
          >
            登录
          </Button>
        )}
      </div>
      <UserInfoModal
        key={String(userInfoOpen)}
        open={userInfoOpen}
        onClose={() => setUserInfoOpen(false)}
      />
    </aside>
  );
}
