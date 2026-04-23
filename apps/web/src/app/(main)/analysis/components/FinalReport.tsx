"use client";

interface Props {
  report: string | null;
}

export function FinalReport({ report }: Props) {
  if (!report) return null;
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-right" dir="rtl">
      <h3 className="mb-3 text-base font-semibold text-white/90">التقرير النهائي</h3>
      <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-7 text-white/80">
        {report}
      </pre>
    </section>
  );
}
