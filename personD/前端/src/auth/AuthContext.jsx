import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { login as apiLogin, logout as apiLogout, fetchMe } from "../api/auth.js";
import { getCachedUser, getToken, saveUser, clearTokens } from "../api/tokenStore.js";
import { notifyAuthSync, subscribeAuthSync } from "./authSync.js";
import { isUnauthorized } from "../api/client.js";
import { isAdmin, isLoggedIn } from "./access.js";

const AuthContext = createContext(null);

function readLocalUser() {
  return getToken() ? getCachedUser() : null;
}

function sameUser(left, right) {
  if (left === right) return true;
  if (!left || !right) return false;
  return (
    left.id === right.id &&
    left.username === right.username &&
    left.nickname === right.nickname &&
    left.avatar === right.avatar &&
    left.role === right.role
  );
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => readLocalUser());
  const [ready, setReady] = useState(() => !getToken());
  const userRef = useRef(user);
  userRef.current = user;

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    const cached = getCachedUser();
    if (cached) {
      setUser(cached);
    }
    fetchMe()
      .then((me) => {
        if (!me) return;
        setUser(me);
        saveUser(me);
      })
      .catch((error) => {
        if (isUnauthorized(error)) {
          clearTokens();
          setUser(null);
          return;
        }
        const fallback = getToken() ? getCachedUser() : null;
        if (fallback) {
          setUser(fallback);
        }
      })
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    const applyLocalSession = () => {
      const nextUser = readLocalUser();
      const current = userRef.current;
      if (sameUser(current, nextUser)) {
        return;
      }
      setUser(nextUser);
    };

    const unsubscribe = subscribeAuthSync((nextUser) => {
      if (nextUser) {
        saveUser(nextUser);
      }
      applyLocalSession();
    });

    const handleStorage = (event) => {
      if (event.key && event.key !== "dp.token" && event.key !== "dp.user") {
        return;
      }
      applyLocalSession();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", applyLocalSession);
    document.addEventListener("visibilitychange", applyLocalSession);
    const timer = window.setInterval(applyLocalSession, 400);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", applyLocalSession);
      document.removeEventListener("visibilitychange", applyLocalSession);
      window.clearInterval(timer);
    };
  }, []);

  const login = useCallback(async (username, password) => {
    const me = await apiLogin(username, password);
    setUser(me);
    notifyAuthSync(me);
    return me;
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
    notifyAuthSync(null);
  }, []);

  const updateUser = useCallback((me) => {
    setUser(me);
    saveUser(me);
    notifyAuthSync(me);
  }, []);

  const value = useMemo(
    () => ({ user, ready, login, logout, updateUser, isAdmin: isAdmin(user), isLoggedIn: isLoggedIn(user) }),
    [user, ready, login, logout, updateUser],
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
