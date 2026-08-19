import { DiscoverToolbar, DISCOVER_STICKY_HEIGHT } from "./DiscoverHeader.jsx";

const MASONRY_COLUMNS = [
  [
    { id: "brochure", variant: "brochure", tag: "印刷物料", height: 268 },
    { id: "tech", variant: "tech", height: 220 },
  ],
  [
    { id: "workcard", variant: "workcard", tag: "印刷物料", height: 392 },
    { id: "resume", variant: "resume", height: 214 },
  ],
  [
    { id: "album", variant: "album", height: 318 },
    { id: "cards", variant: "cards", height: 188 },
  ],
  [
    { id: "green", variant: "green", tag: "印刷物料", height: 368 },
    { id: "energy", variant: "energy", height: 228 },
  ],
  [{ id: "corp", variant: "corp", height: 508 }],
];

function TemplateArt({ variant }) {
  if (variant === "brochure") {
    return (
      <div className="discover-art discover-art-brochure">
        <div className="brochure-panel">
          <span>ENTERPRISE</span>
          <strong>品牌手册</strong>
        </div>
        <div className="brochure-panel brochure-mid">
          <i />
          <i />
          <i />
        </div>
        <div className="brochure-panel">
          <span>CONTACT</span>
          <b>合作咨询</b>
        </div>
      </div>
    );
  }
  if (variant === "workcard") {
    return (
      <div className="discover-art discover-art-workcard">
        <div className="workcard-photo" />
        <p className="workcard-en">WORK CARD</p>
        <p className="workcard-cn">工作证</p>
        <div className="workcard-qr" />
      </div>
    );
  }
  if (variant === "album") {
    return (
      <div className="discover-art discover-art-album">
        <p className="album-kicker">PRODUCT</p>
        <h3>Product Promotion Album</h3>
        <p className="album-sub">产品宣传画册</p>
        <div className="album-thumbs">
          <span />
          <span />
          <span />
        </div>
      </div>
    );
  }
  if (variant === "green") {
    return (
      <div className="discover-art discover-art-green">
        <div className="green-orb" />
        <p>GREEN LIFE</p>
        <strong>可持续生活指南</strong>
        <small>环保 · 低碳 · 行动</small>
      </div>
    );
  }
  if (variant === "corp") {
    return (
      <div className="discover-art discover-art-corp">
        <div className="corp-skyline" />
        <p>CORPORATE</p>
        <h3>企业介绍</h3>
        <span>COMPANY PROFILE</span>
      </div>
    );
  }
  if (variant === "tech") {
    return (
      <div className="discover-art discover-art-tech">
        <p>TECHNOLOGY</p>
        <h3>科技赋能</h3>
        <h3>引领未来</h3>
      </div>
    );
  }
  if (variant === "resume") {
    return (
      <div className="discover-art discover-art-resume">
        <div className="resume-avatar" />
        <b>个人简历</b>
        <i />
        <i />
        <i />
      </div>
    );
  }
  if (variant === "energy") {
    return (
      <div className="discover-art discover-art-energy">
        <p>POLICY</p>
        <h3>最新能源政策解读</h3>
      </div>
    );
  }
  return (
    <div className="discover-art discover-art-cards">
      <div className="biz-card" />
      <div className="biz-card biz-card-back" />
    </div>
  );
}

export default function DiscoverPage() {
  return (
    <div className="discover-page">
      <div className="discover-main">
        <div className="discover-sticky-spacer" style={{ height: DISCOVER_STICKY_HEIGHT }} />
        <DiscoverToolbar />
        <div className="discover-masonry">
          {MASONRY_COLUMNS.map((column, index) => (
            <div className="discover-col" key={index}>
              {column.map((card) => (
                <article className="discover-card" key={card.id} style={{ height: card.height }}>
                  <TemplateArt variant={card.variant} />
                  {card.tag ? <span className="discover-tag">{card.tag}</span> : null}
                </article>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
