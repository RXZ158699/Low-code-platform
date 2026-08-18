import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as apiLogin, logout as apiLogout, fetchMe } from "../api/auth.js";
import { getToken } from "../api/tokenStore.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(() => !getToken());

  useEffect(() => {
    if (!getToken()) {
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== "dp.token") return;
      if (!event.newValue) {
        setUser(null);
        return;
      }
      fetchMe()
        .then(setUser)
        .catch(() => setUser(null));
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  const login = useCallback(async (username, password) => {
    const me = await apiLogin(username, password);
    setUser(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout }),
    [user, ready, login, logout],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth 必须在 <AuthProvider> 内使用");
  }
  return context;
}
