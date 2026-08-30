import { describe, expect, it } from "vitest";
import {
  DOODLE_SECTIONS,
  findDoodlePen,
  getDoodleProps,
} from "./doodlePens.js";

describe("doodle pens", () => {
  it("provides multiple categorized pens", () => {
    expect(DOODLE_SECTIONS.length).toBeGreaterThanOrEqual(3);
    for (const section of DOODLE_SECTIONS) {
      expect(section.pens.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("finds a pen and normalizes its stroke props", () => {
    const pen = findDoodlePen("marker");
    expect(pen).toBeTruthy();
    expect(getDoodleProps(pen)).toMatchObject({
      stroke: "#111827",
      strokeWidth: 5,
      mode: "marker",
    });
    expect(getDoodleProps({})).toMatchObject({
      stroke: "#111827",
      strokeWidth: 5,
      opacity: 100,
      glow: 0,
    });
    expect(findDoodlePen("missing")).toBeNull();
  });
});
