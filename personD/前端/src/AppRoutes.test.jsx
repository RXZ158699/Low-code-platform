import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import AppRoutes from "./AppRoutes.jsx";

vi.mock("./App.jsx", () => ({
  default: () => <div>home-page</div>,
}));

vi.mock("./pages/LoginPage.jsx", () => ({
  default: () => <div>login-page</div>,
}));

vi.mock("./pages/WorkEditorPage.jsx", () => ({
  default: () => <div>editor-page</div>,
}));

vi.mock("./pages/ShareViewPage.jsx", () => ({
  default: () => <div>share-page</div>,
}));

function renderAt(path) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppRoutes />
    </MemoryRouter>,
  );
}

describe("AppRoutes", () => {
  it("lazy-loads the home page", async () => {
    renderAt("/");
    expect(await screen.findByText("home-page")).toBeInTheDocument();
  });

  it("lazy-loads the login page", async () => {
    renderAt("/login");
    expect(await screen.findByText("login-page")).toBeInTheDocument();
  });

  it("lazy-loads the work editor", async () => {
    renderAt("/works/9");
    expect(await screen.findByText("editor-page")).toBeInTheDocument();
  });

  it("lazy-loads the share view", async () => {
    renderAt("/share/abc");
    expect(await screen.findByText("share-page")).toBeInTheDocument();
  });
});
