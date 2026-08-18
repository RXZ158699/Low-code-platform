import { useLayoutEffect, useRef, useState } from "react";
import { Tag } from "antd";
import { DownOutlined, MenuOutlined, UpOutlined } from "@ant-design/icons";
import SearchPill from "./SearchPill.jsx";
import aiMark from "../assets/icons/ai-mark.svg";
import flameIcon from "../assets/icons/flame.svg";
import mailboxIcon from "../assets/icons/category-mailbox.svg";
import scrollIcon from "../assets/icons/category-scroll.svg";
import envelopeIcon from "../assets/icons/category-envelope.svg";
import leavesIcon from "../assets/icons/category-leaves.svg";
import chartIcon from "../assets/icons/category-chart.svg";
import phoneIcon from "../assets/icons/category-phone.svg";

const CATEGORY_MENU = [
  {
    title: "电商平台",
    items: [
      "直播贴片",
      "直播背景",
      "直播封面",
      "商品主图",
      "电商海报",
      "主图图标",
      "店招",
      "胶囊banner",
      "详情页",
      "店铺首页",
      "商品关联列表",
      "弹窗广告",
      "闪屏",
      "小程序封面",
      "美团商品主图",
      "美团海报",
      "美团店招",
      "淘宝闪购商品主图",
      "淘宝闪购海报",
      "淘宝闪购店招",
      "大众轮播图",
      "大众团购图",
      "大众推荐菜",
      "大众五连图",
      "大众中通图",
      "主图视频",
      "店铺首页视频",
    ],
  },
  {
    title: "小红书/公众号+",
    items: [
      "公众号首图",
      "公众号次图",
      "公众号双封面",
      "小红书封面",
      "小红书配图",
      "文章长图",
      "引导关注",
      "引导阅读原文",
      "引导在看提示",
      "静态二维码",
      "超链接配图",
      "分割线",
      "文章标题",
      "文章配图",
      "小红书动态封面",
      "抖音背景图",
      "视频封面",
      "视频边框",
      "小说封面",
      "微博封面",
      "专辑封面",
      "B站封面",
      "6:7视频",
      "动态二维码",
    ],
  },
  {
    title: "微信/朋友圈+",
    items: ["头像", "海报", "动态表情包", "微信状态背景", "聊天背景图", "朋友圈封面", "红包封面", "微信红包挂件", "静态表情包"],
  },
  {
    title: "门店商超",
    items: ["印刷海报", "印刷折页", "展板", "X展架", "书签", "售后卡", "手帐", "手抄报", "优惠券", "道旗", "抽奖箱", "不干胶"],
  },
  {
    title: "粉丝应援",
    items: ["手幅", "小卡", "透扇套装", "手机壳", "登机牌", "票根", "明信片", "便利贴", "杯套", "吧唧"],
  },
  {
    title: "行政办公",
    items: ["名片", "工作证", "桌牌", "证件照", "易拉宝", "台历", "手提袋", "门票", "地贴", "红包", "画册", "KT板", "背景视频"],
  },
  {
    title: "PPT",
    items: ["PPT单页", "PPT套装 (4:3)", "PPT套装 (16:9)"],
  },
  {
    title: "H5",
    items: ["翻页H5", "长页H5"],
  },
  {
    title: "用途",
    divider: true,
    items: [
      "通用",
      "祝福问候",
      "营销卖货",
      "宣传推广",
      "商务活动",
      "科普攻略",
      "通知公告",
      "求职招聘",
      "企业行政",
      "生活娱乐",
      "校园生活",
      "互动功能",
      "创意玩法",
    ],
  },
  {
    title: "行业",
    items: [
      "教育培训",
      "企业服务",
      "金融",
      "房地产",
      "生活服务",
      "政务媒体",
      "文体娱乐",
      "旅游出行",
      "餐饮美食",
      "医疗保健",
      "商品零售",
      "服饰箱包",
      "美容美妆",
      "食品生鲜",
      "公益环保",
      "跨境出口",
      "IT互联网",
    ],
  },
];

const CATEGORIES = [
  { label: "全部分类" },
  { label: "小红书", icon: mailboxIcon },
  { label: "海报", icon: scrollIcon },
  { label: "公众号首图", icon: envelopeIcon },
  { label: "处暑", icon: leavesIcon },
  { label: "邀请函", icon: chartIcon },
  { label: "社媒封面", icon: phoneIcon },
];

export default function HeroSection({ onSearch }) {
  const [active, setActive] = useState("全部分类");
  const [mode, setMode] = useState("search");
  const switchRef = useRef(null);
  const [thumb, setThumb] = useState({ width: 0, x: 0 });
  const [thumbReady, setThumbReady] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState(null);

  useLayoutEffect(() => {
    const root = switchRef.current;
    if (!root) return undefined;

    const updateThumb = () => {
      const activeBtn = root.querySelector(".mode-switch-item.active");
      if (!activeBtn) return;
      setThumb({
        width: activeBtn.offsetWidth,
        x: activeBtn.offsetLeft,
      });
    };

    updateThumb();
    const frame = requestAnimationFrame(() => setThumbReady(true));
    window.addEventListener("resize", updateThumb);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", updateThumb);
    };
  }, [mode]);

  return (
    <section className="hero">
      <div className="hero-title-group">
        <h1 className="hero-heading">
          营销物料 <span className="accent">稿定</span>搞定
        </h1>
        <div
          className="mode-switch"
          ref={switchRef}
          role="tablist"
          aria-label="搜索或生成"
        >
          <span
            className={`mode-switch-thumb ${thumbReady ? "ready" : ""}`}
            style={{
              width: thumb.width,
              transform: `translateX(${thumb.x}px)`,
            }}
            aria-hidden
          />
          <button
            type="button"
            className={`mode-switch-item ${mode === "search" ? "active" : ""}`}
            onClick={() => setMode("search")}
            role="tab"
            aria-selected={mode === "search"}
          >
            搜索
          </button>
          <button
            type="button"
            className={`mode-switch-item generate ${mode === "generate" ? "active" : ""}`}
            onClick={() => setMode("generate")}
            role="tab"
            aria-selected={mode === "generate"}
          >
            <span className="mode-switch-badge">
              电商工作流
              <img src={flameIcon} alt="" />
            </span>
            <img className="ai-mark" src={aiMark} alt="" />
            生成
          </button>
        </div>
      </div>

      <SearchPill onSearch={onSearch} />

      <div className="category-area">
        <div className="category-row" role="group" aria-label="分类筛选">
          {CATEGORIES.map((category) => {
            const tag = (
              <Tag
                key={category.label}
                className={`category-tag ${active === category.label ? "active" : ""}`}
                onClick={() => setActive(category.label)}
                role="button"
                aria-pressed={active === category.label}
              >
                {category.label === "全部分类" ? (
                  <MenuOutlined className="category-menu-icon" aria-hidden />
                ) : (
                  <img className="category-icon" src={category.icon} alt="" />
                )}
                {category.label}
              </Tag>
            );

            if (category.label !== "全部分类") return tag;

            return (
              <div
                className="category-all-wrap"
                key={category.label}
                onMouseLeave={() => setExpandedGroup(null)}
              >
                {tag}
                <div className="category-popover" aria-label="全部分类">
                  <div className="category-popover-inner">
                    {CATEGORY_MENU.map((group) => {
                      const expanded = expandedGroup === group.title;
                      return (
                      <div
                        className={`category-popover-row ${group.divider ? "divided" : ""} ${expanded ? "expanded" : ""}`}
                        key={group.title}
                      >
                        <span className="category-popover-title">{group.title}</span>
                        <div className="category-popover-items">
                          {group.items.map((item) => (
                            <button
                              type="button"
                              className="category-popover-item"
                              key={item}
                            >
                              {item}
                            </button>
                          ))}
                        </div>
                        <button
                          type="button"
                          className="category-popover-more"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            setExpandedGroup(expanded ? null : group.title);
                          }}
                        >
                          {expanded ? "收起" : "更多"}
                          {expanded ? <UpOutlined /> : <DownOutlined />}
                        </button>
                      </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
