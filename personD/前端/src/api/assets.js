import { apiFetch } from "./client.js";

export function listAssets({ scope = "mine", fileType, page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  params.set("scope", scope);
  if (fileType) params.set("fileType", fileType);
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/assets?${params.toString()}`);
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
