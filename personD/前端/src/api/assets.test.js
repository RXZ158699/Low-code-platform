import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadAsset, listAssets } from "./assets.js";

function jsonResponse(payload) {
  return Promise.resolve({
    json: () => Promise.resolve(payload),
  });
}

describe("assets api", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it("lists mine image assets", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ code: 0, data: { total: 0, records: [] } }));
    vi.stubGlobal("fetch", fetchMock);

    await listAssets({ fileType: "image", page: 1, size: 24 });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/assets?scope=mine&fileType=image&page=1&size=24");
  });

  it("uploads an image as multipart without forcing JSON content-type", async () => {
    const fetchMock = vi.fn(() => jsonResponse({ code: 0, data: { id: 8, fileName: "a.png" } }));
    vi.stubGlobal("fetch", fetchMock);
    const file = new File(["png"], "a.png", { type: "image/png" });

    const data = await uploadAsset(file);

    expect(data).toEqual({ id: 8, fileName: "a.png" });
    const [, options] = fetchMock.mock.calls[0];
    expect(options.method).toBe("POST");
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.body.get("fileType")).toBe("image");
    expect(options.body.get("file")).toBe(file);
    expect(options.headers["Content-Type"]).toBeUndefined();
  });
});
