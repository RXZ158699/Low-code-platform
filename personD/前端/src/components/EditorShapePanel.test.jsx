import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { describe, expect, it, vi } from "vitest";
import EditorShapePanel from "./EditorShapePanel.jsx";

function renderPanel(initial = {}) {
  const onChange = vi.fn();
  const onDelete = vi.fn();
  const onDuplicate = vi.fn();
  const onLayer = vi.fn();

  function Harness() {
    const [item, setItem] = useState({
      id: "shape-1",
      type: "shape",
      kind: "triangle",
      fill: "#2563eb",
      x: 40,
      y: 60,
      width: 200,
      height: 100,
      ...initial,
    });
    return (
      <AntdApp>
        <EditorShapePanel
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

describe("EditorShapePanel", () => {
  it("shows the filled-shape property layout from the mockup", () => {
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
    expect(screen.getByText("圆角")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "填充" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "描边" })).toBeInTheDocument();
    expect(screen.getByLabelText("填充颜色")).toBeInTheDocument();
    expect(screen.getByLabelText("描边颜色")).toBeInTheDocument();
    expect(screen.getByText("粗细")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "描边位置" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "居中" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "直线" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("不透明度")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "尺寸" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "位置" })).toBeInTheDocument();
    expect(screen.getByLabelText("宽")).toHaveValue(200);
    expect(screen.getByLabelText("高")).toHaveValue(100);
    expect(screen.getByLabelText("X")).toHaveValue(40);
    expect(screen.getByLabelText("Y")).toHaveValue(60);
  });

  it("toggles fill, stroke align, lock, and proportional size", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("button", { name: "隐藏填充" }));
    expect(onChange).toHaveBeenCalledWith({ fillVisible: false });

    await user.click(screen.getByRole("button", { name: "外侧" }));
    expect(onChange).toHaveBeenCalledWith({ strokeAlign: "outer" });

    await user.click(screen.getByRole("button", { name: "虚线" }));
    expect(onChange).toHaveBeenCalledWith({ strokeStyle: "dash" });

    await user.click(screen.getByRole("button", { name: "锁定" }));
    expect(onChange).toHaveBeenCalledWith({ locked: true });

    await user.click(screen.getByRole("button", { name: "锁定宽高比" }));
    expect(onChange).toHaveBeenCalledWith({ aspectLocked: true });

    fireEvent.change(screen.getByLabelText("宽"), { target: { value: "300" } });
    expect(onChange).toHaveBeenCalledWith({ width: 300, height: 150 });
  });

  it("switches the shape kind from 调整形状 and shows the animation placeholder", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("button", { name: "调整形状" }));
    await user.click(await screen.findByRole("menuitem", { name: "圆形" }));
    expect(onChange).toHaveBeenCalledWith({ kind: "circle" });

    await user.click(screen.getByRole("tab", { name: "动画" }));
    expect(screen.getByText("动画功能开发中")).toBeInTheDocument();
  });
});
