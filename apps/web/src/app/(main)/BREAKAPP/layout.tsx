import { Toaster } from "@/components/ui/toaster";

/**
 * تخطيط BREAKAPP الرئيسي
 *
 * @description
 * يوفر الهيكل الأساسي لجميع صفحات BREAKAPP
 * ويتضمن مزود الإشعارات (Toaster) ومؤشر الاتصال ودعم RTL
 *
 * السبب: توحيد تجربة المستخدم عبر جميع صفحات التطبيق
 * مع ضمان عمل نظام الإشعارات ومؤشر الاتصال في كل مكان
 */

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Break Break — إدارة الإنتاج الميداني",
  description:
    "تطبيق إدارة الإنتاج السينمائي الميداني — مصادقة QR، تتبع GPS، طلبات الطعام، تنسيق الطاقم",
  keywords: ["إنتاج سينمائي", "إدارة ميدانية", "QR", "GPS", "تتبع", "طاقم"],
  openGraph: {
    title: "Break Break — إدارة الإنتاج الميداني",
    description: "تطبيق إدارة الإنتاج السينمائي الميداني",
    type: "website",
  },
};

export default function BREAKAPPLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div dir="rtl" className="font-cairo min-h-screen">
      {children}
      <Toaster />
    </div>
  );
}
