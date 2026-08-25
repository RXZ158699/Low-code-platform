function cell(r, c, rs = 1, cs = 1) {
  return { r, c, rs, cs };
}

function occupied(merges, r, c) {
  return merges.some(
    (item) =>
      r >= item.r &&
      r < item.r + item.rs &&
      c >= item.c &&
      c < item.c + item.cs,
  );
}

function buildLayout(
  id,
  rowCount,
  colCount,
  merges = [],
  templates = {},
) {
  const cells = merges.map((item) => cell(item.r, item.c, item.rs, item.cs));
  for (let r = 1; r <= rowCount; r += 1) {
    for (let c = 1; c <= colCount; c += 1) {
      if (!occupied(merges, r, c)) cells.push(cell(r, c));
    }
  }
  return {
    id,
    rowCount,
    colCount,
    cells,
    colTemplate: templates.cols,
    rowTemplate: templates.rows,
  };
}

function strips(id, count, axis) {
  return axis === "h" ? buildLayout(id, count, 1) : buildLayout(id, 1, count);
}

function side(id, total, where) {
  const stack = total - 1;
  if (where === "left")
    return buildLayout(id, stack, 2, [{ r: 1, c: 1, rs: stack, cs: 1 }]);
  if (where === "right")
    return buildLayout(id, stack, 2, [{ r: 1, c: 2, rs: stack, cs: 1 }]);
  if (where === "top")
    return buildLayout(id, 2, stack, [{ r: 1, c: 1, rs: 1, cs: stack }]);
  return buildLayout(id, 2, stack, [{ r: 2, c: 1, rs: 1, cs: stack }]);
}

function grid(id, rows, cols, templates) {
  return buildLayout(id, rows, cols, [], templates);
}

function merge(id, rows, cols, ...rects) {
  return buildLayout(id, rows, cols, rects);
}

function framed(layout, frame) {
  return { ...layout, frame };
}

export function layoutCellCount(layout) {
  return layout.cells.length;
}

export function layoutCovers(layout) {
  const { rowCount, colCount, cells } = layout;
  const covered = Array.from({ length: rowCount }, () =>
    Array(colCount).fill(0),
  );
  for (const item of cells) {
    for (let r = item.r; r < item.r + item.rs; r += 1) {
      for (let c = item.c; c < item.c + item.cs; c += 1) {
        if (r < 1 || c < 1 || r > rowCount || c > colCount) return false;
        covered[r - 1][c - 1] += 1;
      }
    }
  }
  return covered.every((row) => row.every((value) => value === 1));
}

export const COLLAGE_SECTIONS = [
  {
    title: "1-图",
    layouts: [
      framed(buildLayout("1-square", 1, 1), "square"),
      framed(buildLayout("1-portrait", 1, 1), "portrait"),
      framed(buildLayout("1-landscape", 1, 1), "landscape"),
    ],
  },
  {
    title: "2-图",
    layouts: [
      strips("2-v", 2, "v"),
      strips("2-h", 2, "h"),
      grid("2-v-wide-l", 1, 2, { cols: "2fr 1fr" }),
      grid("2-v-wide-r", 1, 2, { cols: "1fr 2fr" }),
      grid("2-h-tall-t", 2, 1, { rows: "2fr 1fr" }),
      grid("2-h-tall-b", 2, 1, { rows: "1fr 2fr" }),
    ],
  },
  {
    title: "3-图",
    layouts: [
      strips("3-v", 3, "v"),
      strips("3-h", 3, "h"),
      side("3-left", 3, "left"),
      side("3-right", 3, "right"),
      side("3-top", 3, "top"),
      side("3-bottom", 3, "bottom"),
    ],
  },
  {
    title: "4-图",
    layouts: [
      grid("4-quad", 2, 2),
      strips("4-v", 4, "v"),
      strips("4-h", 4, "h"),
      side("4-left", 4, "left"),
      side("4-right", 4, "right"),
      side("4-top", 4, "top"),
      side("4-bottom", 4, "bottom"),
      grid("4-quad-wide-l", 2, 2, { cols: "2fr 1fr" }),
      grid("4-quad-wide-r", 2, 2, { cols: "1fr 2fr" }),
      grid("4-quad-tall-t", 2, 2, { rows: "2fr 1fr" }),
      grid("4-quad-tall-b", 2, 2, { rows: "1fr 2fr" }),
      merge(
        "4-stagger-a",
        3,
        2,
        { r: 1, c: 1, rs: 2, cs: 1 },
        { r: 2, c: 2, rs: 2, cs: 1 },
      ),
      merge(
        "4-stagger-b",
        3,
        2,
        { r: 1, c: 2, rs: 2, cs: 1 },
        { r: 2, c: 1, rs: 2, cs: 1 },
      ),
      merge(
        "4-top-left",
        3,
        2,
        { r: 1, c: 1, rs: 1, cs: 2 },
        { r: 2, c: 1, rs: 2, cs: 1 },
      ),
      merge(
        "4-left-bar",
        2,
        3,
        { r: 1, c: 1, rs: 2, cs: 1 },
        { r: 1, c: 2, rs: 1, cs: 2 },
      ),
    ],
  },
  {
    title: "5-图",
    layouts: [
      strips("5-v", 5, "v"),
      strips("5-h", 5, "h"),
      side("5-left", 5, "left"),
      side("5-right", 5, "right"),
      side("5-top", 5, "top"),
      side("5-bottom", 5, "bottom"),
      merge("5-23-left", 2, 3, { r: 1, c: 1, rs: 2, cs: 1 }),
      merge("5-23-right", 2, 3, { r: 1, c: 3, rs: 2, cs: 1 }),
      merge("5-23-top-l", 2, 3, { r: 1, c: 1, rs: 1, cs: 2 }),
      merge("5-23-bot-r", 2, 3, { r: 2, c: 2, rs: 1, cs: 2 }),
      merge("5-32-top", 3, 2, { r: 1, c: 1, rs: 1, cs: 2 }),
      merge("5-32-tl", 3, 2, { r: 1, c: 1, rs: 2, cs: 1 }),
    ],
  },
  {
    title: "6-图",
    layouts: [
      grid("6-23", 2, 3),
      grid("6-32", 3, 2),
      strips("6-v", 6, "v"),
      strips("6-h", 6, "h"),
      side("6-left", 6, "left"),
      side("6-right", 6, "right"),
      side("6-top", 6, "top"),
      side("6-bottom", 6, "bottom"),
      merge("6-33-tl", 3, 3, { r: 1, c: 1, rs: 2, cs: 2 }),
      merge("6-33-tr", 3, 3, { r: 1, c: 2, rs: 2, cs: 2 }),
      merge("6-33-bl", 3, 3, { r: 2, c: 1, rs: 2, cs: 2 }),
      merge("6-33-br", 3, 3, { r: 2, c: 2, rs: 2, cs: 2 }),
    ],
  },
  {
    title: "7-图",
    layouts: [
      strips("7-v", 7, "v"),
      strips("7-h", 7, "h"),
      side("7-left", 7, "left"),
      side("7-right", 7, "right"),
      side("7-top", 7, "top"),
      side("7-bottom", 7, "bottom"),
      merge("7-24-left", 2, 4, { r: 1, c: 1, rs: 2, cs: 1 }),
      merge("7-24-right", 2, 4, { r: 1, c: 4, rs: 2, cs: 1 }),
      merge(
        "7-33-a",
        3,
        3,
        { r: 1, c: 1, rs: 1, cs: 2 },
        { r: 3, c: 2, rs: 1, cs: 2 },
      ),
      merge(
        "7-33-b",
        3,
        3,
        { r: 1, c: 2, rs: 1, cs: 2 },
        { r: 3, c: 1, rs: 1, cs: 2 },
      ),
    ],
  },
  {
    title: "8-图",
    layouts: [
      grid("8-24", 2, 4),
      grid("8-42", 4, 2),
      strips("8-v", 8, "v"),
      strips("8-h", 8, "h"),
      side("8-left", 8, "left"),
      side("8-right", 8, "right"),
      side("8-top", 8, "top"),
      side("8-bottom", 8, "bottom"),
      merge("8-33-top", 3, 3, { r: 1, c: 1, rs: 1, cs: 2 }),
      merge("8-33-left", 3, 3, { r: 1, c: 1, rs: 2, cs: 1 }),
      merge("8-33-right", 3, 3, { r: 1, c: 3, rs: 2, cs: 1 }),
    ],
  },
  {
    title: "9-图",
    layouts: [
      grid("9-33", 3, 3),
      side("9-left", 9, "left"),
      grid("9-33-wide", 3, 3, { cols: "2fr 1fr 1fr" }),
    ],
  },
  {
    title: "10-图",
    layouts: [
      grid("10-25", 2, 5),
      grid("10-52", 5, 2),
      strips("10-v", 10, "v"),
      strips("10-h", 10, "h"),
      side("10-left", 10, "left"),
      side("10-right", 10, "right"),
      side("10-top", 10, "top"),
      side("10-bottom", 10, "bottom"),
      merge(
        "10-34-tl",
        3,
        4,
        { r: 1, c: 1, rs: 2, cs: 1 },
        { r: 2, c: 4, rs: 2, cs: 1 },
      ),
    ],
  },
  {
    title: "11-图",
    layouts: [
      merge("11-34", 3, 4, { r: 1, c: 1, rs: 2, cs: 1 }),
      side("11-left", 11, "left"),
      side("11-top", 11, "top"),
    ],
  },
  {
    title: "12-图",
    layouts: [
      grid("12-34", 3, 4),
      grid("12-43", 4, 3),
      grid("12-26", 2, 6),
      grid("12-62", 6, 2),
      merge(
        "12-44-tl",
        4,
        4,
        { r: 1, c: 1, rs: 2, cs: 2 },
        { r: 1, c: 3, rs: 2, cs: 1 },
      ),
    ],
  },
  {
    title: "13-图",
    layouts: [
      merge(
        "13-35",
        3,
        5,
        { r: 1, c: 1, rs: 2, cs: 1 },
        { r: 2, c: 5, rs: 2, cs: 1 },
      ),
      side("13-left", 13, "left"),
    ],
  },
  {
    title: "14-图",
    layouts: [grid("14-27", 2, 7)],
  },
  {
    title: "15-图",
    layouts: [grid("15-35", 3, 5), grid("15-53", 5, 3)],
  },
  {
    title: "16-图",
    layouts: [grid("16-44", 4, 4)],
  },
];

export const COLLAGE_GAP = 8;
export const COLLAGE_PLACEHOLDER = "#c4c4c4";

export function collageGap(item) {
  if (item?.seamless) return 0;
  const gap = Number(item?.gap);
  return Number.isFinite(gap) && gap >= 0 ? gap : COLLAGE_GAP;
}

export function collagePadding(item) {
  const padding = Number(item?.padding);
  return Number.isFinite(padding) && padding >= 0 ? padding : 0;
}

export function findCollageLayout(id) {
  for (const section of COLLAGE_SECTIONS) {
    const layout = section.layouts.find((item) => item.id === id);
    if (layout) return layout;
  }
  return null;
}

function trackWeights(template, count) {
  if (!template) return Array.from({ length: count }, () => 1);
  const parts = String(template).trim().split(/\s+/);
  const weights = parts.map((part) => {
    const match = part.match(/^([\d.]+)fr$/i);
    return match ? Number(match[1]) : 1;
  });
  while (weights.length < count) weights.push(1);
  return weights.slice(0, count);
}

function trackOffsets(weights, total, gap) {
  const gapTotal = gap * Math.max(0, weights.length - 1);
  const free = Math.max(0, total - gapTotal);
  const sum = weights.reduce((acc, value) => acc + value, 0) || 1;
  const sizes = weights.map((value) => (value / sum) * free);
  const starts = [];
  let cursor = 0;
  for (const size of sizes) {
    starts.push(cursor);
    cursor += size + gap;
  }
  return { sizes, starts };
}

export function collageCellBoxes(item) {
  const gap = collageGap(item);
  const padding = collagePadding(item);
  const width = Math.max(0, (Number(item.width) || 0) - padding * 2);
  const height = Math.max(0, (Number(item.height) || 0) - padding * 2);
  const cols = trackOffsets(
    trackWeights(item.colTemplate, item.colCount),
    width,
    gap,
  );
  const rows = trackOffsets(
    trackWeights(item.rowTemplate, item.rowCount),
    height,
    gap,
  );
  const originX = (Number(item.x) || 0) + padding;
  const originY = (Number(item.y) || 0) + padding;
  return (item.cells || []).map((cell) => {
    const c0 = Math.max(0, (cell.c || 1) - 1);
    const r0 = Math.max(0, (cell.r || 1) - 1);
    const cs = cell.cs || 1;
    const rs = cell.rs || 1;
    let boxWidth = 0;
    let boxHeight = 0;
    for (let i = 0; i < cs; i += 1) {
      boxWidth += (cols.sizes[c0 + i] || 0) + (i > 0 ? gap : 0);
    }
    for (let i = 0; i < rs; i += 1) {
      boxHeight += (rows.sizes[r0 + i] || 0) + (i > 0 ? gap : 0);
    }
    return {
      x: originX + (cols.starts[c0] || 0),
      y: originY + (rows.starts[r0] || 0),
      width: boxWidth,
      height: boxHeight,
    };
  });
}
