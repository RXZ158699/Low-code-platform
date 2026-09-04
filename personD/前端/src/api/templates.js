import { apiFetch } from "./client.js";

export function listTemplates({ category, keyword, tag, page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  if (category) params.set("category", category);
  if (keyword) params.set("keyword", keyword);
  if (tag) params.set("tag", tag);
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/templates?${params.toString()}`, { auth: false });
}

export function listMyTemplates({ category, keyword, tag, page = 1, size = 50 } = {}) {
  const params = new URLSearchParams();
  params.set("mine", "true");
  if (category) params.set("category", category);
  if (keyword) params.set("keyword", keyword);
  if (tag) params.set("tag", tag);
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/templates?${params.toString()}`);
}

export function listHotTemplates(limit = 8) {
  return apiFetch(`/templates/hot?limit=${limit}`, { auth: false });
}

export function getTemplate(id) {
  return apiFetch(`/templates/${id}`, { auth: false });
}

export function createTemplate(payload) {
  return apiFetch("/templates", { method: "POST", body: payload });
}

export function updateTemplate(id, payload) {
  return apiFetch(`/templates/${id}`, { method: "PUT", body: payload });
}

export function deleteTemplate(id) {
  return apiFetch(`/templates/${id}`, { method: "DELETE" });
}

export function uploadTemplateCover(id, file) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch(`/templates/${id}/cover`, { method: "POST", body });
}

export function favoriteTemplate(id) {
  return apiFetch(`/templates/${id}/favorite`, { method: "POST" });
}

export function unfavoriteTemplate(id) {
  return apiFetch(`/templates/${id}/favorite`, { method: "DELETE" });
}

export function createWorkFromTemplate(id) {
  return apiFetch(`/templates/${id}/use`, { method: "POST" });
}
