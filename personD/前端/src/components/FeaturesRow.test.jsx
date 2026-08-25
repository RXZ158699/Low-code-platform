import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import { describe, expect, it } from "vitest";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import FeaturesRow from "./FeaturesRow.jsx";

function renderWithProvider(ui) {
  return render(
    <MemoryRouter>
      <AntdApp>
        <CreatePopoverProvider>{ui}</CreatePopoverProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("FeaturesRow", () => {
  it("renders all feature entries", () => {
    renderWithProvider(<FeaturesRow />);

    expect(screen.getByText("AI 画布")).toBeInTheDocument();
    expect(screen.getByText("AI 电商")).toBeInTheDocument();
    expect(screen.getByText("视频创作")).toBeInTheDocument();
    expect(screen.getByText("图片创作")).toBeInTheDocument();
    expect(screen.getByText("SKILL HUB")).toBeInTheDocument();
    expect(screen.getByText("更多")).toBeInTheDocument();
  });

  it("toggles the shared create popover when clicking 更多", async () => {
    const user = userEvent.setup();
    renderWithProvider(<FeaturesRow />);

    const moreButton = screen.getByRole("button", { name: /更多/ });
    expect(moreButton).toHaveAttribute("aria-expanded", "false");

    await user.click(moreButton);
    expect(moreButton).toHaveAttribute("aria-expanded", "true");

    await user.click(moreButton);
    expect(moreButton).toHaveAttribute("aria-expanded", "false");
  });

  it("opens the create canvas modal from 图片创作", async () => {
    const user = userEvent.setup();
    renderWithProvider(<FeaturesRow />);

    await user.click(screen.getByRole("button", { name: "图片创作" }));

    expect(screen.getByRole("dialog", { name: "创建设计" })).toBeInTheDocument();
  });
});
