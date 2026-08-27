import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { describe, expect, it, vi } from "vitest";
import EditorTextPanel from "./EditorTextPanel.jsx";

function renderPanel(initial = {}) {
  const onChange = vi.fn();

  function Harness() {
    const [item, setItem] = useState({
      type: "text",
      text: "你好",
      fontSize: 24,
      color: "#111827",
      width: 120,
      height: 40,
      x: 0,
      y: 0,
      ...initial,
    });
    return (
      <AntdApp>
        <EditorTextPanel
          item={item}
          onChange={(patch) => {
            onChange(patch);
            setItem((current) => ({ ...current, ...patch }));
          }}
          onDelete={vi.fn()}
          onDuplicate={vi.fn()}
          onLayer={vi.fn()}
        />
      </AntdApp>
    );
  }

  return { onChange, ...render(<Harness />) };
}

describe("EditorTextPanel effect add/remove", () => {
  it("puts + and - beside fill, stroke, shadow and background", () => {
    renderPanel();

    for (const title of ["填充", "描边", "投影", "背景"]) {
      expect(screen.getByRole("button", { name: `添加${title}` })).toHaveTextContent("+");
      expect(screen.getByRole("button", { name: `删除${title}` })).toHaveTextContent("-");
    }
  });

  it("adds fill only after clicking + and removes it with -", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("button", { name: "填充" }));
    expect(screen.queryByLabelText("渐变左侧颜色")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加填充" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gradientEnabled: true }));
    expect(screen.getByLabelText("渐变左侧颜色")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除填充" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ gradientEnabled: false }));
    expect(screen.queryByLabelText("渐变左侧颜色")).not.toBeInTheDocument();
  });

  it("adds stroke only after clicking + and removes it with -", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("button", { name: "描边" }));
    expect(screen.queryByRole("slider", { name: "描边粗细" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加描边" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ strokeEnabled: true, strokeWidth: 2 }));
    expect(screen.getByRole("slider", { name: "描边粗细" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除描边" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ strokeEnabled: false }));
    expect(screen.queryByRole("slider", { name: "描边粗细" })).not.toBeInTheDocument();
  });

  it("adds shadow only after clicking + and removes it with -", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("button", { name: "投影" }));
    expect(screen.queryByRole("slider", { name: "模糊" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加投影" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ shadowEnabled: true }));
    expect(screen.getByRole("slider", { name: "模糊" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除投影" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ shadowEnabled: false }));
    expect(screen.queryByRole("slider", { name: "模糊" })).not.toBeInTheDocument();
  });

  it("adds background only after clicking + and removes it with -", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("button", { name: "背景" }));
    expect(screen.queryByLabelText("文字背景")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加背景" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ boxBackground: "#ffffff" }));
    expect(screen.getByLabelText("文字背景")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除背景" }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ boxBackground: "" }));
    expect(screen.queryByLabelText("文字背景")).not.toBeInTheDocument();
  });

  it("toggles highlight with a switch instead of an A label", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    expect(screen.queryByRole("button", { name: "划重点" })).not.toBeInTheDocument();
    const toggle = screen.getByRole("switch", { name: "划重点" });
    expect(toggle).toHaveAttribute("aria-checked", "false");

    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ highlight: "#fde047" }));
    expect(toggle).toHaveAttribute("aria-checked", "true");

    await user.click(toggle);
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ highlight: "" }));
    expect(toggle).toHaveAttribute("aria-checked", "false");
  });

  it("applies a warp from the warp menu", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByRole("button", { name: "变形" }));
    await user.click(screen.getByRole("menuitem", { name: "弧形" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ warp: { type: "arc", strength: 44 } }));
  });

  it("emits text color while the picker is open, not only after it closes", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    await user.click(screen.getByLabelText("文字色"));
    const hexInput = document.querySelector(".ant-color-picker-hex-input input");
    expect(hexInput).toBeTruthy();
    fireEvent.change(hexInput, { target: { value: "00FF00" } });

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ color: "#00ff00", gradientEnabled: false }));
  });
});
