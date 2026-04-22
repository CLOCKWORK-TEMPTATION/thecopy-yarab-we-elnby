import { describe, it, expect } from "vitest";
import React from "react";
import { renderWithApp, screen } from "../test-utils";
import { LoginForm, RegisterForm } from "../features/auth/index";
import { HomeView } from "../features/home/index";
import { DashboardView } from "../features/dashboard/index";

// ── LoginForm ──

describe("LoginForm", () => {
  it("يعرض حقول تسجيل الدخول", () => {
    renderWithApp(<LoginForm />);
    expect(screen.getByLabelText("البريد الإلكتروني")).toBeInTheDocument();
    expect(screen.getByLabelText("كلمة المرور")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /تسجيل الدخول/ })
    ).toBeInTheDocument();
  });

  it("يحتوي على رابط للتسجيل", () => {
    renderWithApp(<LoginForm />);
    expect(screen.getByText("سجل الآن")).toBeInTheDocument();
  });
});

// ── RegisterForm ──

describe("RegisterForm", () => {
  it("يعرض حقول التسجيل", () => {
    renderWithApp(<RegisterForm />);
    expect(screen.getByLabelText("الاسم الكامل")).toBeInTheDocument();
    expect(screen.getByLabelText("البريد الإلكتروني")).toBeInTheDocument();
    expect(screen.getByLabelText("كلمة المرور")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /إنشاء الحساب/ })
    ).toBeInTheDocument();
  });

  it("يحتوي على رابط لتسجيل الدخول", () => {
    renderWithApp(<RegisterForm />);
    expect(screen.getByText("سجل دخولك")).toBeInTheDocument();
  });
});

// ── HomeView ──

describe("HomeView", () => {
  it("يعرض العنوان الرئيسي", () => {
    renderWithApp(<HomeView />);
    expect(
      screen.getByText("طور مهاراتك التمثيلية بالذكاء الاصطناعي")
    ).toBeInTheDocument();
  });

  it("يعرض أزرار الدعوة للتجربة", () => {
    renderWithApp(<HomeView />);
    expect(
      screen.getByRole("button", { name: /جرب التطبيق/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /تمارين الصوت/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /مدرب الصوت$/ })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Self-Tape Suite/ })
    ).toBeInTheDocument();
  });

  it("يعرض بطاقات الميزات", () => {
    renderWithApp(<HomeView />);
    expect(screen.getByText("تحليل النصوص")).toBeInTheDocument();
    expect(screen.getByText("شريك المشهد الذكي")).toBeInTheDocument();
    expect(screen.getByText("مدرب الصوت اللحظي")).toBeInTheDocument();
    // "تتبع التقدم" appears in both feature cards and how-it-works section
    expect(screen.getAllByText("تتبع التقدم").length).toBeGreaterThanOrEqual(1);
  });

  it("يعرض قسم كيف يعمل", () => {
    renderWithApp(<HomeView />);
    expect(screen.getByText("كيف يعمل")).toBeInTheDocument();
    expect(screen.getByText("ارفع نصك")).toBeInTheDocument();
    expect(screen.getByText("حلل وتدرب")).toBeInTheDocument();
  });
});

// ── DashboardView ──

describe("DashboardView", () => {
  it("يعرض تحية الضيف بدون مستخدم مسجل", () => {
    renderWithApp(<DashboardView />);
    expect(screen.getByText(/مرحباً، ضيف/)).toBeInTheDocument();
  });

  it("يعرض بطاقات الإحصائيات الأربع", () => {
    renderWithApp(<DashboardView />);
    expect(screen.getByText("📝 النصوص")).toBeInTheDocument();
    expect(screen.getByText("🎤 التسجيلات")).toBeInTheDocument();
    expect(screen.getByText("⭐ متوسط التقييم")).toBeInTheDocument();
    expect(screen.getByText("⏱️ ساعات التدريب")).toBeInTheDocument();
  });

  it("يعرض عدد النصوص والتسجيلات من السياق", () => {
    renderWithApp(<DashboardView />);
    // AppContext provides 3 initial scripts and 2 initial recordings
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });
});
