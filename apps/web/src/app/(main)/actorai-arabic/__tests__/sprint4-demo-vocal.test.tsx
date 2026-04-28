import { describe, it, expect } from "vitest";

import { DemoView } from "../features/demo/index";
import { VocalExercisesView } from "../features/vocal/index";
import { renderWithApp, screen, fireEvent, waitFor } from "../test-utils";

const activateDemoTab = async (tabName: string) => {
  const tabTrigger = screen.getByRole("tab", { name: tabName });
  fireEvent.mouseDown(tabTrigger);
  fireEvent.click(tabTrigger);
  await waitFor(() => {
    expect(tabTrigger).toHaveAttribute("data-state", "active");
  });
};

// ── DemoView ──

describe("DemoView", () => {
  it("يعرض عنوان التجربة التفاعلية", () => {
    renderWithApp(<DemoView />);
    expect(screen.getByText("🎬 التجربة التفاعلية")).toBeInTheDocument();
  });

  it("يعرض التبويبات الثلاثة", () => {
    renderWithApp(<DemoView />);
    expect(screen.getByText("📝 تحليل النص")).toBeInTheDocument();
    expect(screen.getByText("🎭 شريك المشهد")).toBeInTheDocument();
    expect(screen.getByText("🎥 التسجيل")).toBeInTheDocument();
  });

  it("يعرض محتوى تبويب تحليل النص افتراضياً", () => {
    renderWithApp(<DemoView />);
    expect(screen.getByText("تحليل النص")).toBeInTheDocument();
    expect(
      screen.getByText("ارفع نصاً للحصول على تحليل مدعوم بالذكاء الاصطناعي")
    ).toBeInTheDocument();
  });

  it("يعرض زر استخدام النص التجريبي", () => {
    renderWithApp(<DemoView />);
    expect(screen.getByText("📄 استخدم نص تجريبي")).toBeInTheDocument();
  });

  it("يعرض حقل إدخال النص وزر التحليل", () => {
    renderWithApp(<DemoView />);
    expect(
      screen.getByPlaceholderText("الصق نصك هنا أو استخدم النص التجريبي...")
    ).toBeInTheDocument();
    expect(screen.getByText("🔍 حلل النص")).toBeInTheDocument();
  });

  it("يعرض قائمة منهجيات التمثيل", () => {
    renderWithApp(<DemoView />);
    expect(screen.getByText("منهجية التمثيل")).toBeInTheDocument();
  });

  it("يتنقل إلى تبويب شريك المشهد", async () => {
    renderWithApp(<DemoView />);
    await activateDemoTab("🎭 شريك المشهد");
    expect(screen.getByText("🎭 شريك المشهد الذكي")).toBeInTheDocument();
    expect(screen.getByText("مستعد للتدريب؟")).toBeInTheDocument();
    expect(screen.getByText("🎬 ابدأ التدريب")).toBeInTheDocument();
  });

  it("يبدأ جلسة التدريب مع شريك المشهد", async () => {
    renderWithApp(<DemoView />);
    await activateDemoTab("🎭 شريك المشهد");
    fireEvent.click(screen.getByText("🎬 ابدأ التدريب"));
    expect(
      screen.getByText(
        "مرحباً! أنا شريكك في المشهد. سأقوم بدور ليلى. ابدأ بقول سطرك الأول..."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("📤 إرسال")).toBeInTheDocument();
    expect(screen.getByText("⏹️ إنهاء")).toBeInTheDocument();
  });

  it("يتنقل إلى تبويب التسجيل", async () => {
    renderWithApp(<DemoView />);
    await activateDemoTab("🎥 التسجيل");
    expect(screen.getByText("🎥 تسجيل الأداء")).toBeInTheDocument();
    expect(screen.getByText("مستعد لتسجيل أدائك؟")).toBeInTheDocument();
    expect(screen.getByText("⏺️ ابدأ التسجيل")).toBeInTheDocument();
  });

  it("يعرض التسجيلات السابقة في تبويب التسجيل", async () => {
    renderWithApp(<DemoView />);
    await activateDemoTab("🎥 التسجيل");
    expect(screen.getByText("📚 تسجيلاتك السابقة:")).toBeInTheDocument();
    expect(screen.getByText("مشهد الحديقة - التجربة 3")).toBeInTheDocument();
    expect(screen.getByText("مشهد اللقاء - التجربة 1")).toBeInTheDocument();
  });

  it("يبدأ التسجيل عند الضغط على الزر", async () => {
    renderWithApp(<DemoView />);
    await activateDemoTab("🎥 التسجيل");
    fireEvent.click(screen.getByText("⏺️ ابدأ التسجيل"));
    expect(screen.getByText("جاري التسجيل...")).toBeInTheDocument();
    expect(screen.getByText("⏹️ إيقاف التسجيل")).toBeInTheDocument();
  });
});

// ── VocalExercisesView ──

describe("VocalExercisesView", () => {
  it("يعرض عنوان تمارين الصوت", () => {
    renderWithApp(<VocalExercisesView />);
    expect(screen.getByText("🎤 تمارين الصوت والنطق")).toBeInTheDocument();
  });

  it("يعرض الوصف الفرعي", () => {
    renderWithApp(<VocalExercisesView />);
    expect(
      screen.getByText("تمارين احترافية لتطوير صوتك وأدائك الصوتي")
    ).toBeInTheDocument();
  });

  it("يعرض 6 بطاقات تمارين", () => {
    renderWithApp(<VocalExercisesView />);
    const startButtons = screen.getAllByText("▶️ ابدأ التمرين");
    expect(startButtons).toHaveLength(6);
  });

  it("يعرض أسماء التمارين", () => {
    renderWithApp(<VocalExercisesView />);
    expect(screen.getByText(/تمرين التنفس العميق/)).toBeInTheDocument();
    expect(screen.getByText(/تمرين الحروف المتحركة/)).toBeInTheDocument();
    expect(screen.getByText(/تمرين الإسقاط الصوتي/)).toBeInTheDocument();
    expect(screen.getByText(/تمرين الرنين/)).toBeInTheDocument();
    expect(screen.getByText(/أعاصير اللسان/)).toBeInTheDocument();
    expect(screen.getByText(/تمرين الحجاب الحاجز/)).toBeInTheDocument();
  });

  it("يعرض قسم النصائح", () => {
    renderWithApp(<VocalExercisesView />);
    expect(
      screen.getByText("💡 نصائح مهمة للتمارين الصوتية")
    ).toBeInTheDocument();
    expect(
      screen.getByText("قم بتمارين الإحماء الصوتي قبل أي أداء أو تسجيل")
    ).toBeInTheDocument();
  });

  it("يبدأ التمرين عند الضغط على الزر", () => {
    renderWithApp(<VocalExercisesView />);
    const startButtons = screen.getAllByText("▶️ ابدأ التمرين");
    fireEvent.click(startButtons[0]);
    expect(screen.getByText("⏹️ إنهاء التمرين")).toBeInTheDocument();
    expect(screen.getByText("🎯")).toBeInTheDocument();
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("يعطل أزرار التمارين الأخرى عند تفعيل تمرين", () => {
    renderWithApp(<VocalExercisesView />);
    const startButtons = screen.getAllByText("▶️ ابدأ التمرين");
    fireEvent.click(startButtons[0]);
    // The active exercise button should show "جاري التمرين"
    expect(screen.getByText("⏸️ جاري التمرين...")).toBeInTheDocument();
    // Other buttons should be disabled
    const remainingButtons = screen.getAllByText("▶️ ابدأ التمرين");
    remainingButtons.forEach((btn) => {
      expect(btn).toBeDisabled();
    });
  });
});
