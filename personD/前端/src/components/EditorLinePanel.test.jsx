import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { describe, expect, it, vi } from "vitest";
import EditorLinePanel from "./EditorLinePanel.jsx";

function renderPanel(initial = {}) {
  const onChange = vi.fn();
  const onDelete = vi.fn();
  const onDuplicate = vi.fn();
  const onLayer = vi.fn();

  function Harness() {
    const [item, setItem] = useState({
      type: "shape",
      kind: "dash",
      fill: "#000000",
      strokeWidth: 1,
      opacity: 100,
      x1: 10,
      y1: 20,
      x2: 110,
      y2: 20,
      ...initial,
    });
    return (
      <AntdApp>
        <EditorLinePanel
          item={item}
          onChange={(patch) => {
            onChange(patch);
            setItem((current) => ({ ...current, ...patch }));
          }}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onLayer={onLayer}
        />
      </AntdApp>
    );
  }

  return { onChange, onDelete, onDuplicate, onLayer, ...render(<Harness />) };
}

describe("EditorLinePanel", () => {
  it("shows the line property layout", () => {
    renderPanel();
    expect(screen.getByRole("tab", { name: "图形" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "动画" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "图层顺序" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "翻转" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "锁定" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "格式刷" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制图层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除图层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "调整形状" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "描边" })).toBeInTheDocument();
    expect(screen.getByText("颜色")).toBeInTheDocument();
    expect(screen.getByText("粗细")).toBeInTheDocument();
    expect(screen.getByText("线型")).toBeInTheDocument();
    expect(screen.getByText("不透明度")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "尺寸" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "位置" })).toBeInTheDocument();
    expect(screen.getByLabelText("高")).toBeDisabled();
  });

  it("switches line style, length, and lock", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("button", { name: "直线" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "line" });

    fireEvent.change(screen.getByLabelText("宽"), { target: { value: "200" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        x1: expect.any(Number),
        x2: expect.any(Number),
      }),
    );

    await user.click(screen.getByRole("button", { name: "锁定" }));
    expect(onChange).toHaveBeenCalledWith({ locked: true });
  });

  it("shows the animation placeholder", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("tab", { name: "动画" }));
    expect(screen.getByText("动画功能开发中")).toBeInTheDocument();
  });
});
