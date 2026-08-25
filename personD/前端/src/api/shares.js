import { apiFetch, ApiError } from "./client.js";

const FORBIDDEN = 40300;

function shareQuery(code) {
  return code ? `?code=${encodeURIComponent(code)}` : "";
}

export function createShare(workId, { permission = "VIEW", expireAt, accessCode } = {}) {
  return apiFetch(`/works/${workId}/shares`, {
    method: "POST",
    body: { permission, expireAt, accessCode },
  });
}

export function listWorkShares(workId) {
  return apiFetch(`/works/${workId}/shares`);
}

export function getShare(token, code) {
  return apiFetch(`/shares/${token}${shareQuery(code)}`, { auth: false });
}

export function updateShare(token, payload = {}, code) {
  return apiFetch(`/shares/${token}${shareQuery(code)}`, {
    method: "PUT",
    body: payload,
    auth: false,
  });
}

export async function probeShareEdit(token, code) {
  try {
    await updateShare(token, {}, code);
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
