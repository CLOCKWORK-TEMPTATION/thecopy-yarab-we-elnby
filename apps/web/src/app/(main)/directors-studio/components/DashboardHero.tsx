"use client";

/**
 * الصفحة: directors-studio / DashboardHero
 * الهوية: Hero سينمائي تنفيذي يعلن وظيفة الصفحة ويعطي نقاط دخول واضحة
 * المتغيرات الخاصة المضافة: تعتمد على متغيرات PageLayout المحقونة أعلى الشجرة
 * مكونات Aceternity المستخدمة: CardSpotlight
 */

import { useCallback } from "react";
import { Film, Upload, Sparkles } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import ProjectManager from "@/app/(main)/directors-studio/components/ProjectManager";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

const SCRIPT_UPLOAD_TEST_ID = '[data-testid="card-script-upload"]';

export default function DashboardHero() {
  const scrollToUpload = useCallback(() => {
    const uploadElement = document.querySelector(SCRIPT_UPLOAD_TEST_ID);
    if (uploadElement) {
      uploadElement.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  return (
    <div className="relative h-[420px] overflow-hidden rounded-[28px]">
      <Image
        src="/directors-studio/Film_production_hero_image_6b2179d4.png"
        alt="Film production hero - خلفية الإنتاج السينمائي"
        fill
        priority
        sizes="100vw"
        className="object-cover object-center"
        quality={85}
      />

      <div className="absolute inset-0 bg-gradient-to-l from-black/88 via-black/62 to-black/34" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(116,104,66,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(2,151,132,0.18),transparent_34%)]" />

      <div className="relative h-full flex flex-col justify-center items-end px-6 py-8 text-white md:px-12">
        <CardSpotlight className="w-full max-w-3xl overflow-hidden rounded-[26px] border border-white/10 bg-black/24 p-6 backdrop-blur-xl md:p-8">
          <div className="space-y-6 text-right">
            <div className="flex items-center justify-end gap-3">
              <h1 className="text-4xl font-bold leading-tight md:text-5xl">
                مساعد الإخراج السينمائي
              </h1>
              <Film className="h-11 w-11 text-[var(--page-accent)]" />
            </div>

            <p className="max-w-2xl text-base leading-8 text-white/84 md:text-xl">
              قشرة تنفيذية موحدة داخل المنصة، تمنحك وصولًا واضحًا إلى إدارة
              المشاريع، رفع السيناريو، والمساعد الذكي دون فقدان الطابع
              السينمائي.
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                <p className="text-xs text-white/45">الطابع</p>
                <p className="mt-2 text-sm font-medium text-white/90">
                  Executive Cinematic
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                <p className="text-xs text-white/45">الأولوية</p>
                <p className="mt-2 text-sm font-medium text-white/90">
                  إدارة المشروع والسيناريو
                </p>
              </div>
              <div className="rounded-2xl border border-white/8 bg-white/6 p-4">
                <p className="text-xs text-white/45">الهوية</p>
                <p className="mt-2 text-sm font-medium text-white/90">
                  متسقة مع نواة المنصة
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-end pt-2">
              <ProjectManager />

              <button
                type="button"
                onClick={scrollToUpload}
                data-testid="button-new-project"
                className="inline-flex items-center justify-center rounded-full border border-white/16 bg-white/10 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/14"
              >
                <Upload className="ml-2 h-4 w-4" />
                تحميل سيناريو جديد
              </button>

              <Link
                href="/directors-studio/ai-assistant"
                data-testid="button-ai-assistant"
                className="inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-medium text-white shadow-[0_8px_30px_rgba(0,0,0,0.24)] transition hover:translate-y-[-1px]"
                style={{
                  background:
                    "linear-gradient(135deg,var(--page-accent),var(--page-accent-2))",
                }}
              >
                <Sparkles className="ml-2 h-4 w-4" />
                بدء المساعد الذكي
              </Link>
            </div>
          </div>
        </CardSpotlight>
      </div>
    </div>
  );
}
