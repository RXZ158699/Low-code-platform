import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { App as AntdApp } from "antd";
import App from "./App.jsx";
import { AuthProvider } from "./auth/AuthContext.jsx";

vi.mock("./components/Sidebar.jsx", () => ({
  default: ({ onNavigate }) => (
    <div>
      <button type="button" onClick={() => onNavigate("discover")}>go-discover</button>
      <button type="button" onClick={() => onNavigate("mine")}>go-mine</button>
    </div>
  ),
}));
vi.mock("./components/DesignHomepage.jsx", () => ({ default: () => <div>home</div> }));
vi.mock("./components/DiscoverPage.jsx", () => ({ default: () => <div>discover-page</div> }));
vi.mock("./components/MinePage.jsx", () => ({ default: () => <div>mine-page</div> }));
vi.mock("./components/DiscoverHeader.jsx", () => ({
  default: () => null,
  DiscoverNavProvider: ({ children }) => children,
}));
vi.mock("./components/StickySearchBar.jsx", () => ({ default: () => null }));
vi.mock("./components/CreatePopover.jsx", () => ({ CreatePopoverProvider: ({ children }) => children }));
vi.mock("./AppPageContext.jsx", () => ({ AppPageProvider: ({ children }) => children }));
vi.mock("./api/auth.js", () => ({
  login: vi.fn(),
  logout: vi.fn(),
  fetchMe: vi.fn(() => Promise.resolve(null)),
}));

// jsdom 未实现 ResizeObserver / scrollTo，App 的 effects 依赖它们
beforeAll(() => {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  Element.prototype.scrollTo = Element.prototype.scrollTo || function () {};
});

function seedUser(user) {
  if (user) {
    localStorage.setItem("dp.token", "token");
    localStorage.setItem("dp.user", JSON.stringify(user));
  } else {
    localStorage.clear();
  }
}

function renderApp(user) {
  seedUser(user);
  return render(
    <MemoryRouter>
      <AntdApp>
        <AuthProvider>
          <App />
        </AuthProvider>
      </AntdApp>
    </MemoryRouter>,
  );
}

describe("App 翻页守卫", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("默认展示首页", async () => {
    renderApp();
    expect(await screen.findByText("home")).toBeInTheDocument();
  });

  it("普通用户无法切到发现页", async () => {
    const user = userEvent.setup();
    renderApp({ id: 2, role: 2 });
    await screen.findByText("home");

    await user.click(screen.getByRole("button", { name: "go-discover" }));

    expect(screen.queryByText("discover-page")).not.toBeInTheDocument();
    expect(screen.getByText("home")).toBeInTheDocument();
  });

  it("管理员可切到发现页", async () => {
    const user = userEvent.setup();
    renderApp({ id: 1, role: 1 });
    await screen.findByText("home");

    await user.click(screen.getByRole("button", { name: "go-discover" }));

    expect(await screen.findByText("discover-page")).toBeInTheDocument();
  });

  it("普通用户可切到我的页", async () => {
    const user = userEvent.setup();
    renderApp({ id: 2, role: 2 });
    await screen.findByText("home");

    await user.click(screen.getByRole("button", { name: "go-mine" }));

    expect(await screen.findByText("mine-page")).toBeInTheDocument();
  });
});
