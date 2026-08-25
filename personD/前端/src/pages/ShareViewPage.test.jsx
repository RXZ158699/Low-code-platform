import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ShareViewPage from "./ShareViewPage.jsx";
import { getShare, probeShareEdit, updateShare } from "../api/shares.js";

vi.mock("../api/shares.js", () => ({
  getShare: vi.fn(),
  probeShareEdit: vi.fn(),
  updateShare: vi.fn(),
}));

vi.mock("../canvasPreview.js", () => ({
  canvasPreviewBlob: vi.fn(),
}));

function renderShare(token = "abc") {
  return render(
    <MemoryRouter initialEntries={[`/share/${token}`]}>
      <AntdApp>
        <Routes>
          <Route path="/share/:token" element={<ShareViewPage />} />
        </Routes>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("ShareViewPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getShare.mockResolvedValue({
      id: 9,
      title: "海报",
      canvasJson: '{"width":800,"height":600,"elements":[]}',
    });
    updateShare.mockResolvedValue({ id: 9, title: "海报" });
  });

  it("renders a read-only canvas for view-only links", async () => {
    probeShareEdit.mockResolvedValue(false);
    renderShare();

    expect(await screen.findByText("海报")).toBeInTheDocument();
    expect(document.querySelector(".editor-artboard.is-readonly")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /发\s*布/ })).not.toBeInTheDocument();
    expect(updateShare).not.toHaveBeenCalled();
  });

  it("opens the editor and saves through the share token when the link is editable", async () => {
    probeShareEdit.mockResolvedValue(true);
    const user = userEvent.setup();
    renderShare();

    const title = await screen.findByDisplayValue("海报", {}, { timeout: 5000 });
    expect(screen.queryByRole("button", { name: /发\s*布/ })).not.toBeInTheDocument();
    expect(document.querySelector(".editor-artboard.is-readonly")).toBeFalsy();

    await user.clear(title);
    await user.type(title, "新标题");

    await waitFor(
      () => {
        expect(updateShare).toHaveBeenCalledWith(
          "abc",
          expect.objectContaining({ title: "新标题" }),
          "",
        );
      },
      { timeout: 3000 },
    );
    expect(updateShare.mock.calls[0][1].canvasJson).toBeTruthy();
  });

  it("asks for a share access code before opening the editor", async () => {
    getShare.mockRejectedValue(new Error("提取码错误"));
    probeShareEdit.mockResolvedValue(false);
    const user = userEvent.setup();
    renderShare();

    const input = await screen.findByLabelText("请输入提取码");
    await user.type(input, "abcd");

    getShare.mockResolvedValue({
      id: 9,
      title: "海报",
      canvasJson: '{"width":800,"height":600,"elements":[]}',
    });
    probeShareEdit.mockResolvedValue(true);
    await user.click(screen.getByRole("button", { name: /打\s*开/ }));

    const title = await screen.findByDisplayValue("海报", {}, { timeout: 5000 });
    expect(getShare).toHaveBeenCalledWith("abc", "abcd");

    await user.clear(title);
    await user.type(title, "新标题");

    await waitFor(
      () => {
        expect(updateShare).toHaveBeenCalledWith(
          "abc",
          expect.objectContaining({ title: "新标题" }),
          "abcd",
        );
      },
      { timeout: 3000 },
    );
  });
});
