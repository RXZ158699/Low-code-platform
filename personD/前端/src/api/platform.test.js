import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWork, publishWork, updateWork, uploadWorkThumbnail } from "./works.js";
import { listHotTemplates } from "./templates.js";
import { updateMe, uploadAvatar } from "./users.js";
import {
  createTeam,
  deleteTeam,
  getTeam,
  inviteMember,
  listMembers,
  listTeamAssets,
  listTeamWorks,
  removeMember,
  updateTeam,
} from "./teams.js";
import { createShare, deleteShare, getShare, listWorkShares, probeShareEdit, updateShare } from "./shares.js";

function jsonResponse(payload) {
  return Promise.resolve({
    json: () => Promise.resolve(payload),
  });
}

describe("api modules", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("loads a work by id", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ code: 0, data: { id: 9, title: "海报" } }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(getWork(9)).resolves.toEqual({ id: 9, title: "海报" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/works/9");
  });

  it("saves a draft and publishes", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { id: 9, title: "新标题" } }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { id: 9, status: "PUBLISHED" } }));
    vi.stubGlobal("fetch", fetchMock);

    await updateWork(9, { title: "新标题", canvasJson: "{}" });
    await publishWork(9);

    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/works/9/publish");
  });

  it("uploads a work thumbnail as multipart", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ code: 0, data: { id: 9, thumbnailUrl: "http://cdn/a.png" } }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["x"], "thumbnail.png", { type: "image/png" });
    await expect(uploadWorkThumbnail(9, file)).resolves.toEqual({ id: 9, thumbnailUrl: "http://cdn/a.png" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/works/9/thumbnail");
    expect(fetchMock.mock.calls[0][1].method).toBe("POST");
    expect(fetchMock.mock.calls[0][1].body).toBeInstanceOf(FormData);
  });

  it("requests hot templates without auth", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ code: 0, data: [] }));
    vi.stubGlobal("fetch", fetchMock);
    await listHotTemplates(8);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/templates/hot?limit=8");
  });

  it("updates profile and uploads avatar as multipart", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { nickname: "新昵称" } }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { avatar: "http://a/b.png" } }));
    vi.stubGlobal("fetch", fetchMock);

    await updateMe({ nickname: "新昵称" });
    const file = new File(["x"], "a.png", { type: "image/png" });
    await uploadAvatar(file);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/users/me");
    expect(fetchMock.mock.calls[1][1].body).toBeInstanceOf(FormData);
  });

  it("creates a team and invites by username", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { id: 1, name: "设计组" } }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { userId: 2 } }));
    vi.stubGlobal("fetch", fetchMock);

    await createTeam("设计组");
    await inviteMember(1, "demo");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/teams");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/teams/1/members");
  });

  it("loads team detail, members, works and assets", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { id: 1, name: "设计组", myRole: "OWNER" } }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: [{ userId: 2, username: "demo", role: "OWNER" }] }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { records: [{ id: 9, title: "海报" }] } }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { records: [{ id: 8, fileName: "a.png" }] } }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(getTeam(1)).resolves.toEqual({ id: 1, name: "设计组", myRole: "OWNER" });
    await expect(listMembers(1)).resolves.toEqual([{ userId: 2, username: "demo", role: "OWNER" }]);
    await listTeamWorks(1, { page: 1, size: 24 });
    await listTeamAssets(1, { page: 1, size: 24 });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/teams/1");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/teams/1/members");
    expect(fetchMock.mock.calls[2][0]).toBe("/api/teams/1/works?page=1&size=24");
    expect(fetchMock.mock.calls[3][0]).toBe("/api/teams/1/assets?page=1&size=24");
  });

  it("renames, kicks a member and deletes a team", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { id: 1, name: "新组" } }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: null }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await updateTeam(1, "新组");
    await removeMember(1, 3);
    await deleteTeam(1);

    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(fetchMock.mock.calls[0][1].body).toBe(JSON.stringify({ name: "新组" }));
    expect(fetchMock.mock.calls[1][0]).toBe("/api/teams/1/members/3");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
    expect(fetchMock.mock.calls[2][0]).toBe("/api/teams/1");
    expect(fetchMock.mock.calls[2][1].method).toBe("DELETE");
  });

  it("creates and opens a share link", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { token: "abc", permission: "VIEW" } }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { id: 9, title: "海报" } }));
    vi.stubGlobal("fetch", fetchMock);

    await createShare(9, { permission: "VIEW" });
    await getShare("abc");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/works/9/shares");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/shares/abc");
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBeUndefined();
  });

  it("lists and revokes share links for a work", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: [{ id: 4, token: "abc", permission: "VIEW" }] }))
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: null }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(listWorkShares(9)).resolves.toEqual([{ id: 4, token: "abc", permission: "VIEW" }]);
    await deleteShare(4);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/works/9/shares");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/shares/4");
    expect(fetchMock.mock.calls[1][1].method).toBe("DELETE");
  });

  it("saves a shared canvas without auth and probes edit permission", async () => {
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(() => jsonResponse({ code: 0, data: { id: 9, title: "海报" } }))
      .mockImplementationOnce(() => jsonResponse({ code: 40300, message: "无权限" }));
    vi.stubGlobal("fetch", fetchMock);

    await updateShare("abc", { title: "海报", canvasJson: "{}" });
    await expect(probeShareEdit("abc")).resolves.toBe(false);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/shares/abc");
    expect(fetchMock.mock.calls[0][1].method).toBe("PUT");
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined();
    expect(fetchMock.mock.calls[1][1].method).toBe("PUT");
  });
});
