import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CreateCanvasModal from "./CreateCanvasModal.jsx";
import { createWork } from "../api/works.js";

vi.mock("../api/works.js", () => ({
  createWork: vi.fn(),
}));

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
});
