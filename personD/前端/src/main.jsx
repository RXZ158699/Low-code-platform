import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider, App as AntdApp } from "antd";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import zhCN from "antd/locale/zh_CN";
import App from "./App.jsx";
import LoginPage from "./pages/LoginPage.jsx";
import WorkEditorPage from "./pages/WorkEditorPage.jsx";
import ShareViewPage from "./pages/ShareViewPage.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import "./styles.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: "#2563eb",
          colorInfo: "#2563eb",
          borderRadius: 12,
          fontFamily:
            '"Inter", "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif',
        },
        components: {
          Button: {
            controlHeight: 40,
            fontWeight: 600,
          },
          Input: {
            activeBorderColor: "transparent",
            hoverBorderColor: "transparent",
          },
        },
      }}
    >
      <AntdApp>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/works/:id" element={<WorkEditorPage />} />
              <Route path="/share/:token" element={<ShareViewPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
);
