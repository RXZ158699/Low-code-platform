import { apiFetch } from "./client.js";
import { saveTokens, clearTokens, getToken, saveUser } from "./tokenStore.js";

export async function login(username, password) {
  const data = await apiFetch("/auth/login", {
    method: "POST",
    body: { username, password },
    auth: false,
  });
  saveTokens(data);
  saveUser(data.user);
  return data.user;
}

export async function register(username, password, nickname) {
  return apiFetch("/auth/register", {
    method: "POST",
    body: { username, password, nickname },
    auth: false,
  });
}

export async function fetchMe() {
  return apiFetch("/auth/me");
}

export async function logout() {
  try {
    if (getToken()) {
      await apiFetch("/auth/logout", { method: "POST" });
    }
  } finally {
    clearTokens();
  }
}
