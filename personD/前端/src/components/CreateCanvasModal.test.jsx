import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateCanvasModal from "./CreateCanvasModal.jsx";
import { createWork } from "../api/works.js";
import { uploadAsset } from "../api/assets.js";

vi.mock("../api/works.js", () => ({
  createWork: vi.fn(),
}));

vi.mock("../api/assets.js", () => ({
  uploadAsset: vi.fn(),
}));

vi.mock("../mediaFile.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    readMediaSize: vi.fn(() => Promise.resolve({ width: 800, height: 600 })),
  };
});

function renderModal(props = {}) {
  return render(
    <MemoryRouter>
      <AntdApp>
        <CreateCanvasModal open onClose={vi.fn()} {...props} />
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("CreateCanvasModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createWork.mockResolvedValue({ id: 11, title: "手机海报" });
    uploadAsset.mockResolvedValue({
      id: 8,
      fileName: "a.png",
      url: "http://cdn/a.png",
      fileType: "image",
    });
  });

  it("renders the size picker layout from the design", () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "创建设计" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "新建画布" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByPlaceholderText("搜索全部尺寸")).toBeInTheDocument();
    expect(screen.getByText("自定义尺寸")).toBeInTheDocument();
    expect(screen.getByLabelText("宽")).toBeInTheDocument();
    expect(screen.getByLabelText("高")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "创建" })).toBeInTheDocument();
    expect(screen.getByText("我的")).toBeInTheDocument();
    expect(screen.getByText("暂无内容")).toBeInTheDocument();
    expect(screen.getByText("推荐")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /手机海报/ })).toHaveTextContent("1242 × 2208");
    expect(screen.getByRole("button", { name: /横版海报/ })).toHaveTextContent("1800 × 1000");
    expect(screen.getByRole("button", { name: /小红书配图/ })).toHaveTextContent("1242 × 1656");
  });

  it("filters recommended presets by search keyword", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByPlaceholderText("搜索全部尺寸"), "公众号");

    expect(screen.getByRole("button", { name: /公众号首图/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /公众号次图/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /手机海报/ })).not.toBeInTheDocument();
  });

  it("creates a work with the selected preset size", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    renderModal({ onClose });

    await user.click(screen.getByRole("button", { name: /手机海报/ }));

    await waitFor(() =>
      expect(createWork).toHaveBeenCalledWith({
        title: "手机海报",
        canvasJson: '{"width":1242,"height":2208,"background":"#ffffff","backgroundOpacity":100,"elements":[]}',
      }),
    );
  });

  it("creates a work with custom width and height", async () => {
    const user = userEvent.setup();
    createWork.mockResolvedValue({ id: 12, title: "未命名作品" });
    renderModal();

    await user.type(screen.getByLabelText("宽"), "800");
    await user.type(screen.getByLabelText("高"), "600");
    await user.click(screen.getByRole("button", { name: "创建" }));

    await waitFor(() =>
      expect(createWork).toHaveBeenCalledWith({
        title: "未命名作品",
        canvasJson: '{"width":800,"height":600,"background":"#ffffff","backgroundOpacity":100,"elements":[]}',
      }),
    );
  });

  it("opens the import tab from initialTab and creates a work from an image", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    createWork.mockResolvedValue({ id: 13, title: "a.png" });
    renderModal({ onClose, initialTab: "import" });

    expect(screen.getByRole("button", { name: "导入图片" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByText("点击或拖拽图片到这里")).toBeInTheDocument();

    const file = new File(["png"], "a.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("选择要导入的图片"), file);

    await waitFor(() => {
      expect(uploadAsset).toHaveBeenCalledWith(file, { fileType: "image" });
    });
    await waitFor(() => expect(createWork).toHaveBeenCalled());
    const payload = createWork.mock.calls[0][0];
    expect(payload.title).toBe("a.png");
    const canvas = JSON.parse(payload.canvasJson);
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(600);
    expect(canvas.elements[0]).toMatchObject({
      type: "image",
      src: "http://cdn/a.png",
      name: "a.png",
    });
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the local tab and accepts video files", async () => {
    const user = userEvent.setup();
    uploadAsset.mockResolvedValue({
      id: 9,
      fileName: "clip.mp4",
      url: "http://cdn/clip.mp4",
      fileType: "video",
    });
    createWork.mockResolvedValue({ id: 14, title: "clip.mp4" });
    renderModal({ initialTab: "local" });

    expect(screen.getByRole("button", { name: /打开本地/ })).toHaveAttribute("aria-current", "page");
    const input = screen.getByLabelText("选择本地图片或视频");
    expect(input.getAttribute("accept")).toContain("video/mp4");

    const file = new File(["mp4"], "clip.mp4", { type: "video/mp4" });
    await user.upload(input, file);

    await waitFor(() => {
      expect(uploadAsset).toHaveBeenCalledWith(file, { fileType: "video" });
    });
    await waitFor(() => expect(createWork).toHaveBeenCalled());
    const canvas = JSON.parse(createWork.mock.calls[0][0].canvasJson);
    expect(canvas.elements[0]).toMatchObject({
      type: "video",
      src: "http://cdn/clip.mp4",
      name: "clip.mp4",
    });
  });
});
