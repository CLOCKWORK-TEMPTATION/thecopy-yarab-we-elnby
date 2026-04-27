import React from "react";
import { describe, it, expect } from "vitest";

import { ARTrainingView } from "../features/ar";
import { SceneRhythmView } from "../features/rhythm";
import { renderWithApp, screen, fireEvent, waitFor } from "../test-utils";

describe("ARTrainingView", () => {
  it("يعرض عنوان تدريب AR/MR", () => {
    renderWithApp(<ARTrainingView />);
    expect(screen.getByText("🥽 تدريب AR/MR")).toBeInTheDocument();
  });

  it("يعرض ميزات AR الخمس", () => {
    renderWithApp(<ARTrainingView />);
    expect(screen.getByText("Teleprompter معلق")).toBeInTheDocument();
    expect(screen.getByText("علامات Blocking")).toBeInTheDocument();
    expect(screen.getByText("عين الكاميرا")).toBeInTheDocument();
    expect(screen.getByText("شريك هولوغرافي")).toBeInTheDocument();
    expect(screen.getByText("تحكم بالإيماءات")).toBeInTheDocument();
  });

  it("يبدّل حالة اتصال Vision Pro", () => {
    renderWithApp(<ARTrainingView />);
    expect(screen.getByText("⏸️ في انتظار الاتصال")).toBeInTheDocument();
    fireEvent.click(screen.getByText("🥽 اتصل بـ Vision Pro"));
    expect(screen.getByText("🔗 Vision Pro متصل")).toBeInTheDocument();
  });

  it("يبدّل حالة جلسة AR", () => {
    renderWithApp(<ARTrainingView />);
    fireEvent.click(screen.getByText("▶️ بدء جلسة AR"));
    expect(screen.getByText("⏹️ إيقاف الجلسة")).toBeInTheDocument();
    expect(screen.getByText("جلسة نشطة")).toBeInTheDocument();
  });

  it("يعرض إعدادات Teleprompter عند اختيار الميزة", () => {
    renderWithApp(<ARTrainingView />);
    fireEvent.click(screen.getByText("Teleprompter معلق"));
    expect(screen.getByText("📜 إعدادات Teleprompter")).toBeInTheDocument();
    expect(screen.getByText(/سرعة التمرير/)).toBeInTheDocument();
  });
});

describe("SceneRhythmView", () => {
  it("يعرض عنوان تحليل الإيقاع", () => {
    renderWithApp(<SceneRhythmView />);
    expect(screen.getByText("تحليل إيقاع المشهد")).toBeInTheDocument();
  });

  it("يحمّل النص التجريبي", () => {
    renderWithApp(<SceneRhythmView />);
    fireEvent.click(screen.getByText("📄 نص تجريبي"));
    const textarea = screen.getByPlaceholderText(
      "الصق نصك هنا..."
    );
    expect((textarea.value ?? "").length).toBeGreaterThan(20);
  });

  it("لا يبدأ التحليل بدون نص", () => {
    renderWithApp(<SceneRhythmView />);
    const analyzeButton = screen.getByText("🎵 تحليل الإيقاع");
    expect(analyzeButton).toBeDisabled();
  });

  it("يعرض نتائج التحليل بعد إكمال المعالجة", async () => {
    renderWithApp(<SceneRhythmView />);
    fireEvent.click(screen.getByText("📄 نص تجريبي"));
    fireEvent.click(screen.getByText("🎵 تحليل الإيقاع"));

    await waitFor(
      () => {
        expect(screen.getByText("النتيجة: 78/100")).toBeInTheDocument();
        expect(screen.getByText("الإيقاع: متوسط")).toBeInTheDocument();
      },
      { timeout: 8000 }
    );
  }, 10000);

  it("يتنقل بين تبويبات نتائج الإيقاع", async () => {
    renderWithApp(<SceneRhythmView />);
    fireEvent.click(screen.getByText("📄 نص تجريبي"));
    fireEvent.click(screen.getByText("🎵 تحليل الإيقاع"));

    await waitFor(
      () => {
        expect(screen.getByText("🗺️ خريطة الإيقاع")).toBeInTheDocument();
      },
      { timeout: 8000 }
    );

    fireEvent.click(screen.getByText("📊 المقارنة"));
    expect(screen.getByText("التصاعد الدرامي")).toBeInTheDocument();

    fireEvent.click(screen.getByText("⚠️ اكتشاف الرتابة"));
    expect(
      screen.getByText("فترة طويلة من الإيقاع المتوسط دون تنويع كافٍ")
    ).toBeInTheDocument();

    fireEvent.click(screen.getByText("🎨 التلوين العاطفي"));
    expect(screen.getByText('"يا ليلى، يا قمر الليل"')).toBeInTheDocument();
  }, 10000);
});
