import { beforeEach, describe, expect, it, vi } from "vitest";
import { getWork, publishWork, updateWork } from "./works.js";
import { listHotTemplates } from "./templates.js";
import { updateMe, uploadAvatar } from "./users.js";
import { createTeam, inviteMember } from "./teams.js";
import { createShare, getShare } from "./shares.js";

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
});
