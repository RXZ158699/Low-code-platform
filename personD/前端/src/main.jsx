import React from "react";
import ReactDOM from "react-dom/client";
import { ConfigProvider, App as AntdApp } from "antd";
import { BrowserRouter } from "react-router-dom";
import zhCN from "antd/locale/zh_CN";
import AppRoutes from "./AppRoutes.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";
import { MembershipProvider } from "./components/MembershipProvider.jsx";
import "./styles/index.css";

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
          <MembershipProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </MembershipProvider>
        </AuthProvider>
      </AntdApp>
    </ConfigProvider>
  </React.StrictMode>,
);
