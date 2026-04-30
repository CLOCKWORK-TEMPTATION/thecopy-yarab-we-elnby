import Link from "next/link";

export default function NotFound() {
  return (
    <main
      dir="rtl"
      className="relative isolate flex min-h-screen items-center justify-center bg-[#080b12] px-6 py-12 text-white"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,91,219,0.22),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(2,151,132,0.18),transparent_34%)]" />
      <section className="relative z-10 w-full max-w-xl rounded-[24px] border border-white/10 bg-white/[0.06] p-8 text-right shadow-[0_18px_80px_rgba(0,0,0,0.35)] backdrop-blur-2xl">
        <p className="text-xs font-semibold text-white/45">بوابة الدخول</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">
          المسار غير موجود داخل بوابة بريك آب
        </h1>
        <p className="mt-4 text-sm leading-7 text-white/68">
          الرابط المطلوب لا ينتمي إلى مسار تشغيل معروف داخل البوابة. استخدم نقطة
          الدخول الرسمية أو افتح تسجيل الدخول بالرمز.
        </p>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/BREAKAPP"
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90"
          >
            العودة إلى بوابة الدخول
          </Link>
          <Link
            href="/BREAKAPP/login/qr"
            className="rounded-xl border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            فتح تسجيل الدخول بالرمز
          </Link>
        </div>
      </section>
    </main>
  );
}
