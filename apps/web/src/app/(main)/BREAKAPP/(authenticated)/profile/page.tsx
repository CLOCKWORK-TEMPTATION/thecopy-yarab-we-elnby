"use client";

/**
 * الملف الشخصي — User Profile
 *
 * @description
 * يعرض بيانات المستخدم الحالي (الدور والمشروع والمعرّف)
 * مع خيار تسجيل الخروج من كل الأجهزة واختيار لغة الواجهة محلياً.
 *
 * السبب: أي مستخدم بأي دور يحتاج شاشة بسيطة لرؤية صلاحياته
 * وإنهاء الجلسة بشكل آمن من مكان موحّد.
 */

import {
  api,
  getCurrentUser,
  getRoleLabel,
  removeToken,
  type CurrentUser,
} from "@the-copy/breakapp";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

type UiLanguage = "ar" | "en";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [language, setLanguage] = useState<UiLanguage>("ar");
  const [loggingOut, setLoggingOut] = useState<boolean>(false);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  const handleLanguageChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      const next = event.target.value;
      if (next === "ar" || next === "en") {
        setLanguage(next);
      }
    },
    []
  );

  const handleLogout = useCallback(async (): Promise<void> => {
    const confirmed = window.confirm(
      "سيتم تسجيل الخروج من كل الأجهزة. هل تريد المتابعة؟"
    );
    if (!confirmed) {
      return;
    }
    setLoggingOut(true);
    try {
      await api.post("/auth/logout", {});
      toast({
        title: "تم تسجيل الخروج",
        description: "انتهت الجلسة من كل الأجهزة",
      });
    } catch {
      toast({
        title: "تحذير",
        description:
          "تعذّر تأكيد الخادم، لكن تم مسح الجلسة محلياً على كل حال",
        variant: "destructive",
      });
    } finally {
      removeToken();
      setLoggingOut(false);
      router.replace("/BREAKAPP/login/qr");
    }
  }, [router]);

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              الملف الشخصي
            </h1>
            <p className="text-white/55 font-cairo">
              بيانات الجلسة والإعدادات
            </p>
          </div>
          <Link
            href="/BREAKAPP/dashboard"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة
          </Link>
        </div>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            الجلسة الحالية
          </h2>
          {!user ? (
            <p className="text-white/55 text-center py-6 font-cairo">
              لا توجد جلسة نشطة
            </p>
          ) : (
            <dl className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border border-white/8 rounded-[22px] bg-white/[0.02]">
                <dt className="text-xs text-white/45 font-cairo mb-1">
                  الدور
                </dt>
                <dd className="text-white font-cairo">
                  {getRoleLabel(user.role)}
                </dd>
              </div>
              <div className="p-4 border border-white/8 rounded-[22px] bg-white/[0.02]">
                <dt className="text-xs text-white/45 font-cairo mb-1">
                  معرّف المشروع
                </dt>
                <dd className="text-white font-mono text-sm break-all">
                  {user.projectId}
                </dd>
              </div>
              <div className="p-4 border border-white/8 rounded-[22px] bg-white/[0.02]">
                <dt className="text-xs text-white/45 font-cairo mb-1">
                  معرّف المستخدم
                </dt>
                <dd className="text-white font-mono text-sm break-all">
                  {user.userId}
                </dd>
              </div>
            </dl>
          )}
        </CardSpotlight>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            لغة الواجهة
          </h2>
          <label className="block text-sm font-medium text-white mb-2 font-cairo">
            اختر اللغة (محلي فقط)
          </label>
          <select
            value={language}
            onChange={handleLanguageChange}
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo"
          >
            <option value="ar" className="bg-black text-white">
              العربية
            </option>
            <option value="en" className="bg-black text-white">
              English
            </option>
          </select>
          <p className="text-xs text-white/45 mt-2 font-cairo">
            ملاحظة: الإعداد محفوظ في هذه الجلسة فقط — دعم i18n كامل خارج نطاق
            هذه الجولة.
          </p>
        </CardSpotlight>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            الجلسة
          </h2>
          <p className="text-sm text-white/55 font-cairo mb-4">
            هذا الإجراء سيُنهي جلستك على كل الأجهزة المرتبطة بهذا الحساب.
          </p>
          <button
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="px-6 py-2 bg-white/8 text-white rounded-[22px] hover:bg-white/12 disabled:bg-white/4 disabled:cursor-not-allowed font-cairo transition border border-white/12"
          >
            {loggingOut
              ? "جارٍ تسجيل الخروج..."
              : "تسجيل الخروج من كل الأجهزة"}
          </button>
        </CardSpotlight>
      </div>
    </div>
  );
}
