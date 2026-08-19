import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import DiscoverPage from "./DiscoverPage.jsx";
import DiscoverStickyHeader, { DiscoverNavProvider } from "./DiscoverHeader.jsx";

function renderDiscover() {
  return render(
    <DiscoverNavProvider>
      <DiscoverStickyHeader pinned={false} scale={1} left={80} width={1360} />
      <DiscoverPage />
    </DiscoverNavProvider>,
  );
}

describe("DiscoverPage", () => {
  it("renders the discover search, categories and masonry", () => {
    renderDiscover();

    expect(
      screen.getByPlaceholderText("搜索你想要的创意模板、素材与作品"),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "模板推荐" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "图片模板" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: /渠道/ })).toBeInTheDocument();
    expect(screen.getAllByText("印刷物料").length).toBeGreaterThan(0);
  });

  it("switches category underline when a tab is clicked", async () => {
    const user = userEvent.setup();
    renderDiscover();

    await user.click(screen.getByRole("button", { name: "小红书" }));

    expect(screen.getByRole("button", { name: "小红书" })).toHaveClass("active");
    expect(screen.getByRole("button", { name: "模板推荐" })).not.toHaveClass("active");
  });

  it("keeps the type filter row out of the sticky header", () => {
    render(
      <DiscoverNavProvider>
        <DiscoverStickyHeader pinned scale={1} left={80} width={1360} />
      </DiscoverNavProvider>,
    );

    expect(screen.getByRole("button", { name: "模板推荐" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "图片模板" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /渠道/ })).not.toBeInTheDocument();
  });

  it("keeps the same header and only adds a white background when pinned", () => {
    const rest = render(
      <DiscoverNavProvider>
        <DiscoverStickyHeader pinned={false} scale={1} left={80} width={1360} />
      </DiscoverNavProvider>,
    );
    expect(rest.container.querySelector(".discover-sticky")).not.toHaveClass("pinned");
    expect(rest.getByPlaceholderText("搜索你想要的创意模板、素材与作品")).toBeInTheDocument();
    expect(rest.container.querySelector(".discover-sticky")).toHaveStyle({
      background: "rgba(0, 0, 0, 0)",
    });
    rest.unmount();

    const pinned = render(
      <DiscoverNavProvider>
        <DiscoverStickyHeader pinned scale={1} left={80} width={1360} />
      </DiscoverNavProvider>,
    );
    expect(pinned.container.querySelector(".discover-sticky")).toHaveClass("pinned");
    expect(pinned.getByPlaceholderText("搜索你想要的创意模板、素材与作品")).toBeInTheDocument();
    expect(pinned.container.querySelector(".discover-sticky")).toHaveStyle({
      background: "rgb(255, 255, 255)",
    });
  });
});
