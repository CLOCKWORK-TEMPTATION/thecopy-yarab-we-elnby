import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";

import "@testing-library/jest-dom/vitest";
import NewPage from "./page";

// Mock dynamic imports to return a simple component
vi.mock("next/dynamic", () => ({
  default: (_fn: any, _options: any) => {
    const Component = () => (
      <div data-testid="new-feature">New Feature Component</div>
    );
    Component.displayName = "NewFeature";
    return Component;
  },
}));

describe("New Page", () => {
  it("renders without crashing", () => {
    const { container } = render(<NewPage />);
    expect(container).toBeDefined();
  });

  it("renders the new feature component", () => {
    render(<NewPage />);
    const component = screen.getByTestId("new-feature");
    expect(component).toBeInTheDocument();
  });

  it("displays the correct component text", () => {
    render(<NewPage />);
    expect(screen.getByText("New Feature Component")).toBeInTheDocument();
  });
});
