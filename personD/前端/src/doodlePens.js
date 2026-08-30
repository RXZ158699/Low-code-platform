export const DOODLE_SECTIONS = [
  {
    title: "常用笔",
    pens: [
      {
        id: "marker",
        label: "马克笔",
        stroke: "#111827",
        strokeWidth: 5,
        opacity: 100,
        glow: 0,
        dash: null,
        mode: "marker",
      },
      {
        id: "watercolor",
        label: "水彩笔刷",
        stroke: "#38bdf8",
        strokeWidth: 10,
        opacity: 55,
        glow: 0,
        dash: null,
        mode: "watercolor",
      },
      {
        id: "pencil",
        label: "铅笔",
        stroke: "#6b7280",
        strokeWidth: 2,
        opacity: 70,
        glow: 0,
        dash: null,
        mode: "pencil",
      },
    ],
  },
  {
    title: "手绘笔",
    pens: [
      {
        id: "crayon",
        label: "蜡笔",
        stroke: "#f97316",
        strokeWidth: 7,
        opacity: 85,
        glow: 0,
        dash: null,
        mode: "crayon",
      },
      {
        id: "oil",
        label: "油画刷",
        stroke: "#65a30d",
        strokeWidth: 14,
        opacity: 80,
        glow: 0,
        dash: null,
        mode: "oil",
      },
      {
        id: "marker-thick",
        label: "记号笔",
        stroke: "#dc2626",
        strokeWidth: 9,
        opacity: 100,
        glow: 0,
        dash: null,
        mode: "marker-thick",
      },
    ],
  },
  {
    title: "书法笔",
    pens: [
      {
        id: "brush",
        label: "书法毛笔",
        stroke: "#111827",
        strokeWidth: 6,
        opacity: 90,
        glow: 0,
        dash: null,
        mode: "calligraphy",
      },
      {
        id: "colored",
        label: "彩铅",
        stroke: "#a855f7",
        strokeWidth: 2.5,
        opacity: 80,
        glow: 0,
        dash: null,
        mode: "colored",
      },
      {
        id: "highlighter",
        label: "荧光笔",
        stroke: "#facc15",
        strokeWidth: 14,
        opacity: 50,
        glow: 10,
        dash: null,
        mode: "highlighter",
      },
    ],
  },
  {
    title: "涂鸦笔",
    pens: [
      {
        id: "spray",
        label: "喷漆喷枪",
        stroke: "#0ea5e9",
        strokeWidth: 4,
        opacity: 75,
        glow: 0,
        dash: null,
        mode: "spray",
      },
      {
        id: "fountain",
        label: "钢笔",
        stroke: "#1d4ed8",
        strokeWidth: 2.5,
        opacity: 100,
        glow: 0,
        dash: null,
        mode: "fountain",
      },
    ],
  },
];

export function findDoodlePen(id) {
  for (const section of DOODLE_SECTIONS) {
    const pen = section.pens.find((item) => item.id === id);
    if (pen) return pen;
  }
  return null;
}

export function getDoodleProps(item) {
  const stroke =
    typeof item?.stroke === "string" && item.stroke
      ? item.stroke
      : "#111827";
  const strokeWidth = Number(item?.strokeWidth) > 0 ? Number(item.strokeWidth) : 5;
  const opacity = Number.isFinite(Number(item?.opacity))
    ? Math.min(100, Math.max(10, Number(item.opacity)))
    : 100;
  const glow = Number.isFinite(Number(item?.glow))
    ? Math.max(0, Number(item.glow))
    : 0;
  return {
    stroke,
    strokeWidth,
    opacity,
    glow,
    dash:
      typeof item?.dash === "string" && item.dash ? item.dash : null,
    mode:
      typeof item?.mode === "string" && item.mode ? item.mode : "marker",
  };
}
