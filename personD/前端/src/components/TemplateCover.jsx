/*
 * 模板封面：优先使用后端封面图；没有封面时按模板数据生成 CSS 海报预览，
 * 保证瀑布流中每个模板都有独立的视觉。
 */
export default function TemplateCover({ template }) {
  if (template.coverImageUrl) {
    return (
      <img
        className="cover"
        src={template.coverImageUrl}
        alt={template.title}
        loading="lazy"
      />
    );
  }

  const palette = template.palette || ["#2563eb", "#60a5fa"];
  const accent = template.accent || "#ffffff";
  const kicker = template.kicker || "YIGAO";
  const tags = (template.tags || []).slice(0, 2).join(" · ");

  return (
    <div
      className="cover cover-demo"
      style={{
        "--tc1": palette[0],
        "--tc2": palette[1],
        "--tc-accent": accent,
      }}
    >
      <span className="cover-demo-shape shape-circle" aria-hidden />
      <span className="cover-demo-shape shape-rect" aria-hidden />
      <span className="cover-demo-kicker">{kicker}</span>
      <span className="cover-demo-title">{template.title}</span>
      {tags ? <span className="cover-demo-tags">{tags}</span> : null}
    </div>
  );
}
