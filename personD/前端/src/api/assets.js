import { apiFetch } from "./client.js";

export function listAssets({ scope = "mine", fileType, page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (fileType) params.set("fileType", fileType);
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/assets?${params.toString()}`);
}

export function listAssetCategories({ scope = "mine", teamId } = {}) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (teamId) params.set("teamId", String(teamId));
  return apiFetch(`/assets/categories?${params.toString()}`);
}

export function uploadAsset(file, { fileType = "image" } = {}) {
  const body = new FormData();
  body.append("file", file);
  body.append("fileType", fileType);
  return apiFetch("/assets", { method: "POST", body });
}

export function deleteAsset(id) {
  return apiFetch(`/assets/${id}`, { method: "DELETE" });
}

export function getAsset(id) {
  return apiFetch(`/assets/${id}`);
}

export function updateAsset(id, payload) {
  return apiFetch(`/assets/${id}`, { method: "PUT", body: payload });
}

export function listTrashedAssets({ page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/assets/trash?${params.toString()}`);
}

export function restoreAsset(id) {
  return apiFetch(`/assets/${id}/restore`, { method: "POST" });
}

export function purgeAsset(id) {
  return apiFetch(`/assets/${id}/purge`, { method: "DELETE" });
}

export function listFavoriteAssets({ page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/assets/favorites?${params.toString()}`);
}

export function favoriteAsset(id) {
  return apiFetch(`/assets/${id}/favorite`, { method: "POST" });
}

export function unfavoriteAsset(id) {
  return apiFetch(`/assets/${id}/favorite`, { method: "DELETE" });
}
