import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";
import { renderWithApp, screen, fireEvent } from "../test-utils";
import { WebcamAnalysisView } from "../features/webcam/index";
import { MemorizationView } from "../features/memorization/index";
import { formatTime } from "../lib/utils";

// ── formatTime utility ──

describe("formatTime", () => {
  it("يعرض صفر بشكل صحيح", () => {
    expect(formatTime(0)).toBe("00:00");
  });

  it("ينسق الثواني فقط", () => {
    expect(formatTime(45)).toBe("00:45");
  });

  it("ينسق الدقائق والثواني", () => {
    expect(formatTime(125)).toBe("02:05");
  });
});

// ── WebcamAnalysisView ──

describe("WebcamAnalysisView", () => {
  beforeEach(() => {
    // Mock navigator.mediaDevices for webcam tests
    Object.defineProperty(global.navigator, "mediaDevices", {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  it("يعرض عنوان تحليل الكاميرا", () => {
    renderWithApp(<WebcamAnalysisView />);
    expect(screen.getByText("📹 تحليل الأداء البصري")).toBeInTheDocument();
  });

  it("يعرض زر تفعيل الكاميرا", () => {
    renderWithApp(<WebcamAnalysisView />);
    expect(screen.getByText("📹 تفعيل الكاميرا")).toBeInTheDocument();
  });

  it("يعرض الجلسات السابقة", () => {
    renderWithApp(<WebcamAnalysisView />);
    expect(screen.getByText("الجلسات السابقة")).toBeInTheDocument();
  });

  it("يعرض نصائح التحليل البصري", () => {
    renderWithApp(<WebcamAnalysisView />);
    expect(screen.getByText("💡 نصائح للتحليل البصري")).toBeInTheDocument();
  });

  it("يعرض وصف التحليل", () => {
    renderWithApp(<WebcamAnalysisView />);
    expect(
      screen.getByText("تحليل لغة الجسد وخط النظر والتعبيرات باستخدام الكاميرا")
    ).toBeInTheDocument();
  });
});

// ── MemorizationView ──

describe("MemorizationView", () => {
  it("يعرض عنوان وضع الحفظ", () => {
    renderWithApp(<MemorizationView />);
    expect(screen.getByText("🧠 وضع اختبار الحفظ")).toBeInTheDocument();
  });

  it("يعرض حقل إدخال النص", () => {
    renderWithApp(<MemorizationView />);
    expect(screen.getByPlaceholderText("أدخل النص هنا...")).toBeInTheDocument();
  });

  it("يعرض زر النص النموذجي", () => {
    renderWithApp(<MemorizationView />);
    expect(screen.getByText("📄 نص نموذجي")).toBeInTheDocument();
  });

  it("يعرض أزرار مستوى الحذف", () => {
    renderWithApp(<MemorizationView />);
    expect(screen.getByText("10%")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText("90%")).toBeInTheDocument();
  });

  it("يعرض زر بدء الجلسة", () => {
    renderWithApp(<MemorizationView />);
    expect(screen.getByText("▶️ بدء جلسة الحفظ")).toBeInTheDocument();
  });

  it("يعرض إحصائيات الأداء", () => {
    renderWithApp(<MemorizationView />);
    expect(screen.getByText("📊 إحصائيات الأداء")).toBeInTheDocument();
    expect(screen.getByText("المحاولات")).toBeInTheDocument();
    expect(screen.getByText("كلمات صحيحة")).toBeInTheDocument();
    expect(screen.getByText("كلمات خاطئة")).toBeInTheDocument();
    expect(screen.getByText("مرات التردد")).toBeInTheDocument();
  });

  it("يعرض دليل الاستخدام", () => {
    renderWithApp(<MemorizationView />);
    expect(screen.getByText("📖 دليل الاستخدام")).toBeInTheDocument();
  });

  it("يحمّل نص نموذجي عند الضغط", () => {
    renderWithApp(<MemorizationView />);
    const btn = screen.getByText("📄 نص نموذجي");
    fireEvent.click(btn);
    const textarea = screen.getByPlaceholderText(
      "أدخل النص هنا..."
    ) as HTMLTextAreaElement;
    expect(textarea.value).toContain("أكون أو لا أكون");
  });

  it("لا يبدأ جلسة بدون نص", () => {
    renderWithApp(<MemorizationView />);
    const startBtn = screen.getByText("▶️ بدء جلسة الحفظ");
    fireEvent.click(startBtn);
    // Should still show start button (session didn't start)
    expect(screen.getByText("▶️ بدء جلسة الحفظ")).toBeInTheDocument();
  });

  it("يبدأ جلسة بعد تحميل نص نموذجي", () => {
    renderWithApp(<MemorizationView />);
    // Load sample
    fireEvent.click(screen.getByText("📄 نص نموذجي"));
    // Start session
    fireEvent.click(screen.getByText("▶️ بدء جلسة الحفظ"));
    // Session started — training zone should appear
    expect(screen.getByText("🎯 منطقة التدريب")).toBeInTheDocument();
    // Start button replaced with stop/increase buttons
    expect(screen.getByText("⏹️ إنهاء الجلسة")).toBeInTheDocument();
    expect(screen.getByText("⬆️ زيادة الصعوبة")).toBeInTheDocument();
  });
});
