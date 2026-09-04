import { apiFetch } from "./client.js";

export function consumeExport() {
  return apiFetch("/exports/consume", { method: "POST" });
}
