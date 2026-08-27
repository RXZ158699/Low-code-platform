function bgDataUri(inner) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">${inner}</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function solidUri(color) {
  return bgDataUri(`<rect width="200" height="200" fill="${color}"/>`);
}

function gradientUri(from, to, angle = 135) {
  return bgDataUri(
    `<linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${angle} .5 .5)"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient><rect width="200" height="200" fill="url(#g)"/>`,
  );
}

function dotPatternUri(bg, dot, gap = 26) {
  const dots = [];
  for (let y = 12; y < 200; y += gap) {
    for (let x = 12; x < 200; x += gap) {
      dots.push(`<circle cx="${x}" cy="${y}" r="3" fill="${dot}" opacity="0.55"/>`);
    }
  }
  return bgDataUri(`<rect width="200" height="200" fill="${bg}"/>${dots.join("")}`);
}

function stripeUri(bg, stripe, angle = -30) {
  return bgDataUri(
    `<defs><pattern id="p" width="28" height="28" patternTransform="rotate(${angle})" patternUnits="userSpaceOnUse"><rect width="28" height="28" fill="${bg}"/><rect width="10" height="28" fill="${stripe}" opacity="0.7"/></pattern></defs><rect width="200" height="200" fill="url(#p)"/>`,
  );
}

function waveUri(bg, wave, count = 3) {
  const waves = [];
  for (let i = 0; i < count; i += 1) {
    const y = 40 + i * 55;
    waves.push(
      `<path d="M0 ${y} Q 25 ${y - 18} 50 ${y} T 100 ${y} T 150 ${y} T 200 ${y}" fill="none" stroke="${wave}" stroke-width="10" opacity="${0.85 - i * 0.18}"/>`,
    );
  }
  return bgDataUri(`<rect width="200" height="200" fill="${bg}"/>${waves.join("")}`);
}

function shapeMosaicUri(colors) {
  const shapes = colors
    .map((color, index) => {
      const x = index % 2 === 0 ? 6 : 106;
      const y = index < 2 ? 6 : 106;
      return `<rect x="${x}" y="${y}" width="88" height="88" rx="18" fill="${color}" opacity="0.9"/>`;
    })
    .join("");
  return bgDataUri(`<rect width="200" height="200" fill="#f8fafc"/>${shapes}`);
}

function fireworkUri(bg, accent) {
  const sparks = [];
  for (let i = 0; i < 24; i += 1) {
    const angle = (i / 24) * Math.PI * 2;
    const x = 100 + Math.cos(angle) * 58;
    const y = 100 + Math.sin(angle) * 58;
    sparks.push(
      `<line x1="100" y1="100" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${accent}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>`,
    );
  }
  return bgDataUri(`<rect width="200" height="200" fill="${bg}"/>${sparks.join("")}`);
}

function leafUri(bg, leaf) {
  const leaves = [];
  for (let i = 0; i < 5; i += 1) {
    const x = 34 + i * 36;
    const y = 30 + (i % 2) * 90;
    leaves.push(
      `<path d="M${x} ${y} q 14 -16 28 0 q -14 16 -28 0 Z" fill="${leaf}" opacity="0.8"/>`,
    );
  }
  return bgDataUri(`<rect width="200" height="200" fill="${bg}"/>${leaves.join("")}`);
}

export const BACKGROUND_CATALOG = [
  {
    id: "solid",
    title: "纯色",
    items: [
      { id: "solid-white", name: "纯白", src: solidUri("#ffffff") },
      { id: "solid-night", name: "深夜", src: solidUri("#111827") },
      { id: "solid-blue", name: "晴空蓝", src: solidUri("#2563eb") },
      { id: "solid-green", name: "薄荷绿", src: solidUri("#10b981") },
      { id: "solid-orange", name: "活力橙", src: solidUri("#f97316") },
      { id: "solid-pink", name: "樱花粉", src: solidUri("#f472b6") },
    ],
  },
  {
    id: "gradient",
    title: "渐变",
    items: [
      { id: "grad-sunset", name: "落日", src: gradientUri("#f97316", "#ef4444") },
      { id: "grad-ocean", name: "海洋", src: gradientUri("#0ea5e9", "#2563eb") },
      { id: "grad-violet", name: "紫罗兰", src: gradientUri("#8b5cf6", "#6366f1") },
      { id: "grad-mint", name: "薄荷", src: gradientUri("#34d399", "#0ea5e9") },
      { id: "grad-rose", name: "玫瑰", src: gradientUri("#fb7185", "#f43f5e") },
      { id: "grad-amber", name: "琥珀", src: gradientUri("#fbbf24", "#f97316") },
    ],
  },
  {
    id: "geometric",
    title: "几何",
    items: [
      { id: "geo-dots", name: "波点", src: dotPatternUri("#eef2ff", "#6366f1") },
      { id: "geo-stripes", name: "斜纹", src: stripeUri("#f0fdf4", "#22c55e") },
      { id: "geo-wave", name: "波浪", src: waveUri("#eff6ff", "#3b82f6") },
      { id: "geo-mosaic", name: "马赛克", src: shapeMosaicUri(["#f87171", "#60a5fa", "#34d399", "#fbbf24"]) },
      { id: "geo-grid", name: "网格", src: stripeUri("#fafafa", "#d1d5db", 0) },
      { id: "geo-circle", name: "同心圆", src: dotPatternUri("#fdf2f8", "#f472b6", 34) },
    ],
  },
  {
    id: "festival",
    title: "节日",
    items: [
      { id: "fest-firework", name: "烟花", src: fireworkUri("#0f172a", "#fbbf24") },
      { id: "fest-spring", name: "新春", src: bgDataUri('<rect width="200" height="200" fill="#fef2f2"/><rect x="66" y="40" width="68" height="80" rx="10" fill="#dc2626"/><rect x="78" y="72" width="44" height="44" rx="6" fill="#fbbf24"/>') },
      { id: "fest-cake", name: "生日", src: bgDataUri('<rect width="200" height="200" fill="#fff7ed"/><rect x="52" y="100" width="96" height="58" rx="12" fill="#fb923c"/><path d="M52 112h96" stroke="#fff" stroke-width="10"/><circle cx="70" cy="92" r="8" fill="#f472b6"/><circle cx="100" cy="82" r="10" fill="#fbbf24"/><circle cx="130" cy="92" r="8" fill="#60a5fa"/>') },
      { id: "fest-snow", name: "雪花", src: dotPatternUri("#eff6ff", "#93c5fd", 30) },
      { id: "fest-star", name: "星愿", src: bgDataUri('<rect width="200" height="200" fill="#0f172a"/><path d="M100 44l10 20 22 3-16 15 4 22-20-11-20 11 4-22-16-15 22-3z" fill="#fde047"/>') },
      { id: "fest-lantern", name: "灯笼", src: bgDataUri('<rect width="200" height="200" fill="#7f1d1d"/><rect x="80" y="46" width="40" height="96" rx="20" fill="#ef4444"/><rect x="80" y="24" width="40" height="14" fill="#fbbf24"/><rect x="80" y="146" width="40" height="14" fill="#fbbf24"/>') },
    ],
  },
  {
    id: "business",
    title: "商务",
    items: [
      { id: "biz-blue", name: "科技蓝", src: gradientUri("#1e3a8a", "#0ea5e9", 45) },
      { id: "biz-graph", name: "数据", src: stripeUri("#f8fafc", "#2563eb", 0) },
      { id: "biz-line", name: "线条", src: waveUri("#f8fafc", "#64748b", 2) },
      { id: "biz-dark", name: "沉稳", src: solidUri("#1f2937") },
      { id: "biz-gray", name: "浅灰", src: solidUri("#f3f4f6") },
      { id: "biz-green", name: "商务绿", src: gradientUri("#065f46", "#10b981", 90) },
    ],
  },
  {
    id: "nature",
    title: "自然",
    items: [
      { id: "nat-leaf", name: "叶片", src: leafUri("#f0fdf4", "#16a34a") },
      { id: "nat-sky", name: "天空", src: gradientUri("#bae6fd", "#ffffff", 180) },
      { id: "nat-sand", name: "沙滩", src: waveUri("#fff7ed", "#fdba74", 2) },
      { id: "nat-forest", name: "森林", src: gradientUri("#166534", "#86efac", 120) },
      { id: "nat-flower", name: "花田", src: dotPatternUri("#fdf4ff", "#e879f9", 30) },
      { id: "nat-mountain", name: "远山", src: bgDataUri('<rect width="200" height="200" fill="#e0f2fe"/><path d="M0 200L60 90 120 200Z" fill="#94a3b8"/><path d="M70 200L130 110 200 200Z" fill="#64748b"/>') },
    ],
  },
];
