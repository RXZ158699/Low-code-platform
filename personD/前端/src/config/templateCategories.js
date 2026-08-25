/*
 * 模板分类共享配置：Hero 分类标签与模板瀑布流 Tab 使用同一份数据。
 * apiCategory 为后端接口使用的分类名称，null 表示不按分类过滤。
 */
export const TEMPLATE_CATEGORIES = [
  { key: "hot", label: "热门", apiCategory: null },
  { key: "all", label: "全部", apiCategory: null },
  { key: "poster", label: "海报", apiCategory: "主题海报" },
  { key: "promo", label: "活动营销", apiCategory: "活动营销" },
  { key: "xiaohongshu", label: "小红书", apiCategory: "小红书种草" },
  { key: "gzh", label: "公众号", apiCategory: "公众号封面" },
  { key: "ecommerce", label: "电商", apiCategory: "电商海报" },
  { key: "invite", label: "邀请函", apiCategory: "邀请函" },
  { key: "festival", label: "节日祝福", apiCategory: "节日祝福" },
];
