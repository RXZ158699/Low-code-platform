import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App as AntdApp } from "antd";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EditorLibraryPanel from "./EditorLibraryPanel.jsx";
import { listTemplates } from "../api/templates.js";
import { listAssets } from "../api/assets.js";
import { listTeamAssets, listTeams } from "../api/teams.js";

vi.mock("../api/templates.js", () => ({
  listTemplates: vi.fn(),
}));

vi.mock("../api/assets.js", () => ({
  listAssets: vi.fn(),
}));

vi.mock("../api/teams.js", () => ({
  listTeams: vi.fn(),
  listTeamAssets: vi.fn(),
}));

function renderPanel(props) {
  return render(
    <AntdApp>
      <EditorLibraryPanel open onClose={() => {}} onPick={() => {}} {...props} />
    </AntdApp>,
  );
}

describe("EditorLibraryPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listTemplates.mockResolvedValue({ records: [] });
    listAssets.mockResolvedValue({ records: [] });
    listTeams.mockResolvedValue([]);
    listTeamAssets.mockResolvedValue({ records: [] });
  });

  it("lists templates and emits a pick when a card is clicked", async () => {
    const onPick = vi.fn();
    listTemplates.mockResolvedValue({
      records: [
        {
          id: 2,
          title: "夏日海报",
          coverImageUrl: "http://cdn/t.png",
          jsonData: '{"width":800,"height":600,"elements":[]}',
        },
      ],
    });
    const user = userEvent.setup();
    renderPanel({ kind: "template", onPick });

    await user.click(await screen.findByRole("button", { name: /夏日海报/ }));

    expect(onPick).toHaveBeenCalledWith({
      kind: "template",
      item: expect.objectContaining({ id: 2, title: "夏日海报" }),
    });
  });

  it("lists mine assets in the 我的 panel", async () => {
    listAssets.mockResolvedValue({
      records: [{ id: 8, fileName: "素材.png", url: "http://cdn/a.png", fileType: "image" }],
    });
    renderPanel({ kind: "mine" });

    expect(await screen.findByRole("button", { name: "素材.png" })).toBeInTheDocument();
    await waitFor(() =>
      expect(listAssets).toHaveBeenCalledWith({
        scope: "mine",
        page: 1,
        size: 24,
      }),
    );
  });

  it("loads the first team assets in the 团队 panel", async () => {
    listTeams.mockResolvedValue([{ id: 3, name: "设计组" }]);
    listTeamAssets.mockResolvedValue({
      records: [{ id: 9, fileName: "团队.png", url: "http://cdn/b.png", fileType: "image" }],
    });
    renderPanel({ kind: "team" });

    expect(await screen.findByRole("button", { name: "团队.png" })).toBeInTheDocument();
    await waitFor(() => expect(listTeamAssets).toHaveBeenCalledWith(3, { page: 1, size: 24 }));
  });
});
