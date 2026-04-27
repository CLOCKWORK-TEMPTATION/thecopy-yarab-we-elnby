/**
 * اختبار الدخان للمكون CreativeWritingStudio
 * @description اختبار أساسي للتأكد من أن المكون يتم عرضه بدون أخطاء
 */

import { render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { CreativeWritingStudio } from "@/app/(main)/arabic-creative-writing-studio/components/CreativeWritingStudio";

import type { PromptLibraryProps } from "@/app/(main)/arabic-creative-writing-studio/components/PromptLibrary";
import type { SettingsPanelProps } from "@/app/(main)/arabic-creative-writing-studio/components/SettingsPanel";
import type { WritingEditorProps } from "@/app/(main)/arabic-creative-writing-studio/components/WritingEditor";
import type {
  AppSettings,
  CreativePrompt,
  CreativeProject,
} from "@/app/(main)/arabic-creative-writing-studio/types";
import type { ButtonHTMLAttributes, PropsWithChildren } from "react";

type ButtonMockProps = PropsWithChildren<
  Pick<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "onClick" | "className" | "disabled"
  >
>;

// Mock dependencies
vi.mock("@/ai/gemini-service", () => ({
  GeminiService: class {
    testConnection() {
      return { success: true };
    }
    analyzeText() {
      return { success: true, data: {} };
    }
  },
}));

vi.mock(
  "@/app/(main)/arabic-creative-writing-studio/components/PromptLibrary",
  () => ({
    PromptLibrary: ({ onPromptSelect, loading }: PromptLibraryProps) => (
      <div data-testid="prompt-library">
        <button
          onClick={() =>
            onPromptSelect({ id: "test", title: "Test" } as CreativePrompt)
          }
          disabled={loading}
        >
          مكتبة المحفزات
        </button>
        {loading && <span>جاري التحميل...</span>}
      </div>
    ),
  })
);

vi.mock(
  "@/app/(main)/arabic-creative-writing-studio/components/WritingEditor",
  () => ({
    WritingEditor: ({ onSave }: WritingEditorProps) => (
      <div data-testid="writing-editor">
        <button
          onClick={() =>
            onSave({ id: "test", title: "Test Project" } as CreativeProject)
          }
        >
          حفظ المشروع
        </button>
      </div>
    ),
  })
);

vi.mock(
  "@/app/(main)/arabic-creative-writing-studio/components/SettingsPanel",
  () => ({
    SettingsPanel: ({ onSettingsUpdate }: SettingsPanelProps) => (
      <div data-testid="settings-panel">
        <button onClick={() => onSettingsUpdate({ theme: "dark" })}>
          تحديث الإعدادات
        </button>
      </div>
    ),
  })
);

// Mock UI components
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, className, disabled }: ButtonMockProps) => (
    <button onClick={onClick} className={className} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CardContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CardHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
  CardTitle: ({ children }: PropsWithChildren) => <h3>{children}</h3>,
  CardDescription: ({ children }: PropsWithChildren) => <p>{children}</p>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: PropsWithChildren) => (
    <div role="alert">{children}</div>
  ),
  AlertDescription: ({ children }: PropsWithChildren) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DialogContent: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DialogDescription: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DialogHeader: ({ children }: PropsWithChildren) => <div>{children}</div>,
  DialogTitle: ({ children }: PropsWithChildren) => <h3>{children}</h3>,
}));

describe("CreativeWritingStudio - اختبار الدخان", () => {
  /**
   * اختبار أن المكون يتم عرضه بدون أخطاء
   */
  it("يجب أن يتم عرض المكون بدون استثناءات", () => {
    expect(() => {
      render(<CreativeWritingStudio />);
    }).not.toThrow();
  });

  /**
   * اختبار أن العنوان الرئيسي موجود
   */
  it("يجب أن يحتوي على العنوان الرئيسي", () => {
    render(<CreativeWritingStudio />);

    expect(
      screen.getByRole("heading", {
        name: "استوديو الكتابة الإبداعية",
      })
    ).toBeInTheDocument();
  });

  /**
   * اختبار أن عناصر التنقل الأساسية موجودة
   */
  it("يجب أن تحتوي على عناصر التنقل الأساسية", () => {
    render(<CreativeWritingStudio />);

    expect(screen.getByText("🏠 الرئيسية")).toBeInTheDocument();
    expect(screen.getByText("📚 مكتبة المحفزات")).toBeInTheDocument();
    expect(screen.getByText("✍️ المحرر")).toBeInTheDocument();
    expect(screen.getByText("⚙️ الإعدادات")).toBeInTheDocument();
  });

  /**
   * اختبار أن الرسالة الترحيبية موجودة في الحالة الأولية
   */
  it("يجب أن تظهر الرسالة الترحيبية في الحالة الأولية", () => {
    render(<CreativeWritingStudio />);

    expect(screen.getByText(/مرحباً بك في عالم الإبداع/)).toBeInTheDocument();
    expect(screen.getByText("ابدأ الكتابة")).toBeInTheDocument();
  });

  /**
   * اختبار أن المكون يحتوي على باقات واجهة المستخدم
   */
  it("يجب أن يحتوي على عناصر واجهة المستخدم الأساسية", () => {
    render(<CreativeWritingStudio />);

    expect(screen.getAllByRole("button").length).toBeGreaterThanOrEqual(4);
    expect(screen.getByText("📚 مكتبة المحفزات")).toBeInTheDocument();
  });

  /**
   * اختبار التصدير الصحيح للمكون
   */
  it("يجب أن يتم تصدير المكون بشكل صحيح", () => {
    expect(typeof CreativeWritingStudio).toBe("function");
    expect(CreativeWritingStudio).toBeDefined();
  });

  /**
   * اختبار أن المكون يقبل الخصائص الأولية
   */
  it("يجب أن يقبل الخصائص الأولية", () => {
    const initialSettings: Partial<AppSettings> = {
      language: "ar",
      theme: "light",
    };

    expect(() => {
      render(<CreativeWritingStudio initialSettings={initialSettings} />);
    }).not.toThrow();
  });

  /**
   * اختبار أن المكون يمكن عرضه عدة مرات
   */
  it("يجب أن يكون قابلاً للعرض عدة مرات", () => {
    const { rerender } = render(<CreativeWritingStudio />);

    expect(() => {
      rerender(<CreativeWritingStudio />);
    }).not.toThrow();
  });

  /**
   * اختبار أن العروض الافتراضية صحيحة
   */
  it("يجب أن يحتوي على العروض الافتراضية", () => {
    render(<CreativeWritingStudio />);

    expect(screen.getByText("🏠 الرئيسية")).toBeInTheDocument();
    expect(screen.getByText("📚 مكتبة المحفزات")).toBeInTheDocument();
    expect(screen.getByText("✍️ المحرر")).toBeInTheDocument();
    expect(screen.getByText("⚙️ الإعدادات")).toBeInTheDocument();
  });
});

/**
 * اختبار متقدم للتأكد من أن كل شيء يعمل معاً
 */
describe("CreativeWritingStudio - اختبارات شاملة", () => {
  it("يجب أن يتم عرض كل العناصر المطلوبة", () => {
    render(<CreativeWritingStudio />);

    // التحقق من العناصر الأساسية
    expect(
      screen.getByRole("heading", {
        name: "استوديو الكتابة الإبداعية",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("🏠 الرئيسية")).toBeInTheDocument();
    expect(screen.getByText("📚 مكتبة المحفزات")).toBeInTheDocument();
    expect(screen.getByText("✍️ المحرر")).toBeInTheDocument();
    expect(screen.getByText("⚙️ الإعدادات")).toBeInTheDocument();

    // التحقق من الرسالة الترحيبية
    expect(screen.getByText(/مرحباً بك في عالم الإبداع/)).toBeInTheDocument();

    // التحقق من وجود أزرار العمل
    expect(screen.getByText("ابدأ الكتابة")).toBeInTheDocument();
  });
});
