import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "./auth/AuthContext.jsx";
import { canAccess, isLoggedIn } from "./auth/access.js";

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

function AccessGate({ page, redirectTo }) {
  const { user, ready } = useAuth();
  if (!ready) return <RouteFallback />;
  if (!canAccess(page, user)) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}

function LoginGate() {
  const { user, ready } = useAuth();
  if (!ready) return <RouteFallback />;
  if (isLoggedIn(user)) return <Navigate to="/" replace />;
  return <Outlet />;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route element={<LoginGate />}>
          <Route path="/login" element={<LoginPage />} />
        </Route>
        <Route element={<AccessGate page="editor" redirectTo="/" />}>
          <Route path="/works/:id" element={<WorkEditorPage />} />
        </Route>
        <Route element={<AccessGate page="share" redirectTo="/login" />}>
          <Route path="/share/:token" element={<ShareViewPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
