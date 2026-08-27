# 画布吸附对齐（边框 + 中心线）设计

日期：2026-08-27
状态：已确认，待实现
涉及文件：`src/canvas.js`、`src/pages/WorkEditorPage.jsx`、`src/styles/editor.css`、相关测试

## 背景与目标

编辑器画布中手动拖拽元素时，缺少对齐辅助。本次为拖动与缩放增加“边框/中心线吸附”：元素边缘靠近画布边框或中心线时，显示 1px 红色参考线，并将元素自动吸附到参考线上，提升排版效率。

## 交互规则

- 固定参考线共 6 条：画布四条边框（`x=0`、`x=width`、`y=0`、`y=height`）加横竖两条中心线（`x=width/2`、`y=height/2`）。
- 吸附阈值 8 画布像素；同一轴上若有多条可命中，取距离最近的一条。
- 拖动（move）：元素的左/右/上/下边缘可吸附边框，元素中心可吸附中心线。
- 缩放（resize）：只有当前手柄控制的边缘参与吸附，例如 `e` 手柄只吸右边缘、`nw` 手柄只吸左边缘和上边缘；中心线吸附不用于缩放。
- 线条元素：按端点包围盒（min/max）吸附，命中后所有端点整体平移。
- 命中期间显示 1px 红色实线，指针抬起立即清除。

## 吸附算法

新增纯函数，输入矩形、当前手势（move 或 resize 手柄）、画布尺寸与阈值，输出修正后的矩形和命中的参考线。

候选边缘：

- move：`x`（左）、`x + width`（右）、`x + width / 2`（中心）；纵向同理。
- resize：按手柄决定候选边缘，`n` 取上边缘、`s` 取下边缘、`e` 取右边缘、`w` 取左边缘，四角取对应两个边缘。

命中判定：

- 对每个候选边缘与对应参考线计算 `delta = 参考线 - 边缘`。
- 取 `|delta| <= 8` 且绝对值最小的组合；无命中则不改变该轴。
- 应用 delta 后保持 `MIN_ELEMENT_SIZE` 下限。

## 参考线渲染

- 新增 `guides` 状态：`{ vertical: number[], horizontal: number[] }`。
- 在 `.editor-stage-frame` 内、画板上层渲染两个方向的红色线条。
- 坐标使用 `value * zoom`，线条宽/高固定 1px，保证屏幕上始终是 1px。
- 样式：红色 `#f5222d`、`pointer-events: none`、z-index 高于元素层。
- `handlePointerUp` 时清空 `guides`。

## 文件改动

| 文件 | 改动 |
| --- | --- |
| `src/canvas.js` | 新增吸附常量与纯函数（move/resize 两套入口） |
| `src/pages/WorkEditorPage.jsx` | move/resize 分支接入吸附；新增 `guides` 状态；渲染红线层；松手清空 |
| `src/styles/editor.css` | 新增 `.editor-snap-guide` 垂直/水平样式 |
| `src/canvas.test.js` | 吸附函数单测：边框、中心线、阈值外、resize 边缘限制 |
| `src/pages/WorkEditorPage.test.jsx` | 拖动到边框附近显示红线并吸附 |

## 非目标

- 不做元素与元素之间的边缘对齐。
- 不修改元素拖出画布范围的限制逻辑。
- 不做线条端点编辑（`line-endpoint`）的吸附。
