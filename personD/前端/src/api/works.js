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

export function publishWork(id) {
  return apiFetch(`/works/${id}/publish`, { method: "POST" });
}

export function deleteWork(id) {
  return apiFetch(`/works/${id}`, { method: "DELETE" });
}

export function uploadWorkThumbnail(id, file) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch(`/works/${id}/thumbnail`, { method: "POST", body });
}
