import { apiFetch } from "./client.js";

export function listTeams() {
  return apiFetch("/teams");
}

export function getTeam(id) {
  return apiFetch(`/teams/${id}`);
}

export function createTeam(name) {
  return apiFetch("/teams", { method: "POST", body: { name } });
}

export function updateTeam(id, name) {
  return apiFetch(`/teams/${id}`, { method: "PUT", body: { name } });
}

export function deleteTeam(id) {
  return apiFetch(`/teams/${id}`, { method: "DELETE" });
}

export function listMembers(teamId) {
  return apiFetch(`/teams/${teamId}/members`);
}

export function inviteMember(teamId, username, role = "MEMBER") {
  return apiFetch(`/teams/${teamId}/members`, { method: "POST", body: { username, role } });
}

export function removeMember(teamId, userId) {
  return apiFetch(`/teams/${teamId}/members/${userId}`, { method: "DELETE" });
}

export function updateMemberRole(teamId, userId, role) {
  return apiFetch(`/teams/${teamId}/members/${userId}`, { method: "PUT", body: { role } });
}

export function listTeamWorks(teamId, { page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/teams/${teamId}/works?${params.toString()}`);
}

export function listTeamAssets(teamId, { page = 1, size = 12 } = {}) {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("size", String(size));
  return apiFetch(`/teams/${teamId}/assets?${params.toString()}`);
}
