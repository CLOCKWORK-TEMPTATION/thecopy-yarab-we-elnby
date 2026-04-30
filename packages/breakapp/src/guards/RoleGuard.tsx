"use client";

/**
 * RoleGuard — حماية مسارات حسب الدور
 *
 * @description
 * يتحقق من أن المستخدم المُصادق عليه يملك أحد الأدوار المسموح بها
 * قبل عرض المحتوى. يُوجِّه المستخدمين غير المصرح لهم إلى مسارهم الافتراضي،
 * وغير المصادقين إلى صفحة تسجيل الدخول.
 *
 * السبب: الحماية المعتمدة على `(authenticated)` layout فقط لا تمنع عضو
 * طاقم من فتح صفحة مخرج — نحتاج طبقة إضافية تفحص الدور نفسه.
 */

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ensureAuthenticated } from "../lib/auth";
import { getDefaultRedirect, isValidRole, type UserRole } from "../lib/roles";

export interface RoleGuardProps {
  /** قائمة الأدوار المسموح لها برؤية المحتوى */
  allowedRoles: readonly UserRole[];
  /** المحتوى المحمي */
  children: ReactNode;
  /** مسار تسجيل الدخول الافتراضي */
  loginPath?: string;
  /** عنصر اختياري يُعرض أثناء التحقق (افتراضي: شاشة تحميل بسيطة) */
  fallback?: ReactNode;
}

export function RoleGuard({
  allowedRoles,
  children,
  loginPath = "/BREAKAPP/login/qr",
  fallback,
}: RoleGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"checking" | "authorized">("checking");

  useEffect(() => {
    let cancelled = false;

    const verifyAccess = async () => {
      const user = await ensureAuthenticated();
      if (cancelled) return;

      if (!user || !isValidRole(user.role)) {
        router.replace(loginPath);
        return;
      }

      const role = user.role as UserRole;
      if (!allowedRoles.includes(role)) {
        router.replace(getDefaultRedirect(role));
        return;
      }

      setStatus("authorized");
    };

    void verifyAccess();

    return () => {
      cancelled = true;
    };
  }, [router, allowedRoles, loginPath]);

  if (status === "checking") {
    return (
      fallback ?? (
        <div className="min-h-screen flex items-center justify-center bg-black/8 backdrop-blur-xl">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white/40 mb-4" />
            <p className="text-white/55 font-cairo">
              جارٍ التحقق من الصلاحية...
            </p>
          </div>
        </div>
      )
    );
  }

  return <>{children}</>;
}

/**
 * مصنع سريع لإنشاء layout محمي لدور معين
 *
 * @example
 * ```tsx
 * const DirectorGuard = createRoleGuard(["director", "admin"]);
 * export default function DirectorLayout({ children }) {
 *   return <DirectorGuard>{children}</DirectorGuard>;
 * }
 * ```
 */
export function createRoleGuard(allowedRoles: readonly UserRole[]) {
  return function GeneratedRoleGuard({ children }: { children: ReactNode }) {
    return <RoleGuard allowedRoles={allowedRoles}>{children}</RoleGuard>;
  };
}
