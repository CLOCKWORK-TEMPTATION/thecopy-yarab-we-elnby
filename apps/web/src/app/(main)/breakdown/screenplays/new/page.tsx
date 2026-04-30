"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export default function NewScreenplayPage() {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [title, setTitle] = useState("");
  const [scriptContent, setScriptContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!scriptContent.trim()) {
      setError("نص السيناريو مطلوب");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/breakdown/screenplays", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ title, scriptContent }),
      });

      const payload = (await res.json()) as {
        success: boolean;
        data?: { projectId: string };
        error?: string;
      };

      if (!res.ok || !payload.success || !payload.data) {
        throw new Error(payload.error ?? "فشل رفع السيناريو");
      }

      router.push(`/breakdown/sessions/${payload.data.projectId}`);
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
      data-testid="new-screenplay-page"
    >
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">سيناريو جديد</h1>
          <p className="text-white/50 mt-1 text-sm">
            ارفع نص السيناريو لبدء جلسة Breakdown
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              عنوان السيناريو
            </label>
            <input
              id="title"
              data-testid="screenplay-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl bg-white/8 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/60 text-sm"
              placeholder="مثال: فيلم الغريب"
            />
          </div>

          <div>
            <label
              htmlFor="script"
              className="block text-sm font-medium text-white/70 mb-1.5"
            >
              نص السيناريو *
            </label>
            <textarea
              id="script"
              ref={textareaRef}
              data-testid="screenplay-content"
              required
              rows={16}
              value={scriptContent}
              onChange={(e) => setScriptContent(e.target.value)}
              dir="rtl"
              className="w-full rounded-xl bg-white/8 border border-white/15 px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-amber-500/60 text-sm resize-y font-mono leading-relaxed"
              placeholder={`مثال:
مشهد 1 - داخلي - شقة سمر - ليلاً

تجلس سمر (28) أمام الكمبيوتر. الغرفة مضاءة بضوء الشاشة فقط.

سمر
(لنفسها)
لازم أنتهي من التقرير هذه الليلة.

يرن جرس الباب.
              `}
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
            data-testid="submit-screenplay"
            className="w-full rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 text-white font-medium text-sm transition-colors"
          >
            {isSubmitting ? "جاري الرفع والتحليل..." : "ارفع وابدأ التفكيك"}
          </button>
        </form>
      </div>
    </main>
  );
}
