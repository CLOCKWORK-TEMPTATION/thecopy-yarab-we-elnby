'use client';

/**
 * الإطار الموحّد لصفحات BREAKAPP — AppShell
 *
 * @description
 * يُوفّر هيكلاً ثابتاً لجميع صفحات BREAKAPP يحتوي على:
 *   - topbar علوي يحمل العنوان، شارة الدور، ومؤشر الاتصال
 *   - sidebar جانبي أيمن (اتجاه RTL) يعرض روابط تنقّل اختيارية
 *   - منطقة محتوى رئيسية ديسكتوب-first بدون أي media queries
 *   - تسجيل useAuthRefresh مرة واحدة لكل التطبيق
 *
 * القيود المعمارية:
 *   - لا mobile fallback، لا stacked layout، لا breakpoint-driven repositioning
 *   - لا تعتمد على مكوّنات من apps/web — Tailwind خام فقط
 *   - RTL بـ dir="rtl" و font-cairo (صنف CSS عالمي من المنصة)
 *
 * السبب: توحيد الهوية البصرية عبر جميع صفحات BREAKAPP وتقليل تكرار إعداد
 * المؤشر والجلسة في كل صفحة على حدة.
 */

import { useCallback, type ReactElement, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthRefresh } from '../hooks/useAuthRefresh';
import { useCurrentUser } from '../hooks/useCurrentUser';
import { ConnectionIndicator } from './ConnectionIndicator';
import { getRoleLabel } from '../lib/roles';
import { logout as performLogout } from '../lib/auth';

/**
 * عنصر تنقّل واحد داخل الـ sidebar
 */
export interface AppShellNavItem {
  /** نص الرابط المرئي */
  label: string;
  /** المسار الداخلي (Next.js route) */
  href: string;
  /** أيقونة اختيارية كعنصر React */
  icon?: ReactNode;
  /** هل الرابط نشط حالياً (تحدده الصفحة المستهلِكة) */
  active?: boolean;
}

/**
 * خصائص AppShell
 */
export interface AppShellProps {
  /** عنوان الصفحة الحالية (يظهر في topbar) */
  title?: string;
  /** محتوى الصفحة */
  children: ReactNode;
  /** عناصر الـ sidebar. إن كانت undefined يُخفى الشريط الجانبي كلياً */
  sidebarItems?: readonly AppShellNavItem[];
  /** مسار شاشة الدخول عند انتهاء الجلسة */
  loginPath?: string;
  /** إظهار زر تسجيل الخروج في topbar (افتراضياً true) */
  showLogout?: boolean;
}

/**
 * الإطار الموحّد لصفحات BREAKAPP
 *
 * @param props - خصائص الإطار
 */
export function AppShell({
  title,
  children,
  sidebarItems,
  loginPath = '/BREAKAPP/login/qr',
  showLogout = true,
}: AppShellProps): ReactElement {
  const router = useRouter();
  const { user, loading } = useCurrentUser();

  /**
   * معالج انتهاء الجلسة — يُمرَّر لـ useAuthRefresh
   */
  const handleExpired = useCallback((): void => {
    router.replace(loginPath);
  }, [router, loginPath]);

  useAuthRefresh({ onExpired: handleExpired });

  /**
   * معالج تسجيل الخروج اليدوي
   */
  const handleLogout = useCallback(async (): Promise<void> => {
    await performLogout();
    router.replace(loginPath);
  }, [router, loginPath]);

  const roleLabel = user ? getRoleLabel(user.role) : null;
  const hasSidebar = sidebarItems !== undefined && sidebarItems.length > 0;

  return (
    <div
      dir="rtl"
      className="font-cairo min-h-screen w-full bg-[radial-gradient(ellipse_at_top,#0b1220_0%,#05070c_60%,#000_100%)] text-white/90"
    >
      {/* ── Topbar ─────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-white/10 bg-black/40 px-6 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <span className="inline-block h-2 w-2 rounded-full bg-gradient-to-br from-amber-300 to-amber-500 shadow-[0_0_10px_rgba(252,211,77,0.6)]" />
          <span className="text-sm font-semibold tracking-wide text-white/85">
            BREAKAPP
          </span>
        </div>

        {title && (
          <>
            <span className="h-4 w-px bg-white/15" aria-hidden="true" />
            <h1 className="truncate text-sm font-medium text-white/70">
              {title}
            </h1>
          </>
        )}

        <div className="mr-auto flex items-center gap-3">
          <ConnectionIndicator />
          {roleLabel && (
            <span className="inline-flex items-center rounded-full bg-white/5 px-3 py-1 text-xs font-medium text-white/80 ring-1 ring-white/10">
              {roleLabel}
            </span>
          )}
          {showLogout && user && (
            <button
              type="button"
              onClick={() => {
                void handleLogout();
              }}
              className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-200 ring-1 ring-red-400/30 transition hover:bg-red-500/25"
            >
              تسجيل الخروج
            </button>
          )}
          {loading && !user && (
            <span className="text-xs text-white/40">جارٍ التحميل…</span>
          )}
        </div>
      </header>

      {/* ── Body: sidebar + main ───────────────────────────────────────── */}
      <div className="flex min-h-[calc(100vh-3.5rem)] w-full">
        {hasSidebar && (
          <aside className="sticky top-14 h-[calc(100vh-3.5rem)] w-64 flex-shrink-0 border-l border-white/10 bg-black/25 px-4 py-6 backdrop-blur-xl">
            <nav className="flex flex-col gap-1" aria-label="تنقّل رئيسي">
              {sidebarItems.map((item) => (
                <a
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                    item.active
                      ? 'bg-white/10 text-white ring-1 ring-white/15'
                      : 'text-white/65 hover:bg-white/5 hover:text-white/90'
                  }`}
                  aria-current={item.active ? 'page' : undefined}
                >
                  {item.icon && (
                    <span className="flex h-4 w-4 items-center justify-center text-white/70">
                      {item.icon}
                    </span>
                  )}
                  <span>{item.label}</span>
                </a>
              ))}
            </nav>
          </aside>
        )}

        <main className="flex-1 overflow-x-auto px-8 py-8">{children}</main>
      </div>
    </div>
  );
}

export default AppShell;
