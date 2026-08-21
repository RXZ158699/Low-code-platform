import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WorkEditorPage from "./WorkEditorPage.jsx";
import { getWork, updateWork, uploadWorkThumbnail } from "../api/works.js";
import { uploadAsset } from "../api/assets.js";
import { canvasPreviewBlob } from "../canvasPreview.js";

vi.mock("../api/works.js", () => ({
  getWork: vi.fn(),
  updateWork: vi.fn(),
  publishWork: vi.fn(),
  uploadWorkThumbnail: vi.fn(),
}));

vi.mock("../api/assets.js", () => ({
  uploadAsset: vi.fn(),
}));

vi.mock("../canvasPreview.js", () => ({
  canvasPreviewBlob: vi.fn(),
}));

vi.mock("../mediaFile.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readMediaSize: vi.fn(() => Promise.resolve({ width: 400, height: 300 })),
  };
});

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
    updateWork.mockResolvedValue({ id: 9, title: "未命名作品" });
    uploadWorkThumbnail.mockResolvedValue({
      id: 9,
      thumbnailUrl: "http://cdn/a.png",
    });
    uploadAsset.mockResolvedValue({
      id: 8,
      fileName: "a.png",
      url: "http://cdn/a.png",
      fileType: "image",
    });
    canvasPreviewBlob.mockResolvedValue(
      new Blob(["png"], { type: "image/png" }),
    );
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
    expect(
      screen.getByRole("button", { name: "调整尺寸" }),
    ).toBeInTheDocument();
    expect(screen.getByText("画板 1/1")).toBeInTheDocument();
    await waitFor(() => expect(getWork).toHaveBeenCalledWith("9"));
    expect(screen.queryByText("setCanvas is not defined")).not.toBeInTheDocument();
    expect(screen.queryByText("作品加载失败")).not.toBeInTheDocument();
  });

  it("reloads saved canvas json after a fresh mount without a setCanvas error", async () => {
    const { unmount } = renderEditor();
    await screen.findByDisplayValue("未命名作品");
    unmount();

    renderEditor();
    expect(await screen.findByDisplayValue("未命名作品")).toBeInTheDocument();
    expect(screen.getByText("800 × 600 px")).toBeInTheDocument();
    expect(screen.queryByText("setCanvas is not defined")).not.toBeInTheDocument();
  });

  it("touches the work when entering the editor so the modified time refreshes", async () => {
    renderEditor();
    await screen.findByDisplayValue("未命名作品");
    await waitFor(() => {
      expect(updateWork).toHaveBeenCalledWith("9", {});
    });
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

    expect(
      screen.queryByRole("dialog", { name: "添加" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "添加" }));

    expect(screen.getByRole("dialog", { name: "添加" })).toHaveClass("is-open");
    expect(screen.getByText("图片/视频")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "本地上传" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /H1 标题/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "涂鸦笔" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /拼图/ })).toBeInTheDocument();
  });

  it("opens the file picker from 本地上传 and places an image on the canvas", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");
    await user.click(screen.getByRole("button", { name: "添加" }));

    const input = screen.getByLabelText("选择本地图片或视频");
    expect(input.getAttribute("accept")).toContain("image/png");
    expect(input.getAttribute("accept")).toContain("video/mp4");
    const clickSpy = vi.spyOn(input, "click");
    await user.click(screen.getByRole("button", { name: "本地上传" }));
    expect(clickSpy).toHaveBeenCalled();

    const file = new File(["png"], "a.png", { type: "image/png" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadAsset).toHaveBeenCalledWith(file, { fileType: "image" });
    });
    expect(await screen.findByRole("img", { name: "a.png" })).toHaveAttribute(
      "src",
      "http://cdn/a.png",
    );
  });

  it("uploads a video from 本地上传 onto the canvas", async () => {
    uploadAsset.mockResolvedValue({
      id: 9,
      fileName: "clip.mp4",
      url: "http://cdn/clip.mp4",
      fileType: "video",
    });
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");
    await user.click(screen.getByRole("button", { name: "添加" }));

    const input = screen.getByLabelText("选择本地图片或视频");
    const file = new File(["mp4"], "clip.mp4", { type: "video/mp4" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadAsset).toHaveBeenCalledWith(file, { fileType: "video" });
    });
    const video = document.querySelector("video.editor-el-media");
    expect(video).toHaveAttribute("src", "http://cdn/clip.mp4");
  });

  it("closes the add panel from the collapse handle", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "收起添加面板" }));

    expect(
      screen.queryByRole("dialog", { name: "添加" }),
    ).not.toBeInTheDocument();
  });

  it("places a collage layout onto the canvas from the add panel", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "拼图" }));
    await user.click(screen.getByRole("button", { name: "2-图布局1" }));

    const collage = document.querySelector(".editor-el.is-collage");
    expect(collage).not.toBeNull();
    expect(collage).toHaveClass("is-selected");
    expect(collage.querySelectorAll(".editor-el-collage-cell")).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: "灰色占位图" })).toHaveLength(2);
    expect(screen.getByRole("tab", { name: "拼图" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("button", { name: "添加图片" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "适应画布尺寸" }),
    ).toBeInTheDocument();
  });

  it("rotates a collage around its center from the bottom handle", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "拼图" }));
    await user.click(screen.getByRole("button", { name: "2-图布局1" }));

    const handle = screen.getByRole("button", { name: "旋转拼图" });
    const collage = document.querySelector(".editor-el.is-collage");
    expect(collage).not.toBeNull();

    await user.click(handle);
    expect(document.querySelector(".editor-el.is-collage")).not.toBeNull();
    expect(screen.getByRole("tab", { name: "拼图" })).toBeInTheDocument();

    const frame = document.querySelector(".editor-stage-frame");
    frame.getBoundingClientRect = () => ({
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

    fireEvent.pointerDown(handle, {
      button: 0,
      clientX: 400,
      clientY: 500,
      pointerId: 7,
    });
    fireEvent.pointerMove(window, { clientX: 600, clientY: 300, pointerId: 7 });
    fireEvent.pointerUp(window, { clientX: 600, clientY: 300, pointerId: 7 });

    expect(collage.style.transform).toMatch(/rotate\(/);
    const deg = Number.parseFloat(
      collage.style.transform.match(/rotate\(([-.\d]+)deg\)/)[1],
    );
    expect(Math.abs(deg)).toBeGreaterThan(20);
  });

  it("deletes a selected collage from the top-right trash button", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "拼图" }));
    await user.click(screen.getByRole("button", { name: "2-图布局1" }));

    expect(document.querySelector(".editor-el.is-collage")).not.toBeNull();
    const trash = document.querySelector(
      ".editor-transform.is-collage .editor-el-delete",
    );
    expect(trash).not.toBeNull();
    expect(trash).toHaveAttribute("aria-label", "从画布删除");

    await user.click(trash);
    expect(document.querySelector(".editor-el.is-collage")).toBeNull();
  });

  it("fits a selected collage to the artboard from the side panel", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "拼图" }));
    await user.click(screen.getByRole("button", { name: "2-图布局1" }));

    const collage = document.querySelector(".editor-el.is-collage");
    expect(collage).not.toBeNull();
    await user.click(screen.getByRole("button", { name: "适应画布尺寸" }));
    expect(collage).toHaveStyle({
      left: "0px",
      top: "0px",
      width: "800px",
      height: "600px",
    });
  });

  it("fills collage cells from 添加图片", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "拼图" }));
    await user.click(screen.getByRole("button", { name: "2-图布局1" }));

    const input = screen.getByLabelText("选择拼图图片");
    const file = new File(["png"], "cell.png", { type: "image/png" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadAsset).toHaveBeenCalledWith(file, { fileType: "image" });
    });
    const cells = document.querySelectorAll(".editor-el-collage-cell");
    expect(cells[0].style.backgroundImage).toContain("http://cdn/a.png");
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
    const afterHello = Number.parseFloat(
      document.querySelector(".editor-el.is-text").style.width,
    );

    await user.type(copy, "世界世界世界世界");
    expect(
      Number.parseFloat(
        document.querySelector(".editor-el.is-text").style.width,
      ),
    ).toBeGreaterThan(afterHello);

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
    expect(
      await screen.findByRole("heading", { name: "图形" }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除图层" }));

    expect(
      screen.queryByRole("heading", { name: "图形" }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "画板" })).toBeInTheDocument();
  });

  it("shows move and resize handles for a selected element", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "素材" }));

    expect(await screen.findByLabelText("拖拽图层")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "缩放 右下" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "缩放 左上" }),
    ).toBeInTheDocument();
  });

  it("formats selected text from the properties panel", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "文字" }));

    expect(await screen.findByRole("tab", { name: "文字" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByLabelText("字号")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "字体" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "填充" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "添加填充" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "删除填充" }),
    ).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "加粗" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await user.click(screen.getByRole("button", { name: "居中对齐" }));
    expect(screen.getByRole("button", { name: "居中对齐" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(
      screen.queryByRole("button", { name: "变形" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "特效" }),
    ).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "描边" }));
    expect(
      screen.queryByRole("slider", { name: "描边粗细" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加描边" }));
    expect(
      screen.getByRole("slider", { name: "描边粗细" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除描边" }));
    expect(
      screen.queryByRole("slider", { name: "描边粗细" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "投影" }));
    expect(
      screen.queryByRole("slider", { name: "模糊" }),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加投影" }));
    expect(screen.getByRole("slider", { name: "模糊" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除投影" }));
    expect(
      screen.queryByRole("slider", { name: "模糊" }),
    ).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "背景", expanded: false }),
    );
    expect(screen.queryByLabelText("文字背景")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "添加背景" }));
    expect(screen.getByLabelText("文字背景")).toBeInTheDocument();
    expect(
      screen.getByRole("slider", { name: "背景透明度" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "删除背景" }));
    expect(screen.queryByLabelText("文字背景")).not.toBeInTheDocument();
  }, 15000);

  it("previews selected text color on the canvas while the picker is still open", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "文字" }));
    await user.dblClick(document.querySelector(".editor-el.is-text"));

    const editor = await screen.findByLabelText("编辑文字");
    editor.setSelectionRange(0, 2);
    fireEvent.select(editor);

    expect(document.querySelector(".editor-el-copy")).toHaveTextContent(
      "双击编辑文字",
    );

    await user.click(screen.getByLabelText("文字色"));
    const hexInput = document.querySelector(
      ".ant-color-picker-hex-input input",
    );
    expect(hexInput).toBeTruthy();
    fireEvent.change(hexInput, { target: { value: "FF0000" } });

    const fills = [
      ...document.querySelectorAll(".editor-el-copy-svg text"),
    ].map((node) => String(node.getAttribute("fill") || "").toLowerCase());
    expect(fills).toContain("#ff0000");
    expect(fills.some((fill) => fill !== "#ff0000")).toBe(true);
    expect(screen.getByLabelText("编辑文字")).toBeInTheDocument();
  });

  it("uploads a canvas thumbnail when the draft autosaves", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");
    await user.click(screen.getByRole("button", { name: "文字" }));
    await screen.findByDisplayValue("双击编辑文字");

    await waitFor(
      () => {
        expect(updateWork).toHaveBeenCalled();
        expect(canvasPreviewBlob).toHaveBeenCalled();
        expect(uploadWorkThumbnail).toHaveBeenCalled();
      },
      { timeout: 3000 },
    );
    const file = uploadWorkThumbnail.mock.calls[0][1];
    expect(file).toBeInstanceOf(Blob);
    expect(file.type).toBe("image/png");
  });

  it("draws a polygon by dragging on the canvas instead of placing it immediately", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "三角形" }));

    expect(
      screen.queryByRole("heading", { name: "图形" }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".editor-artboard .editor-el.is-shape"),
    ).toBeNull();

    const layer = screen.getByLabelText("在画布上绘制三角形");
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
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 280, clientY: 180, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 280, clientY: 180, pointerId: 1 });

    const shape = await waitFor(() => {
      const node = document.querySelector(
        ".editor-artboard .editor-el.is-shape",
      );
      expect(node).toBeTruthy();
      return node;
    });
    expect(shape).toHaveStyle({
      width: "200px",
      height: "120px",
      left: "80px",
      top: "60px",
    });
    expect(shape.querySelector("svg")).toHaveAttribute(
      "preserveAspectRatio",
      "none",
    );
    expect(screen.getByRole("heading", { name: "图形" })).toBeInTheDocument();
  });

  it("scales a drawn polygon independently horizontally and vertically", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "五边形" }));

    const layer = screen.getByLabelText("在画布上绘制五边形");
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
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 240, clientY: 140, pointerId: 1 });

    const shape = await waitFor(() => {
      const node = document.querySelector(
        ".editor-artboard .editor-el.is-shape",
      );
      expect(node).toBeTruthy();
      return node;
    });
    expect(shape).toHaveStyle({ width: "200px", height: "100px" });

    fireEvent.pointerDown(screen.getByRole("button", { name: "缩放 右" }), {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 90, clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 90, clientY: 40, pointerId: 1 });

    expect(Number.parseFloat(shape.style.height)).toBe(100);
    expect(Number.parseFloat(shape.style.width)).toBeGreaterThan(200);

    const widthAfter = Number.parseFloat(shape.style.width);
    fireEvent.pointerDown(screen.getByRole("button", { name: "缩放 下" }), {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 40, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 40, clientY: 80, pointerId: 1 });

    expect(Number.parseFloat(shape.style.width)).toBe(widthAfter);
    expect(Number.parseFloat(shape.style.height)).toBeGreaterThan(100);
  });

  it("scales a selected element proportionally from a corner handle", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "五边形" }));

    const layer = screen.getByLabelText("在画布上绘制五边形");
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
      clientX: 40,
      clientY: 40,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 240, clientY: 140, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 240, clientY: 140, pointerId: 1 });

    const shape = await waitFor(() => {
      const node = document.querySelector(
        ".editor-artboard .editor-el.is-shape",
      );
      expect(node).toBeTruthy();
      return node;
    });
    expect(shape).toHaveStyle({ width: "200px", height: "100px" });

    fireEvent.pointerDown(screen.getByRole("button", { name: "缩放 右下" }), {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 100, clientY: 10, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 100, clientY: 10, pointerId: 1 });

    const width = Number.parseFloat(shape.style.width);
    const height = Number.parseFloat(shape.style.height);
    expect(width).toBeGreaterThan(200);
    expect(height / width).toBeCloseTo(0.5, 5);
  });

  it("draws a dashed line by dragging on the canvas instead of placing it immediately", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(screen.getByRole("button", { name: "虚线" }));

    expect(
      screen.queryByRole("heading", { name: "图形" }),
    ).not.toBeInTheDocument();
    expect(
      document.querySelector(".editor-artboard .editor-el.is-shape"),
    ).toBeNull();

    const layer = screen.getByLabelText("在画布上绘制虚线");
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
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 280, clientY: 76, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 280, clientY: 76, pointerId: 1 });

    const shape = await waitFor(() => {
      const node = document.querySelector(
        ".editor-artboard .editor-el.is-shape",
      );
      expect(node).toBeTruthy();
      return node;
    });
    const line = shape.querySelector("line");
    expect(line).toHaveAttribute("stroke", "#000000");
    expect(line).toHaveAttribute("stroke-width", "1");
    expect(line).toHaveAttribute("stroke-dasharray");
    expect(
      screen.queryByRole("button", { name: "缩放 右" }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "缩放 下" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText("拖拽图层")).not.toBeInTheDocument();
    expect(screen.getByLabelText("调整线条")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拖动起点" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拖动终点" })).toBeInTheDocument();
    expect(Number.parseFloat(screen.getByLabelText("拖动线条").style.height)).toBeGreaterThan(8);
    expect(Number.parseFloat(screen.getByLabelText("拖动线条").style.width)).toBeGreaterThan(16);
    expect(screen.getByRole("tab", { name: "图形" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "描边" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "虚线" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    const startHandle = screen.getByRole("button", { name: "拖动起点" });
    const endHandle = screen.getByRole("button", { name: "拖动终点" });
    const startLeft = startHandle.style.left;
    const startTop = startHandle.style.top;
    const endTop = endHandle.style.top;
    fireEvent.pointerDown(endHandle, {
      button: 0,
      clientX: 280,
      clientY: 76,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 280, clientY: 200, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 280, clientY: 200, pointerId: 1 });
    expect(startHandle.style.left).toBe(startLeft);
    expect(startHandle.style.top).toBe(startTop);
    expect(endHandle.style.top).not.toBe(endTop);

    await user.click(screen.getByRole("button", { name: "直线" }));
    expect(shape.querySelector("line")).not.toHaveAttribute("stroke-dasharray");
  });

  it("selects the whole artboard on click and shows canvas resize handles", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    expect(screen.queryByLabelText("缩放画布")).not.toBeInTheDocument();

    await user.click(document.querySelector(".editor-artboard"));

    expect(document.querySelector(".editor-artboard")).toHaveClass(
      "is-selected",
    );
    expect(screen.getByLabelText("缩放画布")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "缩放画布 右下" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "缩放画布 左" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "画板" })).toBeInTheDocument();
    expect(screen.queryByLabelText("从画布删除")).not.toBeInTheDocument();
  });

  it("resizes canvas width and height independently from artboard handles", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");
    await user.click(document.querySelector(".editor-artboard"));

    fireEvent.pointerDown(screen.getByRole("button", { name: "缩放画布 右" }), {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 120, clientY: 40, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 120, clientY: 40, pointerId: 1 });

    const afterWidth = screen.getByText(/\d+ × \d+ px/);
    const [widthOnly, heightUnchanged] = afterWidth.textContent
      .match(/\d+/g)
      .map(Number);
    expect(widthOnly).toBeGreaterThan(800);
    expect(heightUnchanged).toBe(600);

    fireEvent.pointerDown(screen.getByRole("button", { name: "缩放画布 下" }), {
      button: 0,
      clientX: 0,
      clientY: 0,
      pointerId: 1,
    });
    fireEvent.pointerMove(window, { clientX: 20, clientY: 80, pointerId: 1 });
    fireEvent.pointerUp(window, { clientX: 20, clientY: 80, pointerId: 1 });

    const afterHeight = screen.getByText(/\d+ × \d+ px/);
    const [widthKept, heightGrown] = afterHeight.textContent
      .match(/\d+/g)
      .map(Number);
    expect(widthKept).toBe(widthOnly);
    expect(heightGrown).toBeGreaterThan(600);
  });

  it("returns to artboard selection after clicking the canvas behind an element", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "素材" }));
    expect(await screen.findByLabelText("拖拽图层")).toBeInTheDocument();

    await user.click(document.querySelector(".editor-artboard"));

    expect(screen.queryByLabelText("拖拽图层")).not.toBeInTheDocument();
    expect(screen.getByLabelText("缩放画布")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "画板" })).toBeInTheDocument();
  });

  it("clears all canvas elements from the artboard trash button", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    await user.click(screen.getByRole("button", { name: "文字" }));
    expect(await screen.findByDisplayValue("双击编辑文字")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "素材" }));
    expect(document.querySelectorAll(".editor-artboard .editor-el").length).toBe(2);

    await user.click(document.querySelector(".editor-artboard"));
    expect(screen.getByLabelText("缩放画布")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "删除画板" }));

    expect(document.querySelector(".editor-artboard .editor-el")).toBeNull();
    expect(screen.getByText("800 × 600 px")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "画板" })).toBeInTheDocument();
    expect(screen.getByLabelText("缩放画布")).toBeInTheDocument();
  });

  it("zooms the canvas view in and out from the dock", async () => {
    const user = userEvent.setup();
    renderEditor();
    await screen.findByDisplayValue("未命名作品");

    const before = screen.getByRole("button", { name: "缩放" }).textContent;
    await user.click(screen.getByRole("button", { name: "放大" }));
    const zoomedIn = screen.getByRole("button", { name: "缩放" }).textContent;
    expect(Number.parseInt(zoomedIn, 10)).toBeGreaterThan(
      Number.parseInt(before, 10),
    );

    await user.click(screen.getByRole("button", { name: "缩小" }));
    const zoomedOut = screen.getByRole("button", { name: "缩放" }).textContent;
    expect(Number.parseInt(zoomedOut, 10)).toBeLessThan(
      Number.parseInt(zoomedIn, 10),
    );
  });
});
