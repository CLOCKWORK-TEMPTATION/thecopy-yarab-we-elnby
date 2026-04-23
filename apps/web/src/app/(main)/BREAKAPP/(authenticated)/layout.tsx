"use client";

/**
 * تخطيط الصفحات المحمية — Authentication Guard
 *
 * @description
 * يتحقق من مصادقة المستخدم قبل عرض أي صفحة محمية
 * ويُوجّه غير المصادقين لصفحة تسجيل الدخول تلقائياً.
 *
 * السبب: حماية مركزية للمصادقة. أما فحص الدور (director/crew/...)
 * فيتم في layouts فرعية باستخدام RoleGuard من @the-copy/breakapp.
 */

import { getCurrentUser, isAuthenticated, type CurrentUser } from "@the-copy/breakapp";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace("/BREAKAPP/login/qr");
      return;
    }

    const userData = getCurrentUser();
    if (!userData) {
      router.replace("/BREAKAPP/login/qr");
      return;
    }

    setUser(userData);
    setChecking(false);
  }, [router]);

  if (checking || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/8 backdrop-blur-xl">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white/40 mb-4" />
          <p className="text-white/55 font-cairo">جارٍ التحقق من المصادقة...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
