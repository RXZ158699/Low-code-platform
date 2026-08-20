import { apiFetch } from "./client.js";

export function listTeams() {
  return apiFetch("/teams");
}

export function createTeam(name) {
  return apiFetch("/teams", { method: "POST", body: { name } });
}

export function inviteMember(teamId, username) {
  return apiFetch(`/teams/${teamId}/members`, { method: "POST", body: { username } });
}
