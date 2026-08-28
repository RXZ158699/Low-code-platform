export const BUBBLE_PAD_X = 26;
export const BUBBLE_PAD_TOP = 20;
export const BUBBLE_PAD_BOTTOM = 36;

export const BUBBLE_TEXT_SECTIONS = [
  {
    title: "毕业季",
    presets: [
      {
        id: "graduate-mortar",
        label: "学士帽",
        sample: "毕",
        text: "毕业快乐",
        textStyle: {
          fontSize: 44,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#4c1d95",
          strokeWidth: 2,
          shadowEnabled: true,
          shadowColor: "#4c1d95",
          shadowY: 5,
          shadowBlur: 0,
        },
        bubble: { kind: "rounded", fill: "#7c3aed", stroke: "#4c1d95", radius: 18 },
      },
      {
        id: "graduate-memory",
        label: "青春纪念",
        sample: "青",
        text: "青春不散场",
        textStyle: {
          fontSize: 40,
          color: "#1e3a8a",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 2,
          shadowEnabled: true,
          shadowColor: "#93c5fd",
          shadowY: 4,
          shadowBlur: 8,
        },
        bubble: { kind: "speech", fill: "#dbeafe", stroke: "#1e3a8a", radius: 18 },
      },
      {
        id: "graduate-farewell",
        label: "青春寄语",
        sample: "寄",
        text: "前程似锦",
        textStyle: {
          fontSize: 40,
          color: "#4c1d95",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 2,
          shadowEnabled: true,
          shadowColor: "#c4b5fd",
          shadowY: 4,
          shadowBlur: 8,
        },
        bubble: { kind: "halo", fill: "#ede9fe", stroke: "#7c3aed", radius: 20 },
      },
    ],
  },
  {
    title: "生日",
    presets: [
      {
        id: "birthday-burst",
        label: "生日祝福",
        sample: "生",
        text: "生日快乐",
        textStyle: {
          fontSize: 42,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#be185d",
          strokeWidth: 2,
        },
        bubble: { kind: "burst", fill: "#ec4899", stroke: "#be185d", radius: 18 },
      },
      {
        id: "birthday-cake",
        label: "蛋糕贴",
        sample: "糕",
        text: "许愿啦",
        textStyle: {
          fontSize: 40,
          color: "#9d174d",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
        },
        bubble: { kind: "sticker", fill: "#fbcfe8", stroke: "#ec4899", radius: 16 },
      },
      {
        id: "birthday-balloon",
        label: "生日气球",
        sample: "气",
        text: "愿望成真",
        textStyle: {
          fontSize: 38,
          color: "#be185d",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 1.5,
        },
        bubble: { kind: "halo", fill: "#fce7f3", stroke: "#db2777", radius: 22 },
      },
    ],
  },
  {
    title: "节气",
    presets: [
      {
        id: "solar-spring",
        label: "春分",
        sample: "春",
        text: "春分至",
        textStyle: {
          fontSize: 40,
          color: "#14532d",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
        },
        bubble: { kind: "tag", fill: "#bbf7d0", stroke: "#16a34a", radius: 14 },
      },
      {
        id: "solar-winter",
        label: "冬至",
        sample: "冬",
        text: "冬至安康",
        textStyle: {
          fontSize: 40,
          color: "#1e3a8a",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 1.5,
        },
        bubble: { kind: "cloud", fill: "#bfdbfe", stroke: "#1d4ed8", radius: 22 },
      },
      {
        id: "solar-frost",
        label: "霜降",
        sample: "霜",
        text: "霜降天凉",
        textStyle: {
          fontSize: 38,
          color: "#0c4a6e",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          shadowEnabled: true,
          shadowColor: "#7dd3fc",
          shadowY: 3,
          shadowBlur: 6,
        },
        bubble: { kind: "card", fill: "#e0f2fe", stroke: "#0284c7", radius: 14 },
      },
    ],
  },
  {
    title: "价格标签",
    presets: [
      {
        id: "price-limited",
        label: "限时价",
        sample: "限",
        text: "限时特价",
        textStyle: {
          fontSize: 42,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#b91c1c",
          strokeWidth: 2,
        },
        bubble: { kind: "tag", fill: "#ef4444", stroke: "#b91c1c", radius: 14 },
      },
      {
        id: "price-shock",
        label: "惊爆价",
        sample: "惊",
        text: "惊爆价",
        textStyle: {
          fontSize: 44,
          color: "#7c2d12",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 2,
        },
        bubble: { kind: "sticker", fill: "#fde68a", stroke: "#f59e0b", radius: 16 },
      },
      {
        id: "price-gift",
        label: "买一送一",
        sample: "送",
        text: "买一送一",
        textStyle: {
          fontSize: 40,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#c2410c",
          strokeWidth: 2,
        },
        bubble: { kind: "ribbon", fill: "#fb923c", stroke: "#c2410c", radius: 12 },
      },
    ],
  },
  {
    title: "复古",
    presets: [
      {
        id: "retro-time",
        label: "旧时光",
        sample: "旧",
        text: "旧时光",
        textStyle: {
          fontSize: 40,
          color: "#78350f",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          shadowEnabled: true,
          shadowColor: "#a16207",
          shadowY: 3,
          shadowBlur: 0,
        },
        bubble: { kind: "ribbon", fill: "#fed7aa", stroke: "#b45309", radius: 12 },
      },
      {
        id: "retro-stamp",
        label: "复古邮戳",
        sample: "邮",
        text: "岁月留痕",
        textStyle: {
          fontSize: 36,
          color: "#7c2d12",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 3,
          strokeEnabled: true,
          strokeColor: "#7c2d12",
          strokeWidth: 1.5,
        },
        bubble: { kind: "stamp", fill: "#fef3c7", stroke: "#92400e", radius: 14, dashed: true },
      },
      {
        id: "retro-album",
        label: "复古相册",
        sample: "册",
        text: "旧日相册",
        textStyle: {
          fontSize: 38,
          color: "#78350f",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#fef3c7",
          strokeWidth: 2,
        },
        bubble: { kind: "card", fill: "#a16207", stroke: "#713f12", radius: 12 },
      },
    ],
  },
  {
    title: "综艺",
    presets: [
      {
        id: "show-headline",
        label: "综艺头条",
        sample: "综",
        text: "综艺头条",
        textStyle: {
          fontSize: 44,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#ea580c",
          strokeWidth: 2,
          shadowEnabled: true,
          shadowColor: "#c2410c",
          shadowY: 4,
          shadowBlur: 0,
        },
        bubble: { kind: "ribbon", fill: "#f97316", stroke: "#c2410c", radius: 12 },
      },
      {
        id: "show-danmaku",
        label: "爆笑弹幕",
        sample: "笑",
        text: "哈哈哈哈",
        textStyle: {
          fontSize: 38,
          color: "#111827",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 2,
        },
        bubble: { kind: "speech", fill: "#ffffff", stroke: "#111827", radius: 18 },
      },
      {
        id: "show-sticker",
        label: "综艺贴纸",
        sample: "贴",
        text: "笑料不断",
        textStyle: {
          fontSize: 38,
          color: "#9a3412",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 2,
        },
        bubble: { kind: "sticker", fill: "#fed7aa", stroke: "#ea580c", radius: 16 },
      },
    ],
  },
  {
    title: "杂质风",
    presets: [
      {
        id: "zine-fashion",
        label: "潮流杂志",
        sample: "潮",
        text: "潮流前线",
        textStyle: {
          fontSize: 42,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#000000",
          strokeWidth: 1.5,
        },
        bubble: { kind: "card", fill: "#111827", stroke: "#000000", radius: 10 },
      },
      {
        id: "zine-poster",
        label: "大字报",
        sample: "报",
        text: "特别报道",
        textStyle: {
          fontSize: 44,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#b91c1c",
          strokeWidth: 2,
        },
        bubble: { kind: "burst", fill: "#dc2626", stroke: "#991b1b", radius: 16 },
      },
      {
        id: "zine-idea",
        label: "灵感贴",
        sample: "灵",
        text: "灵感闪现",
        textStyle: {
          fontSize: 38,
          color: "#111827",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 1.5,
        },
        bubble: { kind: "tag", fill: "#e5e7eb", stroke: "#111827", radius: 14 },
      },
    ],
  },
  {
    title: "爆炸贴",
    presets: [
      {
        id: "boom-main",
        label: "爆炸贴",
        sample: "爆",
        text: "火爆上新",
        textStyle: {
          fontSize: 46,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#c2410c",
          strokeWidth: 2,
        },
        bubble: { kind: "burst", fill: "#f97316", stroke: "#c2410c", radius: 18 },
      },
      {
        id: "boom-hot",
        label: "热点爆炸",
        sample: "热",
        text: "热点爆了",
        textStyle: {
          fontSize: 42,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#b91c1c",
          strokeWidth: 2,
        },
        bubble: { kind: "speech", fill: "#ef4444", stroke: "#991b1b", radius: 18 },
      },
      {
        id: "boom-recommend",
        label: "爆款推荐",
        sample: "荐",
        text: "爆款推荐",
        textStyle: {
          fontSize: 42,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 1,
          strokeEnabled: true,
          strokeColor: "#b91c1c",
          strokeWidth: 2,
        },
        bubble: { kind: "burst", fill: "#facc15", stroke: "#ca8a04", radius: 18 },
      },
    ],
  },
  {
    title: "印章",
    presets: [
      {
        id: "seal-official",
        label: "官方印章",
        sample: "印",
        text: "官方认证",
        textStyle: {
          fontSize: 34,
          color: "#dc2626",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 3,
        },
        bubble: { kind: "stamp", fill: "#fef2f2", stroke: "#dc2626", radius: 16, dashed: true },
      },
      {
        id: "seal-retro",
        label: "复古印章",
        sample: "古",
        text: "匠心手作",
        textStyle: {
          fontSize: 34,
          color: "#92400e",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 3,
        },
        bubble: { kind: "stamp", fill: "#fffbeb", stroke: "#92400e", radius: 16, dashed: true },
      },
      {
        id: "seal-limited",
        label: "绝版印章",
        sample: "绝",
        text: "绝版珍藏",
        textStyle: {
          fontSize: 34,
          color: "#b91c1c",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 3,
          strokeEnabled: true,
          strokeColor: "#b91c1c",
          strokeWidth: 1.5,
        },
        bubble: { kind: "stamp", fill: "#fef2f2", stroke: "#b91c1c", radius: 16, dashed: true },
      },
    ],
  },
  {
    title: "开工大吉",
    presets: [
      {
        id: "work-start",
        label: "开工大吉",
        sample: "开",
        text: "开工大吉",
        textStyle: {
          fontSize: 48,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#b91c1c",
          strokeWidth: 2,
          shadowEnabled: true,
          shadowColor: "#7f1d1d",
          shadowY: 5,
          shadowBlur: 0,
        },
        bubble: { kind: "speech", fill: "#dc2626", stroke: "#991b1b", radius: 20 },
      },
      {
        id: "work-gold",
        label: "开工贴",
        sample: "旺",
        text: "财源广进",
        textStyle: {
          fontSize: 42,
          color: "#78350f",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#ffffff",
          strokeWidth: 1.5,
        },
        bubble: { kind: "ribbon", fill: "#fbbf24", stroke: "#b45309", radius: 14 },
      },
      {
        id: "work-redpacket",
        label: "开工红包",
        sample: "包",
        text: "开工红包",
        textStyle: {
          fontSize: 42,
          color: "#ffffff",
          fontWeight: 700,
          textAlign: "center",
          letterSpacing: 2,
          strokeEnabled: true,
          strokeColor: "#be123c",
          strokeWidth: 2,
          shadowEnabled: true,
          shadowColor: "#881337",
          shadowY: 4,
          shadowBlur: 0,
        },
        bubble: { kind: "card", fill: "#e11d48", stroke: "#9f1239", radius: 14 },
      },
    ],
  },
];

export function findBubbleTextPreset(id) {
  for (const section of BUBBLE_TEXT_SECTIONS) {
    const preset = section.presets.find((item) => item.id === id);
    if (preset) return preset;
  }
  return null;
}

export function getBubbleProps(item) {
  const bubble = item?.bubble;
  if (!bubble || typeof bubble !== "object") return null;
  return {
    kind: bubble.kind || "rounded",
    fill: typeof bubble.fill === "string" ? bubble.fill : "#ffffff",
    stroke: typeof bubble.stroke === "string" ? bubble.stroke : "#d1d5db",
    strokeWidth: Number(bubble.strokeWidth) > 0 ? Number(bubble.strokeWidth) : 2,
    radius: Number.isFinite(Number(bubble.radius))
      ? Math.max(0, Number(bubble.radius))
      : 16,
    dashed: Boolean(bubble.dashed),
    accent: typeof bubble.accent === "string" ? bubble.accent : bubble.stroke,
  };
}

function roundedPath(width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  return [
    `M ${r} 0`,
    `H ${width - r}`,
    `Q ${width} 0 ${width} ${r}`,
    `V ${height - r}`,
    `Q ${width} ${height} ${width - r} ${height}`,
    `H ${r}`,
    `Q 0 ${height} 0 ${height - r}`,
    `V ${r}`,
    `Q 0 0 ${r} 0`,
    "Z",
  ].join(" ");
}

function starPath(width, height, points) {
  const cx = width / 2;
  const cy = height / 2;
  const outer = Math.min(width, height) / 2 - 2;
  const inner = outer * 0.62;
  const count = Math.max(6, points);
  const parts = [];
  for (let index = 0; index < count * 2; index += 1) {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = (Math.PI * index) / count - Math.PI / 2;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    parts.push(`${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  return `${parts.join(" ")} Z`;
}

export function bubblePath(kind, width, height, props = {}) {
  const w = Math.max(1, Number(width) || 1);
  const h = Math.max(1, Number(height) || 1);
  const r = Number(props.radius) || 16;
  if (kind === "speech") {
    const tail = Math.min(22, h * 0.18);
    const base = roundedPath(w, h - tail, r);
    const tailX = w * 0.42;
    return `${base} M ${tailX} ${h - tail} L ${tailX - 14} ${h} L ${tailX + 22} ${h - tail} Z`;
  }
  if (kind === "cloud") {
    return roundedPath(w, h, Math.max(r, Math.min(w, h) * 0.42));
  }
  if (kind === "ribbon") {
    const notch = Math.min(22, h * 0.24);
    return [
      `M ${w * 0.08} 0`,
      `H ${w * 0.92}`,
      `L ${w} ${notch}`,
      `V ${h - notch}`,
      `L ${w * 0.92} ${h}`,
      `H ${w * 0.08}`,
      `L 0 ${h - notch}`,
      `V ${notch}`,
      "Z",
    ].join(" ");
  }
  if (kind === "sticker") {
    const rr = Math.min(r, w / 2, h / 2);
    return [
      `M ${rr} 0`,
      `H ${w - rr}`,
      `Q ${w} 0 ${w} ${rr}`,
      `V ${h - 10}`,
      `Q ${w * 0.78} ${h} ${w * 0.5} ${h - 7}`,
      `Q ${w * 0.22} ${h - 14} 0 ${h - 10}`,
      `V ${rr}`,
      `Q 0 0 ${rr} 0`,
      "Z",
    ].join(" ");
  }
  if (kind === "burst") {
    return starPath(w, h, 18);
  }
  if (kind === "tag") {
    const rr = Math.min(r, w / 2, h / 2);
    return [
      `M ${rr} 0`,
      `H ${w - rr}`,
      `Q ${w} 0 ${w} ${rr}`,
      `V ${h - rr}`,
      `Q ${w} ${h} ${w - rr} ${h}`,
      `H ${w * 0.16}`,
      `L ${w * 0.04} ${h - 8}`,
      `L ${w * 0.16} ${h - 16}`,
      `H ${rr}`,
      `Q 0 ${h} 0 ${h - rr}`,
      `V ${rr}`,
      `Q 0 0 ${rr} 0`,
      "Z",
    ].join(" ");
  }
  if (kind === "card") {
    const fold = Math.min(20, w * 0.12, h * 0.2);
    const rr = Math.min(r, w / 2, h / 2);
    return [
      `M ${rr} 0`,
      `H ${w - fold}`,
      `L ${w} ${fold}`,
      `V ${h - rr}`,
      `Q ${w} ${h} ${w - rr} ${h}`,
      `H ${rr}`,
      `Q 0 ${h} 0 ${h - rr}`,
      `V ${rr}`,
      `Q 0 0 ${rr} 0`,
      "Z",
    ].join(" ");
  }
  if (kind === "halo") {
    return [
      `M ${w / 2} 2`,
      `A ${w / 2 - 2} ${h / 2 - 2} 0 1 0 ${w / 2} ${h - 2}`,
      `A ${w / 2 - 2} ${h / 2 - 2} 0 1 0 ${w / 2} 2`,
      "Z",
    ].join(" ");
  }
  return roundedPath(w, h, r);
}
