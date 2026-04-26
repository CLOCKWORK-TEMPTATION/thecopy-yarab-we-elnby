"use client";

/**
 * إنشاء مشروع جديد — New Admin Project
 *
 * @description
 * نموذج بسيط لإنشاء مشروع جديد باسم فقط، يُوجّه بعد النجاح
 * إلى قائمة المشاريع. التحقق يتم على العميل قبل POST.
 *
 * السبب: مدير النظام يفتح مشاريع بصورة متكررة ويحتاج مدخلاً
 * مبسّطاً يُنهي المهمة في خطوة واحدة دون حقول إضافية.
 */

import { api } from "@the-copy/breakapp";
import { AxiosError } from "axios";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

interface CreatedProject {
  id: string;
  name: string;
  createdAt: string;
}

export default function AdminNewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const handleNameChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      setName(event.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();
      const trimmed = name.trim();
      if (trimmed.length < 2) {
        toast({
          title: "الاسم قصير",
          description: "يجب أن يكون اسم المشروع حرفين على الأقل",
          variant: "destructive",
        });
        return;
      }

      setSubmitting(true);
      try {
        await api.post<CreatedProject>("/admin/projects", { name: trimmed });
        toast({
          title: "تم الإنشاء",
          description: "تم إنشاء المشروع بنجاح",
        });
        router.push("/BREAKAPP/admin/projects");
      } catch (error: unknown) {
        const axiosError = error as AxiosError;
        toast({
          title: "فشل الإنشاء",
          description: axiosError.message || "تعذّر إنشاء المشروع، حاول مجدداً",
          variant: "destructive",
        });
      } finally {
        setSubmitting(false);
      }
    },
    [name, router]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              مشروع جديد
            </h1>
            <p className="text-white/55 font-cairo">أدخل اسم المشروع لإنشائه</p>
          </div>
          <Link
            href="/BREAKAPP/admin/projects"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة
          </Link>
        </div>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <form onSubmit={handleSubmit}>
            <label className="block text-sm font-medium text-white mb-2 font-cairo">
              اسم المشروع
            </label>
            <input
              type="text"
              value={name}
              onChange={handleNameChange}
              placeholder="مثال: فيلم الصحراء"
              disabled={submitting}
              className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white placeholder-white/45 focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
              minLength={2}
              required
            />

            <button
              type="submit"
              disabled={submitting || name.trim().length < 2}
              className="mt-4 px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition"
            >
              {submitting ? "جارٍ الإنشاء..." : "إنشاء المشروع"}
            </button>
          </form>
        </CardSpotlight>
      </div>
    </div>
  );
}
