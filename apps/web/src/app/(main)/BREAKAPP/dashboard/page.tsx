"use client";

/**
 * صفحة لوحة التحكم - Dashboard Page
 *
 * @description
 * الصفحة الرئيسية للمستخدم المُصادق عليه
 * تعرض معلومات المستخدم وروابط سريعة حسب الدور
 *
 * السبب: توفر نظرة عامة على حالة المستخدم والمشروع
 * مع توجيه سريع للأقسام المناسبة حسب دور المستخدم
 */

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  getCurrentUser,
  isAuthenticated,
  removeToken,
  type CurrentUser,
} from "@the-copy/breakapp";
import { toast } from "@/hooks/use-toast";
import { CardSpotlight } from "@/components/aceternity/card-spotlight";

const ConnectionTest = dynamic(
  () => import("@the-copy/breakapp/components/ConnectionTest"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[22px] border border-white/8 bg-white/[0.04] backdrop-blur-xl p-6 text-sm text-white/55">
        جارٍ تحميل حالة الاتصال...
      </div>
    ),
  }
);

/**
 * تعريف الروابط السريعة حسب الدور
 */
const ROLE_QUICK_LINKS: Record<
  string,
  Array<{ label: string; href: string; description: string; color: string }>
> = {
  director: [
    {
      label: "لوحة المخرج",
      href: "/BREAKAPP/director",
      description: "إدارة مواقع التصوير والموردين",
      color: "bg-white/8 text-white border-white/12",
    },
    {
      label: "قائمة الطعام",
      href: "/BREAKAPP/crew/menu",
      description: "عرض قائمة الطلبات",
      color: "bg-white/8 text-white border-white/12",
    },
  ],
  crew: [
    {
      label: "قائمة الطعام",
      href: "/BREAKAPP/crew/menu",
      description: "طلب الطعام من الموردين",
      color: "bg-white/8 text-white border-white/12",
    },
  ],
  runner: [
    {
      label: "تتبع التوصيل",
      href: "/BREAKAPP/runner/track",
      description: "إدارة مهام التوصيل",
      color: "bg-white/8 text-white border-white/12",
    },
  ],
};

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/BREAKAPP/login/qr");
      return;
    }

    const userData = getCurrentUser();
    setUser(userData);
  }, [router]);

  /**
   * تسجيل الخروج
   */
  const handleLogout = useCallback((): void => {
    removeToken();
    toast({
      title: "تم تسجيل الخروج",
      description: "تم إنهاء الجلسة بنجاح",
    });
    router.replace("/BREAKAPP/login/qr");
  }, [router]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/8 backdrop-blur-xl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white/40" />
      </div>
    );
  }

  const quickLinks = ROLE_QUICK_LINKS[user.role] || [];

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 backdrop-blur-xl">
      {/* شريط التنقل */}
      <nav className="bg-white/[0.04] backdrop-blur-xl border-b border-white/8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-white font-cairo">
                Break Break
              </h1>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 text-sm text-white/85 hover:text-white font-medium font-cairo transition"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>
      </nav>

      {/* المحتوى الرئيسي */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* بطاقة معلومات المستخدم */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <h2 className="text-2xl font-bold text-white mb-4 font-cairo">
            لوحة التحكم
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-white/6 rounded-[22px] border border-white/8">
              <p className="text-sm text-white/55 font-medium font-cairo">
                معرف المستخدم
              </p>
              <p className="text-white mt-1 font-mono text-xs">{user.userId}</p>
            </div>

            <div className="p-4 bg-white/6 rounded-[22px] border border-white/8">
              <p className="text-sm text-white/55 font-medium font-cairo">
                معرف المشروع
              </p>
              <p className="text-white mt-1 font-mono text-xs">
                {user.projectId}
              </p>
            </div>

            <div className="p-4 bg-white/6 rounded-[22px] border border-white/8">
              <p className="text-sm text-white/55 font-medium font-cairo">
                الدور
              </p>
              <p className="text-lg text-white mt-1 uppercase">{user.role}</p>
            </div>
          </div>
        </CardSpotlight>

        {/* روابط سريعة حسب الدور */}
        {quickLinks.length > 0 && (
          <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 font-cairo">
              وصول سريع
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickLinks.map((link) => (
                <button
                  key={link.href}
                  onClick={() => router.push(link.href)}
                  className={`p-4 border rounded-[22px] text-right hover:bg-white/8 transition-all ${link.color}`}
                >
                  <h4 className="font-semibold font-cairo">{link.label}</h4>
                  <p className="text-sm mt-1 opacity-80 font-cairo">
                    {link.description}
                  </p>
                </button>
              ))}
            </div>
          </CardSpotlight>
        )}

        {/* مكون اختبار الاتصال */}
        <div className="mb-6">
          <ConnectionTest />
        </div>

        {/* رسالة الترحيب */}
        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 font-cairo">
            مرحبًا بك في Break Break!
          </h3>
          <p className="text-white/85 font-cairo">
            تم المصادقة بنجاح باستخدام رمز QR. هذه هي لوحة التحكم الخاصة
            بمشروعك.
          </p>
        </CardSpotlight>
      </main>
    </div>
  );
}
