"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewBriefPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    body: "",
    audienceProfile: "",
    constraints: "",
    creativeSeed: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const briefRes = await fetch("/api/brainstorm/briefs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify(form),
      });

      const briefData = (await briefRes.json()) as {
        success: boolean;
        data?: { id: string };
        error?: string;
      };

      if (!briefRes.ok || !briefData.success || !briefData.data) {
        throw new Error(briefData.error ?? "فشل إنشاء الـ brief");
      }

      const sessionRes = await fetch("/api/brainstorm/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ briefId: briefData.data.id }),
      });

      const sessionData = (await sessionRes.json()) as {
        success: boolean;
        data?: { session?: { id: string } };
        error?: string;
      };

      if (
        !sessionRes.ok ||
        !sessionData.success ||
        !sessionData.data?.session
      ) {
        throw new Error(sessionData.error ?? "فشل إنشاء الجلسة");
      }

      router.push(`/brain-storm-ai/sessions/${sessionData.data.session.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main
      dir="rtl"
      className="min-h-screen bg-black/90 p-6"
      data-testid="new-brief-page"
    >
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">brief جديد</h1>
          <p className="text-white/50 mt-1 text-sm">
            ابدأ جلسة عصف ذهني بإنشاء brief إبداعي
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              عنوان المشروع *
            </label>
            <input
              id="title"
              data-testid="brief-title"
              required
              value={form.title}
              onChange={(e) =>
                setForm((f) => ({ ...f, title: e.target.value }))
              }
              className="w-full rounded-xl bg-white/8 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 text-sm"
              placeholder="مثال: مسلسل درامي عائلي عن الهوية"
            />
          </div>

          <div>
            <label
              htmlFor="body"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              الفكرة الأولية / البذرة الإبداعية *
            </label>
            <textarea
              id="body"
              data-testid="brief-body"
              required
              rows={5}
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              className="w-full rounded-xl bg-white/8 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 text-sm resize-none"
              placeholder="صف الفكرة الأساسية، الثيمة، الجو العام، أي بذرة إبداعية..."
            />
          </div>

          <div>
            <label
              htmlFor="audienceProfile"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              الجمهور المستهدف
            </label>
            <input
              id="audienceProfile"
              data-testid="brief-audience"
              value={form.audienceProfile}
              onChange={(e) =>
                setForm((f) => ({ ...f, audienceProfile: e.target.value }))
              }
              className="w-full rounded-xl bg-white/8 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 text-sm"
              placeholder="مثال: عائلة خليجية 25-45"
            />
          </div>

          <div>
            <label
              htmlFor="constraints"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              القيود والمحددات
            </label>
            <input
              id="constraints"
              data-testid="brief-constraints"
              value={form.constraints}
              onChange={(e) =>
                setForm((f) => ({ ...f, constraints: e.target.value }))
              }
              className="w-full rounded-xl bg-white/8 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 text-sm"
              placeholder="مثال: بدون عنف مرئي، 30 حلقة، إنتاج خليجي"
            />
          </div>

          <div>
            <label
              htmlFor="creativeSeed"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              بذرة إبداعية إضافية
            </label>
            <input
              id="creativeSeed"
              data-testid="brief-seed"
              value={form.creativeSeed}
              onChange={(e) =>
                setForm((f) => ({ ...f, creativeSeed: e.target.value }))
              }
              className="w-full rounded-xl bg-white/8 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-blue-500/60 text-sm"
              placeholder="صورة، مقطع موسيقي، كلمة واحدة تلهمك..."
            />
          </div>

          {error && (
            <div
              role="alert"
              className="rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            data-testid="submit-brief"
            className="w-full rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-white font-medium text-sm transition-colors"
          >
            {isSubmitting ? "جاري الإنشاء..." : "ابدأ جلسة العصف الذهني"}
          </button>
        </form>
      </div>
    </main>
  );
}
