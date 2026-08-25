import { apiFetch } from "./client.js";

export function listWorks({ status, page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/works?${params.toString()}`);
}

export function getWork(id) {
  return apiFetch(`/works/${id}`);
}

export function createWork(payload = {}) {
  return apiFetch("/works", { method: "POST", body: payload });
}

export function updateWork(id, payload) {
  return apiFetch(`/works/${id}`, { method: "PUT", body: payload });
}

export function saveDraft(id, payload = {}) {
  return apiFetch(`/works/${id}/draft`, { method: "PUT", body: payload });
}

function setWorkStatus(id, target) {
  return apiFetch(`/works/${id}/status`, { method: "POST", body: { target } });
}

export function archiveWork(id) {
  return setWorkStatus(id, "ARCHIVED");
}

export function unarchiveWork(id) {
  return setWorkStatus(id, "DRAFT");
}

export function publishWork(id) {
  return apiFetch(`/works/${id}/publish`, { method: "POST" });
}

export function deleteWork(id) {
  return apiFetch(`/works/${id}`, { method: "DELETE" });
}

export function listTrashedWorks({ page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/works/trash?${params.toString()}`);
}

export function restoreWork(id) {
  return apiFetch(`/works/${id}/restore`, { method: "POST" });
}

export function purgeWork(id) {
  return apiFetch(`/works/${id}/purge`, { method: "DELETE" });
}

export function listFavoriteWorks({ page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/works/favorites?${params.toString()}`);
}

export function favoriteWork(id) {
  return apiFetch(`/works/${id}/favorite`, { method: "POST" });
}

export function unfavoriteWork(id) {
  return apiFetch(`/works/${id}/favorite`, { method: "DELETE" });
}

export function uploadWorkThumbnail(id, file) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch(`/works/${id}/thumbnail`, { method: "POST", body });
}
