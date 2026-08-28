import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { vi } from "vitest";
import EditorAddPanel from "./EditorAddPanel.jsx";

function renderPanel() {
  return render(<EditorAddPanel open onClose={() => {}} onSelect={() => {}} />);
}

describe("EditorAddPanel collage view", () => {
  it("emits the magnifier component action", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EditorAddPanel open onClose={() => {}} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "放大镜" }));

    expect(onSelect).toHaveBeenCalledWith("magnifier");
  });

  it("opens the table picker and emits the selected table layout", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EditorAddPanel open onClose={() => {}} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "表格" }));

    expect(screen.getByRole("heading", { name: "表格" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "两行两列" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "两行两列" }));

    expect(onSelect).toHaveBeenCalledWith("table:table-2x2");
  });

  it("replaces the add catalog with a scrollable collage layout picker", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "拼图" }));

    expect(screen.getByRole("heading", { name: "拼图" })).toBeInTheDocument();
    expect(screen.getByText("1-图")).toBeInTheDocument();
    expect(screen.getByText("3-图")).toBeInTheDocument();
    expect(screen.getByText("16-图")).toBeInTheDocument();
    expect(screen.queryByText("图片/视频")).not.toBeInTheDocument();
    expect(screen.queryByText("辅助线设置")).not.toBeInTheDocument();

    const body = document.querySelector(".editor-add-panel-body");
    expect(body).not.toBeNull();
    expect(body.classList.contains("editor-add-panel-body")).toBe(true);
    expect(
      document.querySelectorAll(".editor-collage-grid").length,
    ).toBeGreaterThan(0);
  });

  it("returns to the add catalog from the collage header", async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(screen.getByRole("button", { name: "拼图" }));
    await user.click(screen.getByRole("button", { name: "返回" }));

    expect(screen.getByText("图片/视频")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "拼图" })).toBeInTheDocument();
  });

  it("emits the collage layout when a thumbnail is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<EditorAddPanel open onClose={() => {}} onSelect={onSelect} />);

    await user.click(screen.getByRole("button", { name: "拼图" }));
    await user.click(screen.getByRole("button", { name: "2-图布局1" }));

    expect(onSelect).toHaveBeenCalledWith("collage:2-v");
  });
});
