/**
 * اختبار الدخان للمكون CreativeWritingStudio
 * @description اختبار أساسي للتأكد من أن المكون يتم عرضه بدون أخطاء
 */

import { render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { CreativeWritingStudio } from "@/app/(main)/arabic-creative-writing-studio/components/CreativeWritingStudio";
import type { AppSettings } from "@/app/(main)/arabic-creative-writing-studio/types";

// Mock dependencies
vi.mock("@/ai/gemini-service", () => ({
  GeminiService: class {
    async testConnection() {
      return { success: true };
    }
    async analyzeText() {
      return { success: true, data: {} };
    }
  },
}));

vi.mock(
  "@/app/(main)/arabic-creative-writing-studio/components/PromptLibrary",
  () => ({
    PromptLibrary: ({ onPromptSelect, loading }: any) => (
      <div data-testid="prompt-library">
        <button
          onClick={() => onPromptSelect({ id: "test", title: "Test" })}
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
    WritingEditor: ({ onSave }: any) => (
      <div data-testid="writing-editor">
        <button onClick={() => onSave({ id: "test", title: "Test Project" })}>
          حفظ المشروع
        </button>
      </div>
    ),
  })
);

vi.mock(
  "@/app/(main)/arabic-creative-writing-studio/components/SettingsPanel",
  () => ({
    SettingsPanel: ({ onSettingsUpdate }: any) => (
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
  Button: ({ children, onClick, className, disabled }: any) => (
    <button onClick={onClick} className={className} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardDescription: ({ children }: any) => <p>{children}</p>,
}));

vi.mock("@/components/ui/alert", () => ({
  Alert: ({ children }: any) => <div role="alert">{children}</div>,
  AlertDescription: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children }: any) => <div>{children}</div>,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogDescription: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h3>{children}</h3>,
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
      screen.getByText("🎨 استوديو الكتابة الإبداعية")
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

    expect(screen.getAllByRole("button")).toHaveLength(4);
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
      screen.getByText("🎨 استوديو الكتابة الإبداعية")
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
