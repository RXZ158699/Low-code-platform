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

export function listHotTemplates(limit = 8) {
  return apiFetch(`/templates/hot?limit=${limit}`, { auth: false });
}

export function createWorkFromTemplate(id) {
  return apiFetch(`/templates/${id}/use`, { method: "POST" });
}
