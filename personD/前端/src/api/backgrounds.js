import { apiFetch } from "./client.js";

export function listBackgroundCategories() {
  return apiFetch("/backgrounds", { auth: false });
}
