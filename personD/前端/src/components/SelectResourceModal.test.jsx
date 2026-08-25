import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SelectResourceModal from "./SelectResourceModal.jsx";
import { listAssets, uploadAsset } from "../api/assets.js";

vi.mock("../api/assets.js", () => ({
  listAssets: vi.fn(),
  uploadAsset: vi.fn(),
}));

function renderModal(props = {}) {
  const onClose = props.onClose || vi.fn();
  const onSelectImage = props.onSelectImage || vi.fn();
  return {
    onClose,
    onSelectImage,
    ...render(
      <AntdApp>
        <SelectResourceModal
          open
          onClose={onClose}
          onSelectImage={onSelectImage}
          {...props}
        />
      </AntdApp>,
    ),
  };
}

describe("SelectResourceModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listAssets.mockResolvedValue({ records: [] });
    uploadAsset.mockResolvedValue({
      id: 8,
      fileName: "海报.png",
      url: "http://cdn/poster.png",
      fileType: "image",
    });
  });

  it("renders the picker layout from the design", async () => {
    renderModal();

    expect(screen.getByRole("dialog", { name: "选择资源" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "我的空间" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "照片" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "我的空间" })).toBeInTheDocument();
    expect(screen.getByRole("switch", { name: "显示子文件内容" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("在「我的空间」内搜索")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "上传资源" })).toBeInTheDocument();
    expect(screen.getByText("没有找到相关结果")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "关闭" })).toBeInTheDocument();
    await waitFor(() => {
      expect(listAssets).toHaveBeenCalledWith({
        scope: "mine",
        fileType: "image",
        page: 1,
        size: 48,
      });
    });
  });

  it("uploads an image into 照片 and reports it to the canvas cell", async () => {
    const user = userEvent.setup();
    const { onSelectImage } = renderModal();

    const file = new File(["png"], "海报.png", { type: "image/png" });
    await user.upload(screen.getByLabelText("选择要上传的图片"), file);

    await waitFor(() => {
      expect(uploadAsset).toHaveBeenCalledWith(file, { fileType: "image" });
    });
    expect(onSelectImage).toHaveBeenCalledWith("http://cdn/poster.png");
    expect(screen.getByRole("button", { name: "照片" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByRole("button", { name: "选择「海报.png」" })).toBeInTheDocument();
  });

  it("still uploads a png after the file input resets its live FileList", async () => {
    const { onSelectImage } = renderModal();
    const input = screen.getByLabelText("选择要上传的图片");
    const file = new File(["png"], "海报.png", { type: "image/png" });
    const liveFiles = {
      0: file,
      length: 1,
      item(index) {
        return index < this.length ? file : null;
      },
      *[Symbol.iterator]() {
        for (let i = 0; i < this.length; i += 1) yield this[i];
      },
    };
    Object.defineProperty(input, "files", {
      configurable: true,
      get: () => liveFiles,
    });
    Object.defineProperty(input, "value", {
      configurable: true,
      get: () => "",
      set: (next) => {
        if (next === "") liveFiles.length = 0;
      },
    });

    fireEvent.change(input);

    await waitFor(() => {
      expect(uploadAsset).toHaveBeenCalledWith(file, { fileType: "image" });
    });
    expect(onSelectImage).toHaveBeenCalledWith("http://cdn/poster.png");
    expect(
      screen.queryByText("请选择 jpg / png / webp / gif 图片"),
    ).not.toBeInTheDocument();
  });

  it("applies a photo from 照片 to the collage cell and closes", async () => {
    listAssets.mockResolvedValue({
      records: [
        {
          id: 3,
          fileName: "已有.png",
          url: "http://cdn/old.png",
          fileType: "image",
        },
      ],
    });
    const user = userEvent.setup();
    const { onSelectImage, onClose } = renderModal();

    await user.click(screen.getByRole("button", { name: "照片" }));
    await user.click(
      await screen.findByRole("button", { name: "选择「已有.png」" }),
    );

    expect(onSelectImage).toHaveBeenCalledWith("http://cdn/old.png");
    expect(onClose).toHaveBeenCalled();
  });

  it("opens the local file picker from 上传资源", async () => {
    const user = userEvent.setup();
    renderModal();
    const input = screen.getByLabelText("选择要上传的图片");
    const clickSpy = vi.spyOn(input, "click");
    await user.click(screen.getByRole("button", { name: "上传资源" }));
    expect(clickSpy).toHaveBeenCalled();
  });
});
