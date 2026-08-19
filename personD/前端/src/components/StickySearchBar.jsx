import { Button } from "antd";
import SearchPill from "./SearchPill.jsx";
import { useAuth } from "../auth/AuthContext.jsx";
import { openLoginTab } from "../auth/openLoginTab.js";

export default function StickySearchBar({ visible, scale, left, width }) {
  const { user } = useAuth();

  return (
    <div
      className={`sticky-search-bar ${visible ? "visible" : ""}`}
      style={{ left, width, height: 74 * scale, "--page-scale": scale }}
    >
      <div
        className="sticky-search-scale"
        style={{ width: width / scale, transform: `scale(${scale})` }}
      >
        <div className="sticky-search-content">
          <SearchPill className="sticky-pill" withButton={false} />
          {!user && (
            <Button className="login-register-btn sticky-login" onClick={openLoginTab}>
              登录/注册
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
