import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Spin } from "antd";

const HomePage = lazy(() => import("./App.jsx"));
const LoginPage = lazy(() => import("./pages/LoginPage.jsx"));
const WorkEditorPage = lazy(() => import("./pages/WorkEditorPage.jsx"));
const ShareViewPage = lazy(() => import("./pages/ShareViewPage.jsx"));

function RouteFallback() {
  return (
    <div className="route-fallback" role="status" aria-label="页面加载中">
      <Spin size="large" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/works/:id" element={<WorkEditorPage />} />
        <Route path="/share/:token" element={<ShareViewPage />} />
      </Routes>
    </Suspense>
  );
}
