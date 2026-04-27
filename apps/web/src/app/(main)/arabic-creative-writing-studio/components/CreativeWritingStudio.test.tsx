import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";

import { CreativeWritingStudio } from "@/app/(main)/arabic-creative-writing-studio/components/CreativeWritingStudio";

import type { PromptLibraryProps } from "@/app/(main)/arabic-creative-writing-studio/components/PromptLibrary";
import type { SettingsPanelProps } from "@/app/(main)/arabic-creative-writing-studio/components/SettingsPanel";
import type { WritingEditorProps } from "@/app/(main)/arabic-creative-writing-studio/components/WritingEditor";
import type {
  CreativePrompt,
  CreativeProject,
  AppSettings,
} from "@/app/(main)/arabic-creative-writing-studio/types";

// Mock the child components
vi.mock("./PromptLibrary", () => ({
  PromptLibrary: ({
    onPromptSelect,
    onEnhancePrompt,
    loading,
  }: PromptLibraryProps) => (
    <div data-testid="prompt-library">
      <button
        onClick={() =>
          onPromptSelect({
            id: "test",
            title: "Test Prompt",
          } as unknown as CreativePrompt)
        }
      >
        Select Prompt
      </button>
      <button
        onClick={() =>
          onEnhancePrompt("test prompt", "fantasy", "character_driven")
        }
      >
        Enhance Prompt
      </button>
      {loading && <div>Loading...</div>}
    </div>
  ),
}));

vi.mock("./WritingEditor", () => ({
  WritingEditor: ({ onSave }: WritingEditorProps) => (
    <div data-testid="writing-editor">
      <button
        onClick={() =>
          onSave({
            id: "test",
            title: "Test Project",
          } as unknown as CreativeProject)
        }
      >
        Save Project
      </button>
    </div>
  ),
}));

vi.mock("./SettingsPanel", () => ({
  SettingsPanel: ({ onSettingsUpdate }: SettingsPanelProps) => (
    <div data-testid="settings-panel">
      <button
        onClick={() =>
          onSettingsUpdate({ language: "ar" } satisfies Partial<AppSettings>)
        }
      >
        Update Settings
      </button>
    </div>
  ),
}));

// Mock GeminiService
vi.mock("../lib/gemini-service", () => ({
  GeminiService: class {
    analyzeText = vi
      .fn()
      .mockResolvedValue({ success: true, data: { qualityMetrics: {} } });
    testConnection = vi.fn().mockResolvedValue({ success: true });
  },
}));

describe("CreativeWritingStudio", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.todo(
    "validate-pipeline: renders the main interface with navigation",
    () => {
      render(<CreativeWritingStudio />);

      expect(
        screen.getByText("🎨 استوديو الكتابة الإبداعية")
      ).toBeInTheDocument();
      expect(screen.getByText("🏠 الرئيسية")).toBeInTheDocument();
      expect(screen.getByText("📚 مكتبة المحفزات")).toBeInTheDocument();
      expect(screen.getByText("✍️ المحرر")).toBeInTheDocument();
      expect(screen.getByText("⚙️ الإعدادات")).toBeInTheDocument();
    }
  );

  it.todo("validate-pipeline: displays home view by default", () => {
    render(<CreativeWritingStudio />);

    expect(
      screen.getByText("مرحباً بك في عالم الإبداع! 🌟")
    ).toBeInTheDocument();
    expect(screen.getByText("مكتبة المحفزات")).toBeInTheDocument();
    expect(screen.getByText("ابدأ الكتابة")).toBeInTheDocument();
  });

  it.todo("validate-pipeline: navigates to library view", () => {
    render(<CreativeWritingStudio />);

    fireEvent.click(screen.getByText("📚 مكتبة المحفزات"));
    expect(screen.getByTestId("prompt-library")).toBeInTheDocument();
  });

  it.todo("validate-pipeline: navigates to settings view", () => {
    render(<CreativeWritingStudio />);

    fireEvent.click(screen.getByText("⚙️ الإعدادات"));
    expect(screen.getByTestId("settings-panel")).toBeInTheDocument();
  });

  it.todo("validate-pipeline: creates new project from home", () => {
    render(<CreativeWritingStudio />);

    fireEvent.click(screen.getByText("ابدأ الكتابة"));
    expect(screen.getByTestId("writing-editor")).toBeInTheDocument();
  });

  it.todo(
    "validate-pipeline: shows notification when project is saved",
    async () => {
      render(<CreativeWritingStudio />);

      // Navigate to editor
      fireEvent.click(screen.getByText("ابدأ الكتابة"));

      // Click save
      fireEvent.click(screen.getByText("Save Project"));

      await waitFor(() => {
        expect(screen.getByText("تم حفظ المشروع بنجاح 🎉")).toBeInTheDocument();
      });
    }
  );

  it.todo("validate-pipeline: handles prompt selection from library", () => {
    render(<CreativeWritingStudio />);

    // Navigate to library
    fireEvent.click(screen.getByText("📚 مكتبة المحفزات"));

    // Select prompt
    fireEvent.click(screen.getByText("Select Prompt"));

    // Should navigate to editor
    expect(screen.getByTestId("writing-editor")).toBeInTheDocument();
  });

  it.todo("validate-pipeline: updates settings", () => {
    render(<CreativeWritingStudio />);

    // Navigate to settings
    fireEvent.click(screen.getByText("⚙️ الإعدادات"));

    // Update settings
    fireEvent.click(screen.getByText("Update Settings"));

    // Should show notification
    expect(screen.getByText("تم حفظ الإعدادات ⚙️")).toBeInTheDocument();
  });
});
