import { describe, expect, it } from "vitest";
import { mediaKind, MEDIA_ACCEPT } from "./mediaFile.js";

describe("mediaFile", () => {
  it("classifies images and videos for local upload", () => {
    expect(mediaKind(new File(["x"], "a.png", { type: "image/png" }))).toBe("image");
    expect(mediaKind(new File(["x"], "clip.mp4", { type: "video/mp4" }))).toBe("video");
    expect(mediaKind(new File(["x"], "note.txt", { type: "text/plain" }))).toBeNull();
    expect(MEDIA_ACCEPT).toContain("image/png");
    expect(MEDIA_ACCEPT).toContain("video/mp4");
  });
});
