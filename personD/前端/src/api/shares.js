import { apiFetch, ApiError } from "./client.js";

const FORBIDDEN = 40300;

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

export function updateShare(token, payload = {}) {
  return apiFetch(`/shares/${token}`, { method: "PUT", body: payload, auth: false });
}

export async function probeShareEdit(token) {
  try {
    await updateShare(token, {});
    return true;
  } catch (error) {
    if (error instanceof ApiError && error.code === FORBIDDEN) {
      return false;
    }
    throw error;
  }
}

export function deleteShare(id) {
  return apiFetch(`/shares/${id}`, { method: "DELETE" });
}

export function sharePageUrl(token) {
  return `${window.location.origin}/share/${token}`;
}
