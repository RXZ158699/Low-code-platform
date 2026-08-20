import { apiFetch } from "./client.js";

export function createShare(workId, { permission = "VIEW", expireAt } = {}) {
  return apiFetch(`/works/${workId}/shares`, {
    method: "POST",
    body: { permission, expireAt },
  });
}

export function listWorkShares(workId) {
  return apiFetch(`/works/${workId}/shares`);
}

export function getShare(token) {
  return apiFetch(`/shares/${token}`, { auth: false });
}

export function deleteShare(id) {
  return apiFetch(`/shares/${id}`, { method: "DELETE" });
}

export function sharePageUrl(token) {
  return `${window.location.origin}/share/${token}`;
}
