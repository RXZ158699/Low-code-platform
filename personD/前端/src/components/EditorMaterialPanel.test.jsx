import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import EditorMaterialPanel from "./EditorMaterialPanel.jsx";
import { MATERIAL_CATEGORIES } from "../data/materialCatalog.js";

describe("EditorMaterialPanel", () => {
  it("shows every category with at least 10 pattern cards", () => {
    render(<EditorMaterialPanel open onClose={() => {}} onPick={() => {}} />);

    for (const category of MATERIAL_CATEGORIES) {
      expect(screen.getByText(category.title)).toBeInTheDocument();
      expect(category.items.length).toBeGreaterThanOrEqual(10);
    }
  });

  it("emits the picked pattern when a card is clicked", async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<EditorMaterialPanel open onClose={() => {}} onPick={onPick} />);

    const target = MATERIAL_CATEGORIES[0].items[0];
    await user.click(screen.getByRole("button", { name: target.name }));

    expect(onPick).toHaveBeenCalledWith({ item: target });
  });
});
