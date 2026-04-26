/**
 * اختبارات ScriptUploadZone.tsx
 * تغطي: رفع الملفات، الاستخراج، رسائل الأخطاء، التدفق الكامل
 */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

import ScriptUploadZone from "../ScriptUploadZone";

// Mocks
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

vi.mock("@/hooks/useProject", () => ({
  useCreateProject: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useAnalyzeScript: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/app/(main)/directors-studio/lib/ProjectContext", () => ({
  useCurrentProject: () => ({
    setProject: vi.fn(),
  }),
}));

vi.mock("@/components/aceternity/card-spotlight", () => ({
  CardSpotlight: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="card-spotlight">{children}</div>
  ),
}));

// Mock fileExtractor
vi.mock("@/app/(main)/directors-studio/helpers/fileExtractor", () => ({
  extractTextFromFile: vi.fn(),
  getUserFriendlyErrorMessage: (err: Error) => err.message,
  FileExtractionError: class extends Error {
    constructor(
      public type: string,
      message: string
    ) {
      super(message);
    }
  },
  ExtractionErrorType: {
    UNSUPPORTED_TYPE: "UNSUPPORTED_TYPE",
    FILE_READ_ERROR: "FILE_READ_ERROR",
    PDF_PARSE_ERROR: "PDF_PARSE_ERROR",
    DOCX_PARSE_ERROR: "DOCX_PARSE_ERROR",
    EMPTY_CONTENT: "EMPTY_CONTENT",
    FILE_TOO_LARGE: "FILE_TOO_LARGE",
  },
  isSupportedFileType: (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    return ["txt", "pdf", "docx"].includes(ext ?? "");
  },
}));

describe("ScriptUploadZone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render upload zone with correct UI elements", () => {
    render(<ScriptUploadZone />);

    expect(
      screen.getByText("قم بتحميل السيناريو الخاص بك")
    ).toBeInTheDocument();
    expect(
      screen.getByText(/اسحب وأفلت ملف PDF أو Word هنا/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/الصيغ المدعومة: TXT, PDF, DOCX/)
    ).toBeInTheDocument();
    expect(screen.getByTestId("button-choose-file")).toBeInTheDocument();
  });

  it("should have hidden file input with correct accept attribute", () => {
    render(<ScriptUploadZone />);

    const fileInput = screen.getByTestId("file-input");
    expect(fileInput).toHaveAttribute("type", "file");
    expect(fileInput).toHaveAttribute("accept", ".txt,.pdf,.docx");
    expect(fileInput).toHaveClass("hidden");
  });

  it("should trigger file input click when button is clicked", async () => {
    const user = userEvent.setup();
    render(<ScriptUploadZone />);

    const button = screen.getByTestId("button-choose-file");
    const fileInput = screen.getByTestId("file-input");

    // Mock click on file input
    const clickSpy = vi.spyOn(fileInput, "click");

    await user.click(button);

    expect(clickSpy).toHaveBeenCalled();
  });

  it("should show loading state when uploading", () => {
    // Override the mock to show loading state
    vi.mocked(require("@/hooks/useProject").useCreateProject).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: true,
    });

    render(<ScriptUploadZone />);

    expect(screen.getByText("جاري تحميل السيناريو...")).toBeInTheDocument();
  });

  it("should handle drag over event", () => {
    render(<ScriptUploadZone />);

    const dropZone = screen.getByTestId("card-script-upload");

    fireEvent.dragOver(dropZone);

    // Drop zone should have different styling (checked via class)
    expect(dropZone).toHaveClass("border-[var(--page-accent)]");
  });

  it("should handle drag leave event", () => {
    render(<ScriptUploadZone />);

    const dropZone = screen.getByTestId("card-script-upload");

    fireEvent.dragOver(dropZone);
    fireEvent.dragLeave(dropZone);

    // Should return to normal styling
    expect(dropZone).not.toHaveClass("border-[var(--page-accent)]");
  });

  it("should handle file drop with TXT file", async () => {
    const { extractTextFromFile } =
      await import("@/app/(main)/directors-studio/helpers/fileExtractor");

    const mockText = "مشهد 1: داخلية - غرفة المعيشة - يوم";
    vi.mocked(extractTextFromFile).mockResolvedValue(mockText);

    const onContentLoaded = vi.fn();
    render(<ScriptUploadZone onContentLoaded={onContentLoaded} />);

    const file = new File([mockText], "script.txt", { type: "text/plain" });
    const dropZone = screen.getByTestId("card-script-upload");

    // Simulate file drop
    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(extractTextFromFile).toHaveBeenCalledWith(file);
    });
  });

  it("should display error for unsupported file types", async () => {
    const { extractTextFromFile } =
      await import("@/app/(main)/directors-studio/helpers/fileExtractor");

    vi.mocked(extractTextFromFile).mockRejectedValue(
      new Error("نوع الملف غير مدعوم")
    );

    render(<ScriptUploadZone />);

    const file = new File(["content"], "script.doc", {
      type: "application/msword",
    });
    const dropZone = screen.getByTestId("card-script-upload");

    fireEvent.drop(dropZone, {
      dataTransfer: {
        files: [file],
      },
    });

    await waitFor(() => {
      expect(screen.getByText(/نوع الملف غير مدعوم/)).toBeInTheDocument();
    });
  });

  it("should reset file input after selection", async () => {
    render(<ScriptUploadZone />);

    const fileInput = screen.getByTestId("file-input");
    const file = new File(["content"], "script.txt", { type: "text/plain" });

    // Simulate file selection
    fireEvent.change(fileInput, { target: { files: [file] } });

    // Input value should be reset to allow re-selecting same file
    await waitFor(() => {
      expect(fileInput.value).toBe("");
    });
  });
});
