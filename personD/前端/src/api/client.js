import { getToken, getRefreshToken, saveTokens, clearTokens } from "./tokenStore.js";

const BASE_URL = import.meta.env.VITE_API_BASE || "/api";
const UNAUTHORIZED = 401;

export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

let refreshing = null;

async function rawFetch(path, { method = "GET", body, headers = {}, auth = true } = {}) {
  const finalHeaders = { ...headers };
  if (body !== undefined && !(body instanceof FormData)) {
    finalHeaders["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = getToken();
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: finalHeaders,
    body: body === undefined ? undefined : body instanceof FormData ? body : JSON.stringify(body),
  });

  let payload;
  try {
    payload = await response.json();
  } catch {
    throw new ApiError(response.status, `请求失败（HTTP ${response.status}）`);
  }
  if (payload?.code === 0) {
    return payload.data;
  }
  throw new ApiError(payload?.code ?? response.status, payload?.message || "请求失败");
}

async function tryRefresh() {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  refreshing =
    refreshing ||
    rawFetch("/auth/refresh", { method: "POST", body: { refreshToken }, auth: false })
      .then((data) => {
        saveTokens(data);
        return true;
      })
      .catch(() => {
        clearTokens();
        return false;
      })
      .finally(() => {
        refreshing = null;
      });
  return refreshing;
}

export async function apiFetch(path, options = {}) {
  try {
    return await rawFetch(path, options);
  } catch (error) {
    if (error instanceof ApiError && error.code === UNAUTHORIZED && options.auth !== false) {
      if (await tryRefresh()) {
        return rawFetch(path, options);
      }
    }
    throw error;
  }
}
