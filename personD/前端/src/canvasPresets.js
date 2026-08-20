export const CANVAS_PRESETS = [
  { id: "phone-poster", name: "手机海报", ratio: "9:16", width: 1242, height: 2208, icon: "phone" },
  { id: "landscape-poster", name: "横版海报", ratio: "", width: 1800, height: 1000, icon: "landscape" },
  { id: "xhs", name: "小红书配图", ratio: "3:4", width: 1242, height: 1656, icon: "xhs" },
  { id: "gzh-cover", name: "公众号首图", ratio: "", width: 1800, height: 766, icon: "wechat" },
  { id: "gzh-second", name: "公众号次图", ratio: "1:1", width: 1000, height: 1000, icon: "wechat-square" },
  { id: "article-long", name: "文章长图", ratio: "", width: 1000, height: 1500, icon: "article" },
  { id: "video-cover", name: "视频封面", ratio: "16:9", width: 1920, height: 1080, icon: "video" },
  { id: "shop-main", name: "电商主图", ratio: "1:1", width: 800, height: 800, icon: "shop" },
];

export function filterCanvasPresets(presets, query) {
  const keyword = String(query || "").trim().toLowerCase();
  if (!keyword) return presets;
  return presets.filter((item) => {
    const haystack = `${item.name} ${item.ratio} ${item.width} ${item.height}`.toLowerCase();
    return haystack.includes(keyword);
  });
}

export function presetLabel(item) {
  return item.ratio ? `${item.name} (${item.ratio})` : item.name;
}
