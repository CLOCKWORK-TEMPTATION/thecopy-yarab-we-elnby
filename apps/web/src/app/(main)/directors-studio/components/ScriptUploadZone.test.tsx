import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ScriptUploadZone from "./ScriptUploadZone";

// Mock next/navigation
const mockPush = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

const queryClient = new QueryClient();

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
  );
};

describe("ScriptUploadZone - Deactivation Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders deactivation message in Arabic", () => {
    renderWithClient(<ScriptUploadZone />);

    expect(screen.getByText("الاستيراد معطّل")).toBeInTheDocument();
    expect(
      screen.getByText("تم إلغاء الاستيراد من هذه الصفحة")
    ).toBeInTheDocument();
    expect(
      screen.getByText("المالك الوحيد للاستيراد هو المحرر /editor")
    ).toBeInTheDocument();
  });

  it("renders redirect button with correct text", () => {
    renderWithClient(<ScriptUploadZone />);

    const button = screen.getByRole("button", { name: "انتقل إلى المحرر" });
    expect(button).toBeInTheDocument();
  });

  it("has no file input element", () => {
    renderWithClient(<ScriptUploadZone />);

    const fileInputs = screen.queryAllByRole("textbox");
    const hasFileInput = fileInputs.some(
      (input) => (input as HTMLInputElement).type === "file"
    );

    expect(hasFileInput).toBe(false);
  });

  it("redirects to /editor when button is clicked", () => {
    renderWithClient(<ScriptUploadZone />);

    const button = screen.getByRole("button", { name: "انتقل إلى المحرر" });
    fireEvent.click(button);

    expect(mockPush).toHaveBeenCalledWith("/editor");
  });

  it("does not accept drag and drop", () => {
    renderWithClient(<ScriptUploadZone />);

    // Verify there's no drop zone by checking for drag-related attributes
    const container = screen.getByText("الاستيراد معطّل").closest("div");
    expect(container).not.toHaveAttribute("ondrop");
    expect(container).not.toHaveAttribute("ondragover");
  });

  it("displays warning icon", () => {
    renderWithClient(<ScriptUploadZone />);

    // AlertCircle icon is rendered as an SVG
    const icons = screen.getByText("الاستيراد معطّل").closest("div");
    expect(icons?.querySelector("svg")).toBeInTheDocument();
  });

  it("has correct styling with amber color scheme", () => {
    const { container } = renderWithClient(<ScriptUploadZone />);

    const card = container.querySelector('[class*="bg-amber"]');
    expect(card).toBeInTheDocument();
  });

  it("does not have any file extraction functionality", () => {
    renderWithClient(<ScriptUploadZone />);

    // Verify no mentions of file types or formats
    expect(
      screen.queryByText(/PDF|DOCX|TXT|الصيغ المدعومة/i)
    ).not.toBeInTheDocument();
  });

  it("renders only one button", () => {
    renderWithClient(<ScriptUploadZone />);

    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
  });

  it("button has correct styling", () => {
    renderWithClient(<ScriptUploadZone />);

    const button = screen.getByRole("button", { name: "انتقل إلى المحرر" });
    expect(button).toHaveClass("w-full");
    expect(button).toHaveClass("bg-amber-600");
  });
});
