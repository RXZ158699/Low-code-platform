# 画布吸附对齐 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在编辑器中拖动/缩放元素时，靠近画布边框或中心线自动吸附，并显示 1px 红色参考线。

**Architecture:** 在 `canvas.js` 中新增两个纯函数 `snapMoveRect` / `snapResizeRect`，负责吸附计算并返回命中的参考线；`WorkEditorPage.jsx` 在 move/resize 拖拽分支调用它们，把命中的参考线渲染成 `.editor-snap-guide` 覆盖层。

**Tech Stack:** React 19 + Vite 7 + Ant Design 5 + JavaScript（JSX）+ Vitest。

## Global Constraints

- 只使用 JavaScript/JSX，不使用 TypeScript。
- 吸附阈值固定为 8 画布像素（`SNAP_GUIDE_DISTANCE`）。
- 参考线固定 6 条：四条边框 + 横竖两条中心线。
- 红线固定 1px、颜色 `#f5222d`、`pointer-events: none`。
- 界面文案为中文；样式写入 `src/styles/editor.css`。
- 提交前 `npm run lint` 和 `npm test` 必须通过。

---

### Task 1: 吸附纯函数与单测

**Files:**
- Modify: `E:\SX2\11\low-code_platform\personD\前端\src\canvas.js`（在 `MIN_ELEMENT_SIZE` 定义之后追加）
- Test: `E:\SX2\11\low-code_platform\personD\前端\src\canvas.test.js`

**Interfaces:**
- Consumes: `MIN_ELEMENT_SIZE`（已存在，值为 16）。
- Produces:
  - `export const SNAP_GUIDE_DISTANCE = 8;`
  - `export function snapMoveRect(rect, width, height, threshold = SNAP_GUIDE_DISTANCE)`，入参 `rect = { x, y, width, height }`，返回 `{ x, y, guides: { vertical: number[], horizontal: number[] } }`。
  - `export function snapResizeRect(rect, handle, width, height, threshold = SNAP_GUIDE_DISTANCE, minSize = MIN_ELEMENT_SIZE)`，返回 `{ x, y, width, height, guides }`。

- [ ] **Step 1: 写失败测试**

在 `src/canvas.test.js` 的 import 中追加：

```js
  snapMoveRect,
  snapResizeRect,
```

在 `describe` 内追加：

```js
  it("snaps a moved rect to the left and top borders", () => {
    expect(
      snapMoveRect({ x: 5, y: 4, width: 100, height: 60 }, 800, 600),
    ).toEqual({
      x: 0,
      y: 0,
      guides: { vertical: [0], horizontal: [0] },
    });
  });

  it("snaps a moved rect edge to the right border and center to the center line", () => {
    const right = snapMoveRect({ x: 695, y: 20, width: 100, height: 60 }, 800, 600);
    expect(right.x).toBe(700);
    expect(right.guides.vertical).toEqual([800]);

    const center = snapMoveRect({ x: 345, y: 20, width: 100, height: 60 }, 800, 600);
    expect(center.x).toBe(350);
    expect(center.guides.vertical).toEqual([400]);
  });

  it("keeps a moved rect unchanged beyond the snap threshold", () => {
    expect(
      snapMoveRect({ x: 30, y: 40, width: 100, height: 60 }, 800, 600),
    ).toEqual({
      x: 30,
      y: 40,
      guides: { vertical: [], horizontal: [] },
    });
  });

  it("snaps only the edge controlled by the resize handle", () => {
    const east = snapResizeRect({ x: 3, y: 100, width: 100, height: 60 }, "e", 800, 600);
    expect(east.x).toBe(3);
    expect(east.guides.vertical).toEqual([]);

    const west = snapResizeRect({ x: 5, y: 100, width: 100, height: 60 }, "w", 800, 600);
    expect(west).toMatchObject({ x: 0, width: 105 });
    expect(west.guides.vertical).toEqual([0]);
  });

  it("snaps the right and bottom edges during corner resize", () => {
    const corner = snapResizeRect(
      { x: 700, y: 540, width: 95, height: 55 },
      "se",
      800,
      600,
    );
    expect(corner.width).toBe(100);
    expect(corner.height).toBe(60);
    expect(corner.guides.vertical).toEqual([800]);
    expect(corner.guides.horizontal).toEqual([600]);
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/canvas.test.js`
Expected: FAIL，`snapMoveRect is not a function`。

- [ ] **Step 3: 实现纯函数**

在 `src/canvas.js` 的 `MIN_ELEMENT_SIZE` 定义后追加：

```js
export const SNAP_GUIDE_DISTANCE = 8;

function bestLineSnap(edge, lines, threshold) {
  let best = null;
  for (const line of lines) {
    const delta = line - edge;
    if (
      Math.abs(delta) <= threshold &&
      (!best || Math.abs(delta) < Math.abs(best.delta))
    ) {
      best = { delta, line };
    }
  }
  return best;
}

export function snapMoveRect(
  rect,
  width,
  height,
  threshold = SNAP_GUIDE_DISTANCE,
) {
  const vertical = [0, width / 2, width];
  const horizontal = [0, height / 2, height];
  const xHit = bestLineSnap(rect.x, vertical, threshold)
    || bestLineSnap(rect.x + rect.width, vertical, threshold)
    || bestLineSnap(rect.x + rect.width / 2, vertical, threshold);
  const yHit = bestLineSnap(rect.y, horizontal, threshold)
    || bestLineSnap(rect.y + rect.height, horizontal, threshold)
    || bestLineSnap(rect.y + rect.height / 2, horizontal, threshold);
  return {
    x: xHit ? rect.x + xHit.delta : rect.x,
    y: yHit ? rect.y + yHit.delta : rect.y,
    guides: {
      vertical: xHit ? [xHit.line] : [],
      horizontal: yHit ? [yHit.line] : [],
    },
  };
}

export function snapResizeRect(
  rect,
  handle,
  width,
  height,
  threshold = SNAP_GUIDE_DISTANCE,
  minSize = MIN_ELEMENT_SIZE,
) {
  const vertical = [0, width / 2, width];
  const horizontal = [0, height / 2, height];
  let x = rect.x;
  let y = rect.y;
  let nextWidth = rect.width;
  let nextHeight = rect.height;
  const guides = { vertical: [], horizontal: [] };

  if (handle.includes("e")) {
    const hit = bestLineSnap(rect.x + rect.width, vertical, threshold);
    if (hit) {
      nextWidth = Math.max(minSize, rect.width + hit.delta);
      guides.vertical.push(hit.line);
    }
  }
  if (handle.includes("w")) {
    const hit = bestLineSnap(rect.x, vertical, threshold);
    if (hit) {
      x = rect.x + hit.delta;
      nextWidth = rect.width - hit.delta;
      if (nextWidth < minSize) {
        x = rect.x + rect.width - minSize;
        nextWidth = minSize;
      }
      guides.vertical.push(hit.line);
    }
  }
  if (handle.includes("s")) {
    const hit = bestLineSnap(rect.y + rect.height, horizontal, threshold);
    if (hit) {
      nextHeight = Math.max(minSize, rect.height + hit.delta);
      guides.horizontal.push(hit.line);
    }
  }
  if (handle.includes("n")) {
    const hit = bestLineSnap(rect.y, horizontal, threshold);
    if (hit) {
      y = rect.y + hit.delta;
      nextHeight = rect.height - hit.delta;
      if (nextHeight < minSize) {
        y = rect.y + rect.height - minSize;
        nextHeight = minSize;
      }
      guides.horizontal.push(hit.line);
    }
  }
  return { x, y, width: nextWidth, height: nextHeight, guides };
}
```

注意：move 的候选按“左边缘 → 右边缘 → 中心”顺序求值，`bestLineSnap` 用 `<` 比较，距离相同取先命中的边缘；resize 只处理手柄控制的边缘。

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/canvas.test.js`
Expected: PASS。

- [ ] **Step 5: 提交**

```bash
git add "personD/前端/src/canvas.js" "personD/前端/src/canvas.test.js"
git commit -m "feat: 画布边框中心线吸附纯函数"
```

### Task 2: 编辑器接入吸附与红线渲染

**Files:**
- Modify: `E:\SX2\11\low-code_platform\personD\前端\src\pages\WorkEditorPage.jsx`
- Modify: `E:\SX2\11\low-code_platform\personD\前端\src\styles\editor.css`
- Test: `E:\SX2\11\low-code_platform\personD\前端\src\pages\WorkEditorPage.test.jsx`

**Interfaces:**
- Consumes: `snapMoveRect(rect, width, height)`、`snapResizeRect(rect, handle, width, height)`，返回 `{ x, y, width?, height?, guides }`。
- Produces: 拖拽期间渲染 `.editor-snap-guide.is-vertical` / `.editor-snap-guide.is-horizontal`；指针抬起后清除。

- [ ] **Step 1: 写失败 UI 测试**

在 `src/pages/WorkEditorPage.test.jsx` 末尾（`describe` 内）追加：

```js
  it("shows a red snap guide and snaps a moved element to the canvas border", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "方形" }));
    const layer = screen.getByLabelText("在画布上绘制方形");
    layer.getBoundingClientRect = () => ({
      x: 0,
      y: 0,
      left: 0,
      top: 0,
      right: 800,
      bottom: 600,
      width: 800,
      height: 600,
      toJSON() {},
    });
    fireEvent.pointerDown(layer, {
      button: 0,
      clientX: 80,
      clientY: 60,
      pointerId: 7,
    });
    fireEvent.pointerMove(window, {
      clientX: 280,
      clientY: 180,
      pointerId: 7,
    });
    fireEvent.pointerUp(window, {
      clientX: 280,
      clientY: 180,
      pointerId: 7,
    });

    await waitFor(() => {
      expect(document.querySelector(".editor-el.is-shape")).toBeTruthy();
    });
    const element = document.querySelector(".editor-el.is-shape");
    const zoom =
      Number.parseFloat(
        document
          .querySelector(".editor-artboard")
          .style.transform.replace("scale(", "")
          .replace(")", ""),
      ) || 1;

    fireEvent.pointerDown(element, {
      button: 0,
      clientX: 80 * zoom,
      clientY: 60 * zoom,
      pointerId: 8,
    });
    fireEvent.pointerMove(window, {
      clientX: (80 - 78) * zoom,
      clientY: (60 - 58) * zoom,
      pointerId: 8,
    });

    await waitFor(() => expect(element.style.left).toBe("0px"));
    const guide = document.querySelector(".editor-snap-guide.is-vertical");
    expect(guide).toBeTruthy();
    expect(guide.style.left).toBe("0px");

    fireEvent.pointerUp(window, {
      clientX: (80 - 78) * zoom,
      clientY: (60 - 58) * zoom,
      pointerId: 8,
    });
    expect(
      document.querySelector(".editor-snap-guide.is-vertical"),
    ).not.toBeInTheDocument();
  });
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/pages/WorkEditorPage.test.jsx -t "snap guide"`
Expected: FAIL，`.editor-snap-guide` 不存在。

- [ ] **Step 3: 接入 move/resize 与 guides 状态**

在 `WorkEditorPage.jsx` 的 canvas import 中追加两个名称：

```js
  snapMoveRect,
  snapResizeRect,
```

在 `const [drawDraft, setDrawDraft] = useState(null);` 后追加：

```js
  const [snapGuides, setSnapGuides] = useState({ vertical: [], horizontal: [] });
```

把 `handlePointerMove` 中的 move 分支替换为：

```js
      if (drag.type === "move") {
        const currentCanvas = canvasRef.current;
        const live =
          currentCanvas.elements.find((entry) => entry.id === drag.id) ||
          drag.start;
        const proposed = {
          x: drag.start.x + dx,
          y: drag.start.y + dy,
          width: drag.start.width,
          height: drag.start.height,
        };
        const snapped = snapMoveRect(
          proposed,
          currentCanvas.width,
          currentCanvas.height,
        );
        setSnapGuides(snapped.guides);
        const ox = snapped.x - proposed.x;
        const oy = snapped.y - proposed.y;
        const patch = { x: snapped.x, y: snapped.y };
        if (Number.isFinite(drag.start.x1)) {
          patch.x1 = drag.start.x1 + dx + ox;
          patch.y1 = drag.start.y1 + dy + oy;
          patch.x2 = drag.start.x2 + dx + ox;
          patch.y2 = drag.start.y2 + dy + oy;
        }
        setCanvas((current) => updateElement(current, drag.id, patch));
        return;
      }
```

把 resize 分支中非 text 的 `setCanvas` 替换为：

```js
      const currentCanvas = canvasRef.current;
      const snapped = snapResizeRect(
        box,
        drag.handle,
        currentCanvas.width,
        currentCanvas.height,
      );
      setSnapGuides(snapped.guides);
      setCanvas((current) =>
        updateElement(current, drag.id, {
          x: snapped.x,
          y: snapped.y,
          width: snapped.width,
          height: snapped.height,
        }),
      );
```

把 resize 分支中 text 的 `setCanvas` 替换为：

```js
        const currentCanvas = canvasRef.current;
        const snapped = snapResizeRect(
          box,
          drag.handle,
          currentCanvas.width,
          currentCanvas.height,
        );
        setSnapGuides(snapped.guides);
        setCanvas((current) =>
          updateElement(current, drag.id, {
            ...box,
            x: snapped.x,
            y: snapped.y,
            width: snapped.width,
            height: snapped.height,
          }),
        );
```

在 `handlePointerUp` 中 `dragRef.current = null;` 后追加：

```js
      setSnapGuides({ vertical: [], horizontal: [] });
```

在 `.editor-stage-frame` 内、`.editor-artboard` 闭合 `</div>` 之后追加红线层：

```jsx
                {snapGuides.vertical.map((value) => (
                  <div
                    key={`guide-v-${value}`}
                    className="editor-snap-guide is-vertical"
                    style={{ left: value * zoom }}
                  />
                ))}
                {snapGuides.horizontal.map((value) => (
                  <div
                    key={`guide-h-${value}`}
                    className="editor-snap-guide is-horizontal"
                    style={{ top: value * zoom }}
                  />
                ))}
```

- [ ] **Step 4: 添加样式**

在 `src/styles/editor.css` 末尾追加：

```css
.editor-snap-guide {
  position: absolute;
  background: #f5222d;
  pointer-events: none;
  z-index: 30;
}
.editor-snap-guide.is-vertical {
  top: 0;
  bottom: 0;
  width: 1px;
}
.editor-snap-guide.is-horizontal {
  left: 0;
  right: 0;
  height: 1px;
}
```

- [ ] **Step 5: 运行 UI 测试确认通过**

Run: `npx vitest run src/pages/WorkEditorPage.test.jsx -t "snap guide"`
Expected: PASS。

- [ ] **Step 6: 全量验证**

Run:
```bash
npm run lint
npm test
```
Expected: lint 无输出、297+ 条测试全部通过。

- [ ] **Step 7: 提交**

```bash
git add "personD/前端/src/pages/WorkEditorPage.jsx" "personD/前端/src/styles/editor.css" "personD/前端/src/pages/WorkEditorPage.test.jsx"
git commit -m "feat: 编辑器拖动缩放吸附并显示红色参考线"
```
