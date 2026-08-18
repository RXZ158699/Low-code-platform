import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { CreatePopoverProvider } from "./CreatePopover.jsx";
import FeaturesRow from "./FeaturesRow.jsx";

function renderWithProvider(ui) {
  return render(<CreatePopoverProvider>{ui}</CreatePopoverProvider>);
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
});
