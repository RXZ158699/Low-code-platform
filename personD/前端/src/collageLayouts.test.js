import {
  COLLAGE_SECTIONS,
  collageCellBoxes,
  layoutCellCount,
  layoutCovers,
} from "./collageLayouts.js";

describe("collageLayouts", () => {
  it("tessellates every thumbnail without gaps or overlap", () => {
    const broken = [];
    for (const section of COLLAGE_SECTIONS) {
      for (const layout of section.layouts) {
        if (!layoutCovers(layout)) broken.push(layout.id);
      }
    }
    expect(broken).toEqual([]);
  });

  it("keeps cell counts inside each section heading", () => {
    const range = (title) => {
      const single = title.match(/^(\d+)-图$/);
      if (single) {
        const n = Number(single[1]);
        return { min: n, max: n };
      }
      return null;
    };

    const broken = [];
    for (const section of COLLAGE_SECTIONS) {
      const bounds = range(section.title);
      expect(bounds).not.toBeNull();
      for (const layout of section.layouts) {
        const count = layoutCellCount(layout);
        if (count < bounds.min || count > bounds.max) {
          broken.push(`${layout.id}:${count}`);
        }
      }
    }
    expect(broken).toEqual([]);
  });

  it("groups layouts from 1-图 through 16-图", () => {
    expect(COLLAGE_SECTIONS.map((section) => section.title)).toEqual(
      Array.from({ length: 16 }, (_, index) => `${index + 1}-图`),
    );
  });

  it("insets cell boxes by outer padding and drops the inner gap in seamless mode", () => {
    const item = {
      x: 10,
      y: 20,
      width: 200,
      height: 100,
      rowCount: 1,
      colCount: 2,
      padding: 10,
      gap: 20,
      seamless: true,
      cells: [
        { r: 1, c: 1, rs: 1, cs: 1 },
        { r: 1, c: 2, rs: 1, cs: 1 },
      ],
    };
    const boxes = collageCellBoxes(item);
    expect(boxes[0]).toMatchObject({ x: 20, y: 30, width: 90, height: 80 });
    expect(boxes[1]).toMatchObject({ x: 110, y: 30, width: 90, height: 80 });
  });
});
