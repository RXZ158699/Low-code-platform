import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { describe, expect, it, vi } from "vitest";
import EditorCollagePanel from "./EditorCollagePanel.jsx";

function renderPanel(initial = {}, extra = {}) {
  const onChange = vi.fn();
  const onDelete = vi.fn();
  const onDuplicate = vi.fn();
  const onLayer = vi.fn();
  const onAddImages = vi.fn();

  function Harness() {
    const [item, setItem] = useState({
      type: "collage",
      layoutId: "2-v",
      rowCount: 1,
      colCount: 2,
      gap: 8,
      padding: 0,
      radius: 0,
      opacity: 100,
      fill: "#ffffff",
      x: 152,
      y: 129,
      width: 400,
      height: 200,
      cells: [
        { r: 1, c: 1, rs: 1, cs: 1 },
        { r: 1, c: 2, rs: 1, cs: 1 },
      ],
      ...initial,
    });
    return (
      <AntdApp>
        <EditorCollagePanel
          item={item}
          canvas={{ width: 800, height: 600 }}
          onChange={(patch) => {
            onChange(patch);
            setItem((current) => ({ ...current, ...patch }));
          }}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onLayer={onLayer}
          onAddImages={onAddImages}
          {...extra}
        />
      </AntdApp>
    );
  }

  return { onChange, onDelete, onDuplicate, onLayer, onAddImages, ...render(<Harness />) };
}

describe("EditorCollagePanel", () => {
  it("shows the collage property layout", () => {
    renderPanel();
    expect(screen.getByRole("tab", { name: "拼图" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("tab", { name: "动画" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "图层顺序" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "翻转" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "锁定" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "格式刷" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "复制图层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除图层" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加图片" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "适应画布尺寸" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拼图布局" })).toBeInTheDocument();
    expect(screen.getByText("无缝模式")).toBeInTheDocument();
    expect(screen.getByText("外框")).toBeInTheDocument();
    expect(screen.getByText("内框")).toBeInTheDocument();
    expect(screen.getByText("圆角")).toBeInTheDocument();
    expect(screen.getByText("背景")).toBeInTheDocument();
    expect(screen.getByText("不透明度")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "尺寸" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "位置" })).toBeInTheDocument();
    expect(screen.getByLabelText("宽")).toHaveValue(400);
    expect(screen.getByLabelText("高")).toHaveValue(200);
    expect(screen.getByLabelText("X")).toHaveValue(152);
    expect(screen.getByLabelText("Y")).toHaveValue(129);
  });

  it("fits to the canvas, locks, and edits size", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    fireEvent.change(screen.getByLabelText("宽"), { target: { value: "500" } });
    expect(onChange).toHaveBeenCalledWith({ width: 500, height: 250 });

    await user.click(screen.getByRole("button", { name: "适应画布尺寸" }));
    expect(onChange).toHaveBeenCalledWith({
      x: 0,
      y: 0,
      width: 800,
      height: 600,
    });

    await user.click(screen.getByRole("button", { name: "锁定" }));
    expect(onChange).toHaveBeenCalledWith({ locked: true });
  });

  it("turns on seamless mode and switches layout", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("switch", { name: "无缝模式" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ seamless: true, gap: 0 }),
    );

    await user.click(screen.getByRole("button", { name: "拼图布局" }));
    await user.click(screen.getByRole("button", { name: "2-图布局2" }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ layoutId: "2-h", rowCount: 2, colCount: 1 }),
    );
  });

  it("shows the animation placeholder", async () => {
    const user = userEvent.setup();
    renderPanel();
    await user.click(screen.getByRole("tab", { name: "动画" }));
    expect(screen.getByText("动画功能开发中")).toBeInTheDocument();
  });
});
