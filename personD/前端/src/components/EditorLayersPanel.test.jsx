import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditorLayersPanel from "./EditorLayersPanel.jsx";
import {
  addRectElement,
  addTextElement,
  createEmptyCanvas,
} from "../canvas.js";

function sampleCanvas() {
  let canvas = addTextElement(createEmptyCanvas(800, 600), {
    text: "标题",
  });
  canvas = addRectElement(canvas);
  return canvas;
}

describe("EditorLayersPanel", () => {
  it("renders layers top first and marks the selected one", () => {
    const canvas = sampleCanvas();
    const { container } = render(
      <EditorLayersPanel
        open
        canvas={canvas}
        selectedId={canvas.elements[1].id}
        onSelect={vi.fn()}
        onChange={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    const rows = container.querySelectorAll(".editor-layer-row");
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain("形状");
    expect(rows[1].textContent).toContain("标题");
    expect(rows[0].classList.contains("is-active")).toBe(true);
  });

  it("selects, toggles visibility/lock, duplicates and deletes layers", () => {
    const canvas = sampleCanvas();
    const textId = canvas.elements[0].id;
    const onSelect = vi.fn();
    const onChange = vi.fn();
    const onDuplicate = vi.fn();
    const onDelete = vi.fn();

    render(
      <EditorLayersPanel
        open
        canvas={canvas}
        selectedId={null}
        onSelect={onSelect}
        onChange={onChange}
        onDuplicate={onDuplicate}
        onDelete={onDelete}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByText("标题"));
    expect(onSelect).toHaveBeenCalledWith(textId);

    fireEvent.click(screen.getByRole("button", { name: "隐藏 标题" }));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0].elements[0].visible).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "锁定 标题" }));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange.mock.calls[1][0].elements[0].locked).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "复制 标题" }));
    expect(onDuplicate).toHaveBeenCalledWith(textId);

    fireEvent.click(screen.getByRole("button", { name: "删除 标题" }));
    expect(onDelete).toHaveBeenCalledWith(textId);
  });

  it("returns null when closed", () => {
    const canvas = sampleCanvas();
    const { container } = render(
      <EditorLayersPanel
        open={false}
        canvas={canvas}
        selectedId={null}
        onSelect={vi.fn()}
        onChange={vi.fn()}
        onDuplicate={vi.fn()}
        onDelete={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
