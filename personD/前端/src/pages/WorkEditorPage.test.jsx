import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkEditorPage from "./WorkEditorPage.jsx";
import { getWork } from "../api/works.js";

vi.mock("../api/works.js", () => ({
  getWork: vi.fn(),
  updateWork: vi.fn(),
  publishWork: vi.fn(),
}));

function renderEditor() {
  return render(
    <MemoryRouter initialEntries={["/works/9"]}>
      <AntdApp>
        <Routes>
          <Route path="/works/:id" element={<WorkEditorPage />} />
        </Routes>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("WorkEditorPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getWork.mockResolvedValue({
      id: 9,
      title: "未命名作品",
      status: "DRAFT",
      canvasJson: '{"width":800,"height":600,"elements":[]}',
    });
  });

  it("renders the editor chrome and loaded canvas size", async () => {
    renderEditor();

    expect(await screen.findByDisplayValue("未命名作品")).toBeInTheDocument();
    expect(screen.getByText("800 × 600 px")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "文件" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /发\s*布/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /导\s*出/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "文字" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "画板" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "调整尺寸" })).toBeInTheDocument();
    expect(screen.getByText("画板 1/1")).toBeInTheDocument();
    await waitFor(() => expect(getWork).toHaveBeenCalledWith("9"));
  });

  it("adds text from the left toolbar", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "文字" }));

    expect(await screen.findByDisplayValue("双击编辑文字")).toBeInTheDocument();
  });

  it("resizes the canvas from the properties panel", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByText("800 × 600 px");

    await user.click(screen.getByRole("button", { name: "调整尺寸" }));
    await user.clear(screen.getByLabelText("宽"));
    await user.type(screen.getByLabelText("宽"), "1200");
    await user.clear(screen.getByLabelText("高"));
    await user.type(screen.getByLabelText("高"), "800");
    await user.click(screen.getByRole("button", { name: "应用" }));

    expect(screen.getByText("1200 × 800 px")).toBeInTheDocument();
  });

  it("zooms the canvas with Ctrl+wheel and prevents page zoom", async () => {
    renderEditor();
    await screen.findByDisplayValue("未命名作品");
    const zoomButton = screen.getByRole("button", { name: "缩放" });
    const before = zoomButton.textContent;

    const event = new window.WheelEvent("wheel", {
      ctrlKey: true,
      deltaY: -240,
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    await waitFor(() => {
      expect(zoomButton.textContent).not.toBe(before);
    });
  });

  it("slides out the add panel beside the rail", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    expect(screen.queryByRole("dialog", { name: "添加" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加" }));

    expect(screen.getByRole("dialog", { name: "添加" })).toHaveClass("is-open");
    expect(screen.getByText("图片/视频")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "本地上传" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /H1 标题/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "涂鸦笔" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /拼图/ })).toBeInTheDocument();
  });

  it("closes the add panel from the collapse handle", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "收起添加面板" }));

    expect(screen.queryByRole("dialog", { name: "添加" })).not.toBeInTheDocument();
  });

  it("adds heading text from the add panel", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: /H1 标题/ }));

    expect(await screen.findByDisplayValue("标题")).toBeInTheDocument();
  });

  it("lets the user edit and delete canvas text", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "文字" }));
    const copy = await screen.findByLabelText("文案");
    await user.clear(copy);
    await user.type(copy, "你好");
    expect(copy).toHaveValue("你好");
    expect(document.querySelector(".editor-el-copy")).toHaveTextContent("你好");
    const afterHello = Number.parseFloat(document.querySelector(".editor-el.is-text").style.width);

    await user.type(copy, "世界世界世界世界");
    expect(Number.parseFloat(document.querySelector(".editor-el.is-text").style.width)).toBeGreaterThan(afterHello);

    await user.click(screen.getByRole("button", { name: "删除图层" }));

    expect(screen.queryByLabelText("文案")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "画板" })).toBeInTheDocument();
  });

  it("deletes the text box when it is left empty", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "文字" }));
    const copy = await screen.findByLabelText("文案");
    await user.clear(copy);
    await user.click(screen.getByLabelText("作品名称"));

    expect(screen.queryByLabelText("文案")).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "画板" })).toBeInTheDocument();
    expect(document.querySelector(".editor-el-copy")).not.toBeInTheDocument();
  });

  it("deletes a shape from the properties panel", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "素材" }));
    expect(await screen.findByRole("heading", { name: "图形" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除图层" }));

    expect(screen.queryByRole("heading", { name: "图形" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "画板" })).toBeInTheDocument();
  });

  it("shows move and resize handles for a selected element", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "素材" }));

    expect(await screen.findByLabelText("拖拽图层")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "缩放 右下" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "缩放 左上" })).toBeInTheDocument();
  });

  it(
    "formats selected text from the properties panel",
    async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "文字" }));

    expect(await screen.findByRole("tab", { name: "文字" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("字号")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "字体" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "填充" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "添加填充" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "删除填充" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "填充" }));
    expect(screen.queryByLabelText("填充文字颜色")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("渐变左侧颜色")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加填充" }));
    expect(screen.getByLabelText("渐变左侧颜色")).toBeInTheDocument();
    expect(screen.getByLabelText("渐变右侧颜色")).toBeInTheDocument();
    expect(screen.queryByLabelText("填充色")).not.toBeInTheDocument();
    expect(screen.queryByText("变形")).not.toBeInTheDocument();
    expect(screen.queryByText("特效")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除填充" }));
    expect(screen.queryByLabelText("渐变左侧颜色")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "加粗" }));
    expect(screen.getByRole("button", { name: "加粗" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "居中对齐" }));
    expect(screen.getByRole("button", { name: "居中对齐" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByRole("button", { name: "变形" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "特效" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "描边" }));
    expect(screen.queryByRole("slider", { name: "描边粗细" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加描边" }));
    expect(screen.getByRole("slider", { name: "描边粗细" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除描边" }));
    expect(screen.queryByRole("slider", { name: "描边粗细" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "投影" }));
    expect(screen.queryByRole("slider", { name: "模糊" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加投影" }));
    expect(screen.getByRole("slider", { name: "模糊" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除投影" }));
    expect(screen.queryByRole("slider", { name: "模糊" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "背景", expanded: false }));
    expect(screen.queryByLabelText("文字背景")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加背景" }));
    expect(screen.getByLabelText("文字背景")).toBeInTheDocument();
    expect(screen.getByRole("slider", { name: "背景透明度" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除背景" }));
    expect(screen.queryByLabelText("文字背景")).not.toBeInTheDocument();
    },
    15000,
  );

  it("previews selected text color on the canvas while the picker is still open", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "文字" }));
    await user.dblClick(document.querySelector(".editor-el.is-text"));

    const editor = await screen.findByLabelText("编辑文字");
    editor.setSelectionRange(0, 2);
    fireEvent.select(editor);

    expect(document.querySelector(".editor-el-copy")).toHaveTextContent("双击编辑文字");

    await user.click(screen.getByLabelText("文字色"));
    const hexInput = document.querySelector(".ant-color-picker-hex-input input");
    expect(hexInput).toBeTruthy();
    fireEvent.change(hexInput, { target: { value: "FF0000" } });

    const fills = [...document.querySelectorAll(".editor-el-copy-svg text")].map((node) =>
      String(node.getAttribute("fill") || "").toLowerCase(),
    );
    expect(fills).toContain("#ff0000");
    expect(fills.some((fill) => fill !== "#ff0000")).toBe(true);
    expect(screen.getByLabelText("编辑文字")).toBeInTheDocument();
  });
});
