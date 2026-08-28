export const TABLE_LAYOUTS = [
  { id: "table-1x2", name: "一行两列", rows: 1, cols: 2 },
  { id: "table-2x1", name: "两行一列", rows: 2, cols: 1 },
  { id: "table-2x2", name: "两行两列", rows: 2, cols: 2 },
  { id: "table-3x2", name: "三行两列", rows: 3, cols: 2 },
  { id: "table-3x3", name: "三行三列", rows: 3, cols: 3 },
  { id: "table-header", name: "表头表格", rows: 2, cols: 3 },
];

export const TABLE_SECTIONS = [
  {
    title: "常用表格",
    layouts: TABLE_LAYOUTS,
  },
];

export function findTableLayout(ref) {
  if (typeof ref !== "string") return null;
  return TABLE_LAYOUTS.find((layout) => layout.id === ref) || null;
}
