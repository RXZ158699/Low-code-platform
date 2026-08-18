# AGENTS.md

本文件面向在本仓库中工作的 AI 编码助手，说明项目结构、开发命令、代码约定和常见修改入口。

## 项目概览

这是一个**低代码/在线设计平台的前端首页**（对标「稿定设计」营销物料平台），已接入后端 API（登录/注册、模板广场、基于模板创建作品）。

- 技术栈：React 19 + Vite 7 + Ant Design 5 + react-router-dom 7 + JavaScript（JSX，**未使用 TypeScript**）
- 目录：`personD/前端/`
- 页面标题：稿定设计 - 营销物料平台
- 设计稿宽度固定为 **1440px**，通过 CSS transform 整体缩放适配不同屏幕
- 后端联调：`vite.config.js` 已配置 `/api` → `http://localhost:8080` 代理；后端需先启动（见 `personD/后端/README.md`）

## 常用命令

所有命令都在 `personD/前端/` 目录下执行：

```bash
npm install        # 安装依赖
npm run dev        # 启动开发服务器（默认 5173 端口，host 0.0.0.0）
npm run build      # 生产构建（输出到 dist/）
npm run preview    # 预览构建产物
npm run lint       # ESLint 检查（flat config）
npm test           # Vitest 单元测试（jsdom 环境）
```

提交代码前请确保 `npm run lint` 和 `npm test` 全部通过。

## 目录结构

```
前端/
├── index.html              # 入口 HTML，favicon 引用在这里
├── vite.config.js          # Vite + Vitest 配置
├── eslint.config.js        # ESLint flat config
├── package.json
├── public/
│   └── favicon.svg         # 浏览器标签页图标（蓝底白字「稿」）
└── src/
    ├── main.jsx            # React 挂载入口，ConfigProvider 全局主题（主色 #2563eb）+ 路由 + AuthProvider
    ├── App.jsx             # 首页根组件：负责整体缩放、滚动监听、CreatePopoverProvider
    ├── styles.css          # 全局样式（按组件分区块注释）
    ├── setupTests.js       # Vitest 测试初始化（jest-dom 匹配器）
    ├── api/                # 后端 API 层
    │   ├── client.js       #   fetch 封装：解包 Result<T>、Bearer 注入、401 自动 refresh 重试
    │   ├── tokenStore.js   #   localStorage 令牌存取（dp.token / dp.refreshToken）
    │   ├── auth.js         #   登录/注册/登出/me
    │   └── templates.js    #   模板列表/热门/使用
    ├── auth/
    │   └── AuthContext.jsx # 登录态 Context：user/ready/login/logout，启动时带 token 自动 fetchMe
    ├── pages/
    │   └── LoginPage.jsx   # 登录/注册页（注册成功自动登录，回跳首页）
    ├── assets/
    │   ├── icons/          # SVG 图标（侧边栏、分类、功能入口等）
    │   └── templates/      # 模板卡片兜底封面图（模板无封面时循环使用）
    └── components/
        ├── DesignHomepage.jsx    # 首页布局容器（HeaderBar + Hero + Features + Showcase）
        ├── HeaderBar.jsx         # 顶部占位 header（当前为空）
        ├── Sidebar.jsx           # 左侧固定侧边栏（创作/发现/我的/创建 + 登录）
        ├── CreatePopover.jsx     # 「创建」弹框组件 + Context Provider（跨组件共享开关状态）
        ├── HeroSection.jsx       # 首屏 Hero：搜索框 + 分类标签 + 全部分类弹框（CATEGORY_MENU 数据）
        ├── SearchPill.jsx        # 搜索框组件（可复用）
        ├── FeaturesRow.jsx       # 功能入口行（AI画布/AI电商/... + 「更多」按钮）
        ├── TemplateShowcase.jsx  # 模板推荐区（Tab 切换 + 模板卡片）
        ├── StickySearchBar.jsx   # 滚动时吸附顶部的搜索栏
        └── FeaturesRow.test.jsx  # FeaturesRow 的单元测试
```

## 架构要点

### 1. 整体缩放机制（重要）

`App.jsx` 以 1440px 为设计基准宽度，计算 `scale = 容器宽度 / 1440`，然后用 `transform: scale()` 缩放整个页面。侧边栏是 `position: fixed`，同样乘以缩放比例。

- 修改布局尺寸时，**按 1440px 设计稿的原始像素写**，不要自己算缩放后的值
- CSS 变量 `--page-scale` 在缩放容器上可用

### 2. CreatePopover 共享状态

「创建」弹框（`CreatePopover.jsx`）通过 React Context 暴露 `open` / `setOpen`：

- `CreatePopoverProvider` 在 `App.jsx` 顶层包裹整个应用
- 侧边栏「创建」按钮：鼠标**划过**弹出（CSS `:hover` 触发）
- 首页「更多」按钮：**点击**触发（调用 `setOpen` 切换）
- 弹框 DOM 只渲染在侧边栏「创建」按钮右侧，两个入口共享同一个弹框和位置
- 点击弹框外部或按 Esc 关闭（通过 `data-create-popover` 属性判断点击是否在弹框区域内）

### 3. 分类弹框（HeroSection）

`HeroSection.jsx` 顶部的 `CATEGORY_MENU` 常量定义了「全部分类」弹框的所有分组和标签。修改分类标签**只需改这个数组**：

- 每个分组有 `title`（左侧主题名）和 `items`（右侧标签数组）
- `divider: true` 表示该分组上方有分割线（「用途」分组）
- 弹框折叠时每组只显示一行标签，溢出隐藏；点「更多」展开全部
- 标签悬停背景色 `#EBF1F4`，上圆角 10px、下圆角 0

### 4. 样式组织

所有样式集中在 `src/styles.css`，按组件用注释分块（如 `/* Feature entries */`、`/* Template showcase */`）。组件 className 与 CSS 选择器一一对应，命名用 kebab-case。

## 代码约定

- **语言**：JavaScript（JSX），不使用 TypeScript；暂不需要 `.ts/.tsx` 文件
- **组件**：函数组件 + Hooks，默认导出，文件名 PascalCase
- **导入路径**：组件间引用必须带 `.jsx` 后缀（如 `import App from "./App.jsx"`）
- **样式**：写在 `styles.css`，不用 CSS Modules 或内联样式（动态缩放值除外）
- **UI 库**：优先使用 Ant Design 组件（`Button`、`Input`、`Tag`、`Tooltip` 等），图标用 `@ant-design/icons` 或 `assets/icons/` 下的 SVG
- **文案**：界面文案为中文
- **注释**：只在非显而易见的逻辑处写注释，不要写「导入模块」「定义函数」这类废话注释

## Lint 与测试

- ESLint 使用 flat config（`eslint.config.js`），规则集：`eslint:recommended` + `react-hooks` + Prettier 兼容
- 未使用变量是 warn（下划线开头的参数/变量豁免）
- 测试用 Vitest + Testing Library + jsdom，测试文件放在被测组件旁边（`*.test.jsx`）
- 测试全局函数（`describe`/`it`/`expect`/`vi`）已在 ESLint 中声明，无需 import

## 常见修改入口速查

| 需求 | 改哪里 |
| --- | --- |
| 换浏览器标签页图标 | `public/favicon.svg` |
| 改页面标题 | `index.html` 的 `<title>` |
| 增删分类标签 | `HeroSection.jsx` 的 `CATEGORY_MENU` |
| 改分类弹框样式 | `styles.css` 的 `.category-popover-*` 区块 |
| 改创建弹框内容 | `CreatePopover.jsx` 的 `CREATE_ACTIONS` / `CREATE_TOOLS` |
| 改功能入口（AI画布等） | `FeaturesRow.jsx` 的 `FEATURES` |
| 改模板卡片/Tab | `TemplateShowcase.jsx`（`TEMPLATE_TABS`；卡片数据来自 `GET /api/templates`，无封面时用 `FALLBACK_COVERS` 兜底） |
| 改全局主题色 | `main.jsx` 的 `ConfigProvider` theme token |
| 改侧边栏导航 | `Sidebar.jsx` 的 `NAV_ITEMS` |
| 新增后端接口调用 | `src/api/` 下加模块，统一走 `client.js` 的 `apiFetch` |
| 改后端地址/端口 | `vite.config.js` 的 `server.proxy`，或环境变量 `VITE_API_BASE` |
| 加新页面/路由 | `src/pages/` 新建页面 + `main.jsx` 的 `<Routes>` |
