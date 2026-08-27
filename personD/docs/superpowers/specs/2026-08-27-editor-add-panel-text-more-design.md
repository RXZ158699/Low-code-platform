# 编辑器「添加」弹框 - 文字查看更多（设计）

- 日期：2026-08-27
- 状态：待评审
- 范围：personD/前端 编辑器

## 背景

编辑器左侧「添加」弹框的文字区域右侧有一个「查看更多」按钮。当前点击后会调用 `onSelect("text-more")`，但 `handleAddSelect` 没有处理该动作，最终落到「功能开发中」提示，用户无法继续。

## 目标

1. 点击「添加」弹框文字区的「查看更多」时，关闭当前「添加」弹框，并打开文字弹框。
2. 文字弹框的收起按钮点击后直接关闭，不回到「添加」弹框。
3. 文字弹框内部自己的「查看更多」本次不处理，保持现状。

## 方案

采用父组件 action 分发方案（方案 A）：

- 在 `src/pages/WorkEditorPage.jsx` 的 `handleAddSelect` 中新增 `text-more` 分支：
  - 清空绘制工具与绘制草稿：`setDrawTool(null)`、`setDrawDraft(null)`
  - 关闭「添加」弹框：`setAddPanelOpen(false)`
  - 打开文字弹框：`setActiveTool("text")`
- 不修改 `src/components/EditorAddPanel.jsx` 和 `src/components/EditorTextPickerPanel.jsx`。

## 交互流程

1. 用户打开「添加」弹框（`addPanelOpen = true`）。
2. 点击文字区「查看更多」，触发 `onSelect("text-more")`。
3. `handleAddSelect` 处理：清绘制状态 → 关闭添加弹框 → `activeTool = "text"`。
4. 文字弹框展开，用户可选择 H1 / H2 / 正文预设。
5. 用户点击文字弹框收起按钮 → `activeTool = ""`，弹框直接关闭。

## 测试

在 `src/pages/WorkEditorPage.test.jsx` 新增用例：

- 渲染编辑器。
- 点击「添加」打开添加弹框。
- 点击文字区「查看更多」。
- 断言添加弹框关闭（面板不可见或 `aria-hidden` 生效）。
- 断言文字弹框打开（`role="dialog"` 名称为「文字」且可见）。
- 断言不出现「功能开发中」提示。

## 范围与不做的事

- 只修改 `WorkEditorPage.jsx` 一个文件。
- 不涉及数据模型、API、样式。
- 不处理文字弹框内部的「查看更多」。

## 验收标准

- 改动文件 lint 通过。
- `npm test` 全绿。
- 浏览器验证：添加 → 文字「查看更多」→ 文字弹框打开；点收起 → 直接关闭。
