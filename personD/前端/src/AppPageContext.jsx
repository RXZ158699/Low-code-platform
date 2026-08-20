import { createContext, useContext, useMemo } from "react";

const AppPageContext = createContext(null);

const FALLBACK = {
  page: "create",
  setPage: () => {},
  scale: 1,
  sidebarVisualWidth: 80,
  stickyBarWidth: 1360,
};

export function AppPageProvider({
  children,
  page,
  setPage,
  scale = 1,
  sidebarVisualWidth = 80,
  stickyBarWidth = 1360,
}) {
  const value = useMemo(
    () => ({ page, setPage, scale, sidebarVisualWidth, stickyBarWidth }),
    [page, setPage, scale, sidebarVisualWidth, stickyBarWidth],
  );
  return <AppPageContext.Provider value={value}>{children}</AppPageContext.Provider>;
}

export function useAppPage() {
  return useContext(AppPageContext) ?? FALLBACK;
}
