import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WritingEditor } from "@/app/(main)/arabic-creative-writing-studio/components/WritingEditor";
import type { TextAnalysis } from "@/app/(main)/arabic-creative-writing-studio/types";

vi.mock("@/components/aceternity/card-spotlight", () => ({
  CardSpotlight: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

vi.mock("@/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div>{children}</div>,
  DropdownMenuItem: ({ children, onSelect }: any) => (
    <button type="button" onClick={onSelect}>
      {children}
    </button>
  ),
}));

const baseProject = {
  id: "project-1",
  title: "مشروع تجريبي",
  content: "هذا نص أولي.",
  promptId: "prompt-1",
  genre: "fantasy" as const,
  wordCount: 3,
  characterCount: 12,
  paragraphCount: 1,
  createdAt: new Date("2026-04-13T10:00:00.000Z"),
  updatedAt: new Date("2026-04-13T10:00:00.000Z"),
  tags: ["تجريب"],
  isCompleted: false,
};

const basePrompt = {
  id: "prompt-1",
  title: "مشهد افتتاحي",
  description: "محفز لاختبار المحرر",
  genre: "fantasy" as const,
  technique: "dialogue_driven" as const,
  difficulty: "intermediate" as const,
  tags: ["اختبار"],
  arabic: "اكتب مشهداً افتتاحياً يتبدل فيه معنى الحوار بين سطر وآخر.",
  tips: ["ابدأ من لحظة توتر مباشرة."],
};

const analysisResult: TextAnalysis = {
  wordCount: 120,
  characterCount: 640,
  paragraphCount: 4,
  sentenceCount: 10,
  averageWordsPerSentence: 12,
  averageSentencesPerParagraph: 3,
  readabilityScore: 78,
  vocabularyDiversity: 71,
  sentenceVariety: 76,
  emotionalTone: "positive",
  qualityMetrics: { clarity: 82, creativity: 74, coherence: 69, impact: 71 },
  suggestions: ["أعد صياغة الفقرة الثالثة لتقوية التماسك."],
};

function buildProps(overrides: Record<string, unknown> = {}) {
  return {
    project: baseProject,
    selectedPrompt: basePrompt,
    onProjectChange: vi.fn(),
    onSave: vi.fn(),
    onAnalyze: vi.fn().mockResolvedValue(analysisResult),
    onExport: vi.fn((project, format) => ({
      success: true,
      format,
      filename: `${project.title}.${format}`,
      message: `تم تجهيز ${format.toUpperCase()} للتنزيل.`,
    })),
    onOpenSettings: vi.fn(),
    analysisAvailable: true,
    analysisBlockedReason:
      "تحليل النص يحتاج مفتاح Gemini صالحاً. أضفه من الإعدادات أولاً ثم عُد إلى المحرر.",
    activeChallenge: null,
    settings: {
      language: "ar" as const,
      theme: "dark" as const,
      textDirection: "rtl" as const,
      fontSize: "medium" as const,
      autoSave: true,
      autoSaveInterval: 30000,
      geminiApiKey: "test-key",
      geminiModel: "gemini-2.5-pro",
      geminiTemperature: 0.7,
      geminiMaxTokens: 8192,
    },
    loading: false,
    ...overrides,
  };
}

describe("WritingEditor", () => {
  it("يعرض سبب تعطيل التحليل ويفتح الإعدادات عند غياب المفتاح", () => {
    const base = buildProps();
    const props = buildProps({
      analysisAvailable: false,
      settings: { ...base.settings, geminiApiKey: undefined },
    });

    render(<WritingEditor {...props} />);

    expect(screen.getByText(props.analysisBlockedReason)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "🔍 تحليل النص" })
    ).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "افتح الإعدادات" }));
    expect(props.onOpenSettings).toHaveBeenCalledTimes(1);
  });

  it("يحفظ آخر نسخة مع العنوان والمحتوى والإحصاءات المحدثة", () => {
    const props = buildProps();

    render(<WritingEditor {...props} />);

    fireEvent.change(screen.getByDisplayValue("مشروع تجريبي"), {
      target: { value: "عنوان نهائي" },
    });
    fireEvent.change(screen.getByDisplayValue("هذا نص أولي."), {
      target: { value: "هذا نص جديد تماما" },
    });
    fireEvent.click(screen.getByRole("button", { name: "💾 حفظ" }));

    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "عنوان نهائي",
        content: "هذا نص جديد تماما",
        wordCount: 4,
        paragraphCount: 1,
      })
    );
    expect(screen.getByText("تم حفظ المشروع يدوياً.")).toBeInTheDocument();
  });

  it("يشغّل التحليل ويعرض ملخصاً واضحاً واقتراحات مفهومة", async () => {
    const props = buildProps();

    render(<WritingEditor {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "🔍 تحليل النص" }));

    await waitFor(() => {
      expect(props.onAnalyze).toHaveBeenCalledWith("هذا نص أولي.");
    });

    expect(
      screen.getByText(
        "النص جيد، لكنه يحتاج صقلاً محدوداً قبل النسخة النهائية."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("قابلية القراءة")).toBeInTheDocument();
    expect(screen.getByText("إيجابية")).toBeInTheDocument();
    expect(
      screen.getByText("أعد صياغة الفقرة الثالثة لتقوية التماسك.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("اكتمل التحليل. متوسط الجودة الحالي 74/100.")
    ).toBeInTheDocument();
  });

  it.each([
    ["txt", "📄 نص خالص"],
    ["json", "📋 بيانات منظمة"],
  ] as const)("يصدر بصيغة %s ويعرض نتيجة واضحة", async (format, label) => {
    const props = buildProps();

    render(<WritingEditor {...props} />);
    fireEvent.click(screen.getByRole("button", { name: label }));

    await waitFor(() => {
      expect(props.onExport).toHaveBeenCalledWith(baseProject, format);
    });

    expect(
      screen.getByText(`تم تجهيز ${format.toUpperCase()} للتنزيل.`)
    ).toBeInTheDocument();
  });
});
