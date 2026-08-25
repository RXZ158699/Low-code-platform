function svgDataUri(inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function starPoints(cx, cy, outer = 14, inner = 6) {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? outer : inner;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(" ");
}

function makeCategory(id, title, motifBuilders, palettes) {
  const items = [];
  let sequence = 0;
  for (const [name, build] of motifBuilders) {
    for (const palette of palettes) {
      sequence += 1;
      items.push({
        id: `${id}-${String(sequence).padStart(2, "0")}`,
        name: `${name} · ${palette.name}`,
        src: svgDataUri(build(palette)),
        width: 400,
        height: 400,
      });
    }
  }
  return { id, title, items };
}

const GEOMETRIC_PALETTES = [
  { name: "海盐蓝", bg: "#eef4ff", fg: "#3b82f6", accent: "#1e3a8a" },
  { name: "奶油橘", bg: "#fff3e4", fg: "#fb923c", accent: "#7c2d12" },
  { name: "苔绿色", bg: "#edf7ee", fg: "#22c55e", accent: "#14532d" },
];

const GEOMETRIC_BUILDERS = [
  [
    "方块阵列",
    (c) => {
      const cells = [];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          const x = 18 + col * 39;
          const y = 18 + row * 39;
          cells.push(
            `<rect x="${x}" y="${y}" width="26" height="26" rx="5" fill="${(row + col) % 2 === 0 ? c.fg : c.accent}" opacity="0.92"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${cells.join("")}`;
    },
  ],
  [
    "三角拼接",
    (c) => {
      const shapes = [];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const x = col * 50;
          const y = row * 50;
          if ((row + col) % 2 === 0) {
            shapes.push(
              `<polygon points="${x},${y + 50} ${x + 50},${y + 50} ${x + 25},${y}" fill="${c.fg}"/>`,
            );
          } else {
            shapes.push(
              `<polygon points="${x},${y} ${x + 50},${y} ${x + 25},${y + 50}" fill="${c.accent}"/>`,
            );
          }
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${shapes.join("")}`;
    },
  ],
  [
    "同心圆环",
    (c) => {
      const rings = [];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const x = 26 + col * 52;
          const y = 26 + row * 52;
          rings.push(
            `<circle cx="${x}" cy="${y}" r="18" fill="none" stroke="${(row + col) % 2 === 0 ? c.fg : c.accent}" stroke-width="7"/>`,
            `<circle cx="${x}" cy="${y}" r="4" fill="${c.accent}"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${rings.join("")}`;
    },
  ],
  [
    "菱形花格",
    (c) => {
      const diamonds = [];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          const x = 25 + col * 50;
          const y = 25 + row * 50;
          diamonds.push(
            `<rect x="${x - 12}" y="${y - 12}" width="24" height="24" rx="3" transform="rotate(45 ${x} ${y})" fill="${(row + col) % 2 === 0 ? c.fg : c.accent}" opacity="0.9"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${diamonds.join("")}`;
    },
  ],
];

const LINE_PALETTES = [
  { name: "石墨灰", bg: "#f8fafc", fg: "#334155", accent: "#94a3b8" },
  { name: "落日橙", bg: "#fff1e8", fg: "#f97316", accent: "#b45309" },
  { name: "紫夜蓝", bg: "#f3f0ff", fg: "#7c3aed", accent: "#4c1d95" },
];

const LINE_BUILDERS = [
  [
    "斜纹",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      `<g transform="rotate(-28 100 100)">${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 48 - 24}" y="-40" width="22" height="280" fill="${i % 2 === 0 ? c.fg : c.accent}" opacity="0.9"/>`).join("")}</g>`,
  ],
  [
    "波浪线",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      [40, 72, 104, 136, 168]
        .map(
          (y, i) =>
            `<path d="M-10 ${y} Q 35 ${y - 38} 80 ${y} T 170 ${y} T 260 ${y}" fill="none" stroke="${i % 2 === 0 ? c.fg : c.accent}" stroke-width="9" stroke-linecap="round"/>`,
        )
        .join(""),
  ],
  [
    "细网格",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      [20, 60, 100, 140, 180]
        .map((x) => `<path d="M${x} 0 V 200" stroke="${c.accent}" stroke-width="4"/>`)
        .join("") +
      [20, 60, 100, 140, 180]
        .map((y) => `<path d="M0 ${y} H 200" stroke="${c.fg}" stroke-width="4"/>`)
        .join(""),
  ],
  [
    "折线",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      [160, 130, 100, 70]
        .map(
          (y, i) =>
            `<path d="M-20 ${y} L 55 ${y - 105} L 130 ${y} L 205 ${y - 105} L 280 ${y}" fill="none" stroke="${i % 2 === 0 ? c.fg : c.accent}" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`,
        )
        .join(""),
  ],
];

const DOT_PALETTES = [
  { name: "樱花粉", bg: "#fff0f5", fg: "#f472b6", accent: "#be185d" },
  { name: "柠檬黄", bg: "#fffde7", fg: "#facc15", accent: "#854d0e" },
  { name: "晴空蓝", bg: "#e0f2fe", fg: "#0ea5e9", accent: "#075985" },
];

const DOT_BUILDERS = [
  [
    "圆点阵列",
    (c) => {
      const dots = [];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          dots.push(
            `<circle cx="${20 + col * 40}" cy="${20 + row * 40}" r="9" fill="${(row + col) % 2 === 0 ? c.fg : c.accent}"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${dots.join("")}`;
    },
  ],
  [
    "渐变半调",
    (c) => {
      const dots = [];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          dots.push(
            `<circle cx="${20 + col * 40}" cy="${20 + row * 40}" r="${4 + ((row + col) % 5) * 2}" fill="${c.fg}"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${dots.join("")}`;
    },
  ],
  [
    "圆环波点",
    (c) => {
      const rings = [];
      for (let row = 0; row < 5; row += 1) {
        for (let col = 0; col < 5; col += 1) {
          rings.push(
            `<circle cx="${20 + col * 40}" cy="${20 + row * 40}" r="11" fill="none" stroke="${c.fg}" stroke-width="5"/>`,
            `<circle cx="${20 + col * 40}" cy="${20 + row * 40}" r="3" fill="${c.accent}"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${rings.join("")}`;
    },
  ],
  [
    "密点点阵",
    (c) => {
      const dots = [];
      for (let row = 0; row < 8; row += 1) {
        for (let col = 0; col < 8; col += 1) {
          dots.push(
            `<circle cx="${12 + col * 25}" cy="${12 + row * 25}" r="${(row + col) % 3 === 0 ? 4.5 : 2.5}" fill="${(row + col) % 2 === 0 ? c.fg : c.accent}" opacity="0.85"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${dots.join("")}`;
    },
  ],
];

const RETRO_PALETTES = [
  { name: "复古橙", bg: "#fff1e6", fg: "#ff6b35", accent: "#264653" },
  { name: "湖水蓝", bg: "#e0f2f1", fg: "#00a8a8", accent: "#004d4d" },
  { name: "莓果红", bg: "#fde8e9", fg: "#ef476f", accent: "#4d194d" },
];

const RETRO_BUILDERS = [
  [
    "太阳放射",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      `<g transform="translate(100 100)">${Array.from({ length: 12 }, (_, i) => {
        const angle = (i * 30 * Math.PI) / 180;
        const x1 = Math.cos(angle) * 28;
        const y1 = Math.sin(angle) * 28;
        const x2 = Math.cos(angle) * 112;
        const y2 = Math.sin(angle) * 112;
        return `<polygon points="0,0 ${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)}" fill="${i % 2 === 0 ? c.fg : c.accent}" opacity="0.9"/>`;
      }).join("")}<circle cx="0" cy="0" r="16" fill="${c.accent}"/></g>`,
  ],
  [
    "唱片条纹",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      [100, 84, 68, 52, 36, 20]
        .map(
          (r, i) =>
            `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${i % 2 === 0 ? c.fg : c.accent}" stroke-width="10"/>`,
        )
        .join("") +
      `<circle cx="100" cy="100" r="7" fill="${c.accent}"/>`,
  ],
  [
    "撞色斜块",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      `<g transform="rotate(-30 100 100)">${Array.from({ length: 8 }, (_, i) => `<rect x="${i * 52 - 40}" y="-80" width="30" height="360" fill="${i % 2 === 0 ? c.fg : c.accent}" opacity="0.92"/>`).join("")}</g>`,
  ],
  [
    "复古徽章",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      `<rect x="15" y="15" width="170" height="170" rx="16" fill="none" stroke="${c.fg}" stroke-width="10"/>` +
      `<rect x="28" y="28" width="144" height="144" rx="10" fill="none" stroke="${c.accent}" stroke-width="4" stroke-dasharray="10 6"/>` +
      `<polygon points="${starPoints(100, 100, 26, 11)}" fill="${c.accent}"/>` +
      [30, 170].map((x) => `<circle cx="${x}" cy="100" r="8" fill="${c.fg}"/>`).join("") +
      [30, 170].map((y) => `<circle cx="100" cy="${y}" r="8" fill="${c.fg}"/>`).join(""),
  ],
];

const FESTIVE_PALETTES = [
  { name: "新年红", bg: "#fff0ef", fg: "#ef4444", accent: "#b91c1c" },
  { name: "圣诞绿", bg: "#eafaf1", fg: "#16a34a", accent: "#14532d" },
  { name: "金色", bg: "#fffbeb", fg: "#f59e0b", accent: "#92400e" },
];

const FESTIVE_BUILDERS = [
  [
    "爱心",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      [30, 65, 100, 135, 170]
        .map(
          (x, i) =>
            `<path d="M${x} 160 C ${x - 16} 140 ${x - 18} 118 ${x - 8} 106 C ${x} 96 ${x + 8} 98 ${x + 12} 106 C ${x + 16} 98 ${x + 24} 96 ${x + 32} 106 C ${x + 42} 118 ${x + 40} 140 ${x + 24} 160 Z" fill="${i % 2 === 0 ? c.fg : c.accent}"/>`,
        )
        .join(""),
  ],
  [
    "星星",
    (c) => {
      const stars = [];
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          stars.push(
            `<polygon points="${starPoints(25 + col * 50, 25 + row * 50)}" fill="${(row + col) % 2 === 0 ? c.fg : c.accent}" opacity="0.95"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${stars.join("")}`;
    },
  ],
  [
    "彩纸屑",
    (c) => {
      const bits = [];
      for (let i = 0; i < 24; i += 1) {
        const x = 8 + ((i * 37) % 184);
        const y = 8 + ((i * 53) % 184);
        const fill = [c.fg, c.accent, "#f59e0b", "#38bdf8"][i % 4];
        const shape =
          i % 3 === 0
            ? `<circle cx="${x}" cy="${y}" r="${5 + (i % 4)}" fill="${fill}"/>`
            : i % 3 === 1
              ? `<rect x="${x - 5}" y="${y - 5}" width="${9 + (i % 4) * 2}" height="${8 + (i % 3) * 2}" rx="2" fill="${fill}"/>`
              : `<polygon points="${x},${y - 7} ${x + 7},${y + 6} ${x - 7},${y + 6}" fill="${fill}"/>`;
        bits.push(`<g transform="rotate(${(i * 19) % 360} ${x} ${y})">${shape}</g>`);
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${bits.join("")}`;
    },
  ],
  [
    "气球",
    (c) => {
      const balloons = [];
      for (let i = 0; i < 4; i += 1) {
        const cx = 35 + i * 50;
        const cy = 48 + (i % 2) * 34;
        balloons.push(
          `<circle cx="${cx}" cy="${cy}" r="23" fill="${i % 2 === 0 ? c.fg : c.accent}"/>`,
          `<polygon points="${cx - 5},${cy + 22} ${cx + 5},${cy + 22} ${cx},${cy + 32}" fill="${i % 2 === 0 ? c.accent : c.fg}"/>`,
          `<path d="M${cx} ${cy + 32} C ${cx - 8} ${cy + 64} ${cx + 8} ${cy + 88} ${cx} ${cy + 124}" fill="none" stroke="${i % 2 === 0 ? c.accent : c.fg}" stroke-width="3"/>`,
        );
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${balloons.join("")}`;
    },
  ],
];

const CHINESE_PALETTES = [
  { name: "朱砂红", bg: "#fdf2e9", fg: "#c2410c", accent: "#7c2d12" },
  { name: "黛青色", bg: "#eef2f7", fg: "#0f766e", accent: "#134e4a" },
  { name: "胭脂粉", bg: "#fdf0f3", fg: "#be123c", accent: "#881337" },
];

const CHINESE_BUILDERS = [
  [
    "祥云",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      [8, 66, 124]
        .map(
          (x, i) =>
            `<g transform="translate(${x} ${i % 2 === 0 ? 34 : 66})"><circle cx="22" cy="112" r="16" fill="${c.fg}" opacity="0.92"/><circle cx="38" cy="101" r="13" fill="${c.fg}" opacity="0.92"/><circle cx="54" cy="114" r="12" fill="${c.fg}" opacity="0.92"/><rect x="14" y="114" width="44" height="13" rx="6.5" fill="${c.fg}" opacity="0.92"/></g>`,
        )
        .join("") +
      `<path d="M14 178 H 186" stroke="${c.accent}" stroke-width="5" stroke-linecap="round"/>`,
  ],
  [
    "回纹",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      [20, 62, 104, 146]
        .map(
          (x, i) =>
            `<path d="M${x} 178 L${x} 108 L${x + 32} 108 L${x + 32} 142 L${x + 12} 142 L${x + 12} 122 L${x + 20} 122" fill="none" stroke="${i % 2 === 0 ? c.fg : c.accent}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>`,
        )
        .join(""),
  ],
  [
    "水纹",
    (c) =>
      `<rect width="200" height="200" fill="${c.bg}"/>` +
      [42, 74, 106, 138, 170]
        .map(
          (y, i) =>
            `<path d="M-10 ${y} C 30 16 70 68 110 ${y} S 190 16 230 ${y}" fill="none" stroke="${i % 2 === 0 ? c.fg : c.accent}" stroke-width="7" stroke-linecap="round"/>`,
        )
        .join(""),
  ],
  [
    "铜钱",
    (c) => {
      const coins = [];
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 2; col += 1) {
          const cx = 55 + col * 90;
          const cy = 55 + row * 90;
          coins.push(
            `<circle cx="${cx}" cy="${cy}" r="36" fill="${c.fg}"/>`,
            `<circle cx="${cx}" cy="${cy}" r="31" fill="none" stroke="${c.bg}" stroke-width="2"/>`,
            `<rect x="${cx - 9}" y="${cy - 9}" width="18" height="18" rx="2" fill="${c.bg}"/>`,
          );
        }
      }
      return `<rect width="200" height="200" fill="${c.bg}"/>${coins.join("")}`;
    },
  ],
];

export const MATERIAL_CATEGORIES = [
  makeCategory("geometric", "几何图形", GEOMETRIC_BUILDERS, GEOMETRIC_PALETTES),
  makeCategory("line", "线条纹理", LINE_BUILDERS, LINE_PALETTES),
  makeCategory("dot", "波点纹理", DOT_BUILDERS, DOT_PALETTES),
  makeCategory("retro", "复古海报", RETRO_BUILDERS, RETRO_PALETTES),
  makeCategory("festive", "节日氛围", FESTIVE_BUILDERS, FESTIVE_PALETTES),
  makeCategory("chinese", "国风纹样", CHINESE_BUILDERS, CHINESE_PALETTES),
];
