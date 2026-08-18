import { Button } from "antd";
import SearchPill from "./SearchPill.jsx";

export default function StickySearchBar({ visible, scale, left, width }) {
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
          <Button className="login-register-btn sticky-login">登录/注册</Button>
        </div>
      </div>
    </div>
  );
}
