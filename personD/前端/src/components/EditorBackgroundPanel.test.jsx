import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listBackgroundCategories } from "../api/backgrounds.js";
import EditorBackgroundPanel from "./EditorBackgroundPanel.jsx";

vi.mock("../api/backgrounds.js", () => ({
  listBackgroundCategories: vi.fn(),
}));

function renderPanel(initial = {}) {
  const onChange = vi.fn();
  const onClose = vi.fn();
  render(
    <AntdApp>
      <EditorBackgroundPanel
        open
        canvas={{ background: "#ffffff", backgroundOpacity: 100, ...initial }}
        onChange={onChange}
        onClose={onClose}
      />
    </AntdApp>,
  );
  return { onChange, onClose };
}

describe("EditorBackgroundPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listBackgroundCategories.mockResolvedValue([]);
  });

  it("shows static categories and applies a selected background image", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel();

    expect(await screen.findByRole("tab", { name: "纯色" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "背景图 纯白" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundImage: expect.stringContaining("data:image/svg"),
        backgroundImageFit: "cover",
      }),
    );
  });

  it("uses categories returned from the background API", async () => {
    const user = userEvent.setup();
    listBackgroundCategories.mockResolvedValue([
      {
        id: "db",
        title: "数据库分类",
        items: [{ id: "db-1", name: "云端背景", src: "https://cdn/1.png" }],
      },
    ]);
    const { onChange } = renderPanel();

    expect(
      await screen.findByRole("tab", { name: "数据库分类" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "背景图 云端背景" }));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        backgroundImage: "https://cdn/1.png",
        backgroundImageFit: "cover",
      }),
    );
  });

  it("clears the applied background image", async () => {
    const user = userEvent.setup();
    const { onChange } = renderPanel({
      backgroundImage: "data:image/svg+xml,x",
    });

    await user.click(screen.getByRole("button", { name: "清除背景图" }));

    expect(onChange).toHaveBeenCalledWith({
      backgroundImage: "",
      backgroundImageFit: "cover",
    });
  });
});
