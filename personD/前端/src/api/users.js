import { apiFetch } from "./client.js";

export function updateMe(payload) {
  return apiFetch("/users/me", { method: "PUT", body: payload });
}

export function uploadAvatar(file) {
  const body = new FormData();
  body.append("file", file);
  return apiFetch("/users/me/avatar", { method: "POST", body });
}
