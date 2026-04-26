"use client";

/**
 * الصفحة: BUDGET
 * الهوية: استوديو ميزانية إنتاجية بطابع مالي/تشغيلي داخل قشرة موحدة مع المنصة
 * المتغيرات الخاصة المضافة: --page-accent, --page-accent-2, --page-border, --page-surface
 * مكونات Aceternity المستخدمة: BackgroundBeams, NoiseBackground, CardSpotlight
 */

import {
  AlertCircle,
  Download,
  FileSearch,
  Film,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { BackgroundBeams } from "@/components/aceternity/background-beams";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { NoiseBackground } from "@/components/aceternity/noise-background";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DottedGlowBackground } from "@/components/ui/dotted-glow-background";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  loadRemoteAppState,
  persistRemoteAppState,
} from "@/lib/app-state-client";

interface BudgetLineItem {
  code: string;
  description: string;
  amount: number;
  unit: string;
  rate: number;
  total: number;
  notes?: string;
}

interface BudgetCategory {
  code: string;
  name: string;
  items: BudgetLineItem[];
  total: number;
}

interface BudgetSection {
  id: string;
  name: string;
  categories: BudgetCategory[];
  total: number;
}

interface BudgetDocument {
  sections: BudgetSection[];
  grandTotal: number;
  currency: string;
  metadata?: {
    title?: string;
    director?: string;
    producer?: string;
    productionCompany?: string;
    shootingDays?: number;
    locations?: string[];
    genre?: string;
  };
}

interface BudgetAnalysis {
  summary: string;
  recommendations: string[];
  riskFactors: string[];
  costOptimization: string[];
  shootingSchedule: {
    totalDays: number;
    phases: {
      preProduction: number;
      production: number;
      postProduction: number;
    };
  };
}

interface BudgetEnvelope<T> {
  success: boolean;
  data?: T;
  error?: string;
}

interface BudgetRuntimeMeta {
  source: "ai" | "fallback";
  generatedAt: string;
  fallbackReason?: string;
}

interface BudgetRuntimePayload {
  budget: BudgetDocument;
  analysis: BudgetAnalysis;
  meta?: BudgetRuntimeMeta;
}

interface BudgetAnalysisRuntimePayload {
  analysis: BudgetAnalysis;
  meta?: BudgetRuntimeMeta;
}

interface BudgetPersistedState {
  title: string;
  scenario: string;
  budget: BudgetDocument | null;
  analysis: BudgetAnalysis | null;
  meta: BudgetRuntimeMeta | null;
  persistedAt: string | null;
}

const BUDGET_APP_STATE_ID = "BUDGET";

function formatCurrency(value: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function resolveFilename(response: Response, fallback: string) {
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const parts = contentDisposition.split("filename=");
  if (parts.length < 2) {
    return fallback;
  }
  return parts[1]?.replaceAll('"', "").trim() ?? fallback;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function BudgetPage() {
  const [title, setTitle] = useState("");
  const [scenario, setScenario] = useState("");
  const [analysis, setAnalysis] = useState<BudgetAnalysis | null>(null);
  const [budget, setBudget] = useState<BudgetDocument | null>(null);
  const [runtimeMeta, setRuntimeMeta] = useState<BudgetRuntimeMeta | null>(
    null
  );
  const [analyzing, setAnalyzing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [restoringState, setRestoringState] = useState(true);
  const [persistedAt, setPersistedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalLineItems = useMemo(() => {
    if (!budget) return 0;
    return budget.sections.reduce(
      (sectionSum, section) =>
        sectionSum +
        section.categories.reduce(
          (categorySum, category) => categorySum + category.items.length,
          0
        ),
      0
    );
  }, [budget]);

  const persistBudgetState = async (
    nextState: Omit<BudgetPersistedState, "persistedAt">
  ) => {
    // تعليق عربي: نعتمد مخزن الحالة الرسمي حتى تبقى النتيجة قابلة للاستعادة بعد التحديث أو إعادة الفتح.
    const nextPersistedAt = new Date().toISOString();
    await persistRemoteAppState(BUDGET_APP_STATE_ID, {
      ...nextState,
      persistedAt: nextPersistedAt,
    });
    setPersistedAt(nextPersistedAt);
  };

  useEffect(() => {
    let cancelled = false;

    const restoreState = async () => {
      try {
        const savedState =
          await loadRemoteAppState<BudgetPersistedState>(BUDGET_APP_STATE_ID);

        if (cancelled) {
          return;
        }

        if (!savedState) {
          setPersistedAt(null);
          return;
        }

        setTitle(savedState.title || "");
        setScenario(savedState.scenario || "");
        setBudget(savedState.budget);
        setAnalysis(savedState.analysis);
        setRuntimeMeta(savedState.meta);
        setPersistedAt(
          savedState.persistedAt ?? savedState.meta?.generatedAt ?? null
        );
      } catch {
        if (!cancelled) {
          setPersistedAt(null);
        }
      } finally {
        if (!cancelled) {
          setRestoringState(false);
        }
      }
    };

    void restoreState();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAnalyze = async () => {
    if (!scenario.trim()) {
      setError("أدخل السيناريو أولاً لتحليله.");
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/budget/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const payload =
        (await response.json()) as BudgetEnvelope<BudgetAnalysisRuntimePayload>;

      if (!response.ok || !payload.success || !payload.data?.analysis) {
        throw new Error(payload.error ?? "فشل في تحليل السيناريو.");
      }

      setAnalysis(payload.data.analysis);
      if (payload.data.meta) {
        setRuntimeMeta(payload.data.meta);
      }
      await persistBudgetState({
        title,
        scenario,
        budget,
        analysis: payload.data.analysis,
        meta: payload.data.meta ?? runtimeMeta,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء التحليل."
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const handleGenerate = async () => {
    if (!scenario.trim()) {
      setError("أدخل السيناريو أولاً لإنشاء الميزانية.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/budget/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          scenario,
        }),
      });
      const payload =
        (await response.json()) as BudgetEnvelope<BudgetRuntimePayload>;

      if (
        !response.ok ||
        !payload.success ||
        !payload.data?.budget ||
        !payload.data.analysis
      ) {
        throw new Error(payload.error ?? "فشل في إنشاء الميزانية.");
      }

      const nextTitle =
        title.trim() || (payload.data.budget.metadata?.title ?? title);

      setBudget(payload.data.budget);
      setAnalysis(payload.data.analysis);
      setRuntimeMeta(payload.data.meta ?? null);
      if (nextTitle !== title) {
        setTitle(nextTitle);
      }

      await persistBudgetState({
        title: nextTitle,
        scenario,
        budget: payload.data.budget,
        analysis: payload.data.analysis,
        meta: payload.data.meta ?? null,
      });
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء إنشاء الميزانية."
      );
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    if (!budget) {
      setError("لا توجد ميزانية لتصديرها.");
      return;
    }

    setExporting(true);
    setError(null);

    try {
      const response = await fetch("/api/budget/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ budget }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as BudgetEnvelope<never>;
        throw new Error(payload.error ?? "فشل في تصدير ملف الميزانية.");
      }

      const blob = await response.blob();
      downloadBlob(
        blob,
        resolveFilename(
          response,
          `${budget.metadata?.title?.trim() ?? "budget"}.xlsx`
        )
      );
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : "حدث خطأ غير متوقع أثناء التصدير."
      );
    } finally {
      setExporting(false);
    }
  };

  return (
    <main
      dir="rtl"
      className="relative isolate min-h-screen overflow-hidden bg-[var(--background,oklch(0.145_0_0))] text-white"
      style={{
        ["--page-accent" as string]: "var(--accent-success, #099268)",
        ["--page-accent-2" as string]: "var(--brand-bronze, #746842)",
        ["--page-border" as string]: "rgba(255,255,255,0.08)",
      }}
    >
      <NoiseBackground />
      <DottedGlowBackground
        className="pointer-events-none mask-radial-to-90pct mask-radial-at-center"
        opacity={1}
        gap={10}
        radius={1.6}
        colorLightVar="--color-neutral-500"
        glowColorLightVar="--color-neutral-600"
        colorDarkVar="--color-neutral-500"
        glowColorDarkVar="--color-sky-800"
        backgroundOpacity={0}
        speedMin={0.3}
        speedMax={1.6}
        speedScale={1}
      />
      <div className="absolute inset-0 opacity-55 pointer-events-none">
        <BackgroundBeams />
      </div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(9,146,104,0.18),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(116,104,66,0.16),transparent_34%)]" />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-4 md:px-6 md:py-6">
        <div className="space-y-6">
          <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/30 p-6 shadow-[0_20px_80px_rgba(0,0,0,0.34)] backdrop-blur-2xl md:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                  <Film className="h-7 w-7" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.34em] text-white/38">
                    BUDGET STUDIO
                  </p>
                  <h1 className="mt-2 text-4xl font-bold leading-tight text-white md:text-5xl">
                    ميزانية إنتاج داخل قشرة موحدة
                  </h1>
                  <p className="mt-3 max-w-4xl text-base leading-8 text-white/68 md:text-lg">
                    نفس نواة المنصة البصرية، لكن بنبرة تشغيلية مالية أوضح تناسب
                    التحليل والتوليد والتصدير ومراجعة التكاليف.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
                  <p className="text-xs text-white/42">حالة التحليل</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {restoringState
                      ? "جارٍ الاستعادة"
                      : generating || analyzing
                        ? "قيد المعالجة"
                        : analysis
                          ? "جاهز"
                          : "غير منفذ"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
                  <p className="text-xs text-white/42">إجمالي البنود</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {totalLineItems}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4 col-span-2 md:col-span-1">
                  <p className="text-xs text-white/42">الإجمالي الحالي</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {budget
                      ? formatCurrency(budget.grandTotal, budget.currency)
                      : "—"}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4 col-span-2 md:col-span-1">
                  <p className="text-xs text-white/42">مصدر التوليد</p>
                  <p className="mt-2 text-lg font-semibold text-white">
                    {runtimeMeta?.source === "fallback"
                      ? "وضع الاستمرارية"
                      : runtimeMeta?.source === "ai"
                        ? "ذكاء اصطناعي مباشر"
                        : "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardSpotlight>

          {error ? (
            <div
              data-testid="budget-error-alert"
              className="flex items-start gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-100"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          {runtimeMeta?.source === "fallback" ? (
            <div
              data-testid="budget-fallback-banner"
              className="rounded-2xl border border-amber-400/25 bg-amber-400/10 p-4 text-sm text-amber-100"
            >
              تم إنشاء النتيجة عبر وضع الاستمرارية المحلي لأن مزود الذكاء
              الاصطناعي غير متاح حاليًا.
            </div>
          ) : null}

          <div className="grid gap-6 lg:grid-cols-[1.1fr,0.9fr]">
            <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
              <Card className="border-0 bg-transparent shadow-none">
                <CardHeader>
                  <CardTitle className="text-white">مدخلات المشروع</CardTitle>
                  <CardDescription className="text-white/52">
                    استخدم نفس السيناريو لتحليل المخاطر والتوصيات ثم إنشاء
                    الميزانية الفعلية.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="budget-title">عنوان المشروع</Label>
                    <Input
                      id="budget-title"
                      data-testid="budget-title-input"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      placeholder="مثال: مطاردة في القاهرة"
                      className="border-white/10 bg-black/20"
                      dir="rtl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="budget-scenario">
                      السيناريو أو الوصف الإنتاجي
                    </Label>
                    <Textarea
                      id="budget-scenario"
                      data-testid="budget-scenario-input"
                      value={scenario}
                      onChange={(event) => setScenario(event.target.value)}
                      placeholder="اكتب السيناريو أو وصفًا إنتاجيًا مفصلًا يتضمن المواقع، الأيام، الشخصيات، ومتطلبات التصوير."
                      rows={16}
                      className="border-white/10 bg-black/20 font-mono"
                      dir="rtl"
                    />
                  </div>

                  <div className="flex flex-col gap-3 md:flex-row">
                    <Button
                      onClick={handleAnalyze}
                      data-testid="budget-analyze-button"
                      disabled={analyzing || generating || restoringState}
                      className="gap-2"
                      variant="secondary"
                    >
                      {analyzing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSearch className="h-4 w-4" />
                      )}
                      تحليل السيناريو
                    </Button>
                    <Button
                      onClick={handleGenerate}
                      data-testid="budget-generate-button"
                      disabled={generating || analyzing || restoringState}
                      className="gap-2 bg-emerald-600 hover:bg-emerald-500"
                    >
                      {generating ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4" />
                      )}
                      إنشاء الميزانية
                    </Button>
                    <Button
                      onClick={handleExport}
                      data-testid="budget-export-button"
                      disabled={!budget || exporting || restoringState}
                      variant="outline"
                      className="gap-2 border-white/10 bg-black/18"
                    >
                      {exporting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      تصدير Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </CardSpotlight>

            <div className="space-y-6">
              <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
                <Card className="border-0 bg-transparent shadow-none">
                  <CardHeader>
                    <CardTitle className="text-white">ملخص التحليل</CardTitle>
                    <CardDescription className="text-white/52">
                      ناتج `/api/budget/analyze`
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {analysis ? (
                      <>
                        <p className="text-sm leading-7 text-white/82">
                          {analysis.summary}
                        </p>
                        <div className="grid gap-4 md:grid-cols-2">
                          <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
                            <p className="text-xs text-white/42">
                              أيام التصوير
                            </p>
                            <p className="mt-2 text-2xl font-semibold text-white">
                              {analysis.shootingSchedule.totalDays}
                            </p>
                          </div>
                          <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
                            <p className="text-xs text-white/42">
                              التقسيم المرحلي
                            </p>
                            <p className="mt-2 text-sm leading-7 text-white/82">
                              ما قبل الإنتاج{" "}
                              {analysis.shootingSchedule.phases.preProduction}{" "}
                              يوم
                              <br />
                              الإنتاج{" "}
                              {analysis.shootingSchedule.phases.production} يوم
                              <br />
                              ما بعد الإنتاج{" "}
                              {
                                analysis.shootingSchedule.phases.postProduction
                              }{" "}
                              يوم
                            </p>
                          </div>
                        </div>
                        <div className="grid gap-4">
                          <SectionList
                            title="التوصيات"
                            items={analysis.recommendations}
                          />
                          <SectionList
                            title="عوامل المخاطر"
                            items={analysis.riskFactors}
                          />
                          <SectionList
                            title="فرص خفض التكلفة"
                            items={analysis.costOptimization}
                          />
                        </div>
                      </>
                    ) : (
                      <p
                        data-testid="budget-analysis-empty"
                        className="text-sm text-white/52"
                      >
                        لم يُنفذ التحليل بعد.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </CardSpotlight>

              <CardSpotlight className="overflow-hidden rounded-[32px] border border-[var(--page-border)] bg-black/24 shadow-[0_20px_80px_rgba(0,0,0,0.32)] backdrop-blur-2xl">
                <Card className="border-0 bg-transparent shadow-none">
                  <CardHeader>
                    <CardTitle className="text-white">ملخص الميزانية</CardTitle>
                    <CardDescription className="text-white/52">
                      ناتج `/api/budget/generate`
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {budget ? (
                      <>
                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                          <p className="text-xs text-emerald-200">
                            الإجمالي الكلي
                          </p>
                          <p
                            data-testid="budget-grand-total"
                            className="mt-2 text-3xl font-bold text-white"
                          >
                            {formatCurrency(budget.grandTotal, budget.currency)}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4 text-sm text-white/68">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <span>
                              {runtimeMeta?.source === "fallback"
                                ? "المسار المستخدم: وضع الاستمرارية المحلي"
                                : "المسار المستخدم: مزود الذكاء الاصطناعي"}
                            </span>
                            <span data-testid="budget-persisted-at">
                              {persistedAt
                                ? `آخر حفظ: ${new Date(
                                    persistedAt
                                  ).toLocaleString("ar-EG")}`
                                : "لم يُسجل حفظ بعد"}
                            </span>
                          </div>
                        </div>

                        <div className="space-y-3">
                          {budget.sections.map((section) => (
                            <div
                              key={section.id}
                              className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4"
                            >
                              <div className="flex items-center justify-between gap-4">
                                <div>
                                  <p className="font-semibold text-white">
                                    {section.name}
                                  </p>
                                  <p className="text-xs text-white/45">
                                    {section.categories.length} فئة
                                  </p>
                                </div>
                                <p className="text-sm font-semibold text-white">
                                  {formatCurrency(
                                    section.total,
                                    budget.currency
                                  )}
                                </p>
                              </div>
                              <div className="mt-4 space-y-3">
                                {section.categories.map((category) => (
                                  <div
                                    key={category.code}
                                    className="space-y-2"
                                  >
                                    <div className="flex items-center justify-between gap-4 text-sm">
                                      <span className="text-white/82">
                                        {category.name}
                                      </span>
                                      <span className="text-white/52">
                                        {formatCurrency(
                                          category.total,
                                          budget.currency
                                        )}
                                      </span>
                                    </div>
                                    <div className="space-y-1 text-xs text-white/42">
                                      {category.items
                                        .slice(0, 3)
                                        .map((item) => (
                                          <div
                                            key={item.code}
                                            className="flex items-center justify-between gap-3"
                                          >
                                            <span>{item.description}</span>
                                            <span>
                                              {formatCurrency(
                                                item.total,
                                                budget.currency
                                              )}
                                            </span>
                                          </div>
                                        ))}
                                      {category.items.length > 3 ? (
                                        <div className="text-white/35">
                                          + {category.items.length - 3} بنود
                                          أخرى
                                        </div>
                                      ) : null}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p
                        data-testid="budget-summary-empty"
                        className="text-sm text-white/52"
                      >
                        لم تُنشأ الميزانية بعد.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </CardSpotlight>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.04]/6 p-4">
      <p className="mb-3 text-sm font-semibold text-white">{title}</p>
      {items.length ? (
        <ul className="space-y-2 text-sm text-white/68">
          {items.map((item) => (
            <li key={`${title}-${item}`} className="leading-6">
              • {item}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-white/45">لا توجد عناصر متاحة.</p>
      )}
    </div>
  );
}
