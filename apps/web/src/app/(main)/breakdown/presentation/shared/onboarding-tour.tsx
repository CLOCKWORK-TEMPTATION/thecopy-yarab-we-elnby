"use client";

/**
 * @fileoverview جولة الإعداد الأولي لمساحة التفكيك
 *
 * تُعرض تلقائيًا للمستخدمين الجدد (أول زيارة فقط).
 * تُخفى دائمًا بعد النقر على "ابدأ" أو "تخطى".
 * يُحفظ الاختيار في localStorage تحت مفتاح `breakdown_tour_done`.
 */

import { ChevronLeft, ChevronRight, Clapperboard, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const TOUR_STORAGE_KEY = "breakdown_tour_done";

// ============================================================
// خطوات الجولة
// ============================================================

interface TourStep {
  title: string;
  body: string;
  /** اسم القسم المقابل في شريط التنقل — للتمييز البصري */
  highlight?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "مرحباً بك في BreakBreak AI",
    body: "منصة تفريغ السيناريو السينمائي بالذكاء الاصطناعي. الجولة القادمة ستُعرّفك على الأقسام الرئيسية خلال 30 ثانية.",
  },
  {
    title: "قسم الإدخال",
    body: "الصق نص سيناريوك الكامل في محرر النص، ثم اضغط «ابدأ التحليل والتفريغ» لبدء المعالجة.",
    highlight: "الإدخال",
  },
  {
    title: "قسم الطاقم",
    body: "بعد المعالجة تجد هنا قائمة الشخصيات الكاملة مع تحليل الأدوار والجنس والمحفزات الدرامية.",
    highlight: "الطاقم",
  },
  {
    title: "قسم التقرير",
    body: "التقرير النهائي يحتوي على تفريغ كل مشهد: طاقم، أزياء، ماكياج، معدات، تصوير، وتقدير الميزانية.",
    highlight: "التقرير",
  },
  {
    title: "المساعد الذكي",
    body: "يمكنك سؤال المساعد عن أي تفاصيل إنتاجية أو طلب تعديلات على التفريغ بلغة طبيعية.",
    highlight: "المساعد",
  },
  {
    title: "اختصارات لوحة المفاتيح",
    body: "Ctrl+S لحفظ الجلسة فورًا. Ctrl+Z للتراجع عن آخر تعديل. Ctrl+/ لعرض قائمة الاختصارات.",
  },
];

// ============================================================
// المكوّن
// ============================================================

interface OnboardingTourProps {
  /** يُمكّن تجاوز قراءة localStorage للاختبار */
  forceShow?: boolean;
}

export function OnboardingTour({ forceShow = false }: OnboardingTourProps) {
  const [visible, setVisible] = useState(() => {
    if (forceShow) {
      return true;
    }

    try {
      return !localStorage.getItem(TOUR_STORAGE_KEY);
    } catch {
      return true;
    }
  });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!forceShow) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setVisible(true);
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [forceShow]);

  const dismiss = useCallback((markDone = true) => {
    setVisible(false);
    if (markDone) {
      try {
        localStorage.setItem(TOUR_STORAGE_KEY, "1");
      } catch {
        // تجاهل أخطاء localStorage
      }
    }
  }, []);

  const handleNext = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const handlePrev = useCallback(() => {
    setStep((s) => Math.max(0, s - 1));
  }, []);

  if (!visible) return null;

  const current = TOUR_STEPS[step]!;
  const isLast = step === TOUR_STEPS.length - 1;
  const isFirst = step === 0;

  return (
    /* طبقة الخلفية */
    <div
      role="dialog"
      aria-modal="true"
      aria-label="جولة الإعداد الأولي"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm"
    >
      {/* البطاقة */}
      <div className="relative mx-4 w-full max-w-md rounded-2xl border border-white/10 bg-[#0e1118] p-8 shadow-2xl">
        {/* زر الإغلاق */}
        <button
          type="button"
          aria-label="تخطى الجولة"
          onClick={() => dismiss()}
          className="absolute left-4 top-4 rounded-full p-1.5 text-white/35 transition-colors hover:bg-white/8 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>

        {/* أيقونة */}
        <div className="mb-5 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
            <Clapperboard className="h-7 w-7 text-white" />
          </div>
        </div>

        {/* المحتوى */}
        <div className="mb-8 space-y-3 text-center">
          <h2 className="text-xl font-bold text-white">{current.title}</h2>
          <p className="text-sm leading-relaxed text-white/60">{current.body}</p>
        </div>

        {/* نقاط التقدم */}
        <div className="mb-8 flex justify-center gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`الانتقال إلى الخطوة ${i + 1}`}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step
                  ? "w-6 bg-blue-500"
                  : "w-1.5 bg-white/20 hover:bg-white/35"
              }`}
            />
          ))}
        </div>

        {/* أزرار التنقل */}
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrev}
            disabled={isFirst}
            className="flex items-center gap-1 rounded-full border border-white/10 px-4 py-2 text-sm text-white/55 transition-colors hover:bg-white/6 hover:text-white disabled:pointer-events-none disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
            السابق
          </button>

          <button
            type="button"
            onClick={handleNext}
            className="flex flex-1 items-center justify-center gap-1 rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2 text-sm font-semibold text-white shadow-lg transition-all hover:from-blue-500 hover:to-indigo-500"
          >
            {isLast ? "ابدأ" : "التالي"}
            {!isLast && <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
