"use client";

/**
 * نظرة عامة لمدير النظام — Admin Overview
 *
 * @description
 * تعرض ملخصاً تنفيذياً لعدد المشاريع والموردين والمستخدمين
 * مع روابط سريعة للأقسام الإدارية الأساسية.
 *
 * السبب: مدير النظام يحتاج نقطة بداية موحّدة ترسم له الصورة العامة
 * قبل الغوص في أي عملية CRUD تفصيلية، لذا تُجمع الإحصائيات هنا.
 */

import { api, type Vendor } from "@the-copy/breakapp";
import { AxiosError } from "axios";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

interface AdminProject {
  id: string;
  name: string;
  directorUserId: string;
  createdAt: string;
}

interface Stats {
  projects: number | null;
  vendors: number | null;
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<Stats>({
    projects: null,
    vendors: null,
  });
  const [loading, setLoading] = useState<boolean>(true);

  const fetchStats = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const [projectsRes, vendorsRes] = await Promise.all([
        api.get<AdminProject[]>("/admin/projects"),
        api.get<Vendor[]>("/admin/vendors"),
      ]);
      setStats({
        projects: projectsRes.data.length,
        vendors: vendorsRes.data.length,
      });
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في تحميل الإحصائيات",
        description: axiosError.message || "تعذّر جلب البيانات الإدارية",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStats();
  }, [fetchStats]);

  const statCards = useMemo(
    () => [
      {
        key: "projects",
        label: "المشاريع",
        value: stats.projects,
        href: "/BREAKAPP/admin/projects",
      },
      {
        key: "vendors",
        label: "الموردون",
        value: stats.vendors,
        href: "/BREAKAPP/admin/vendors",
      },
      {
        key: "users",
        label: "الأعضاء",
        value: null,
        href: "/BREAKAPP/admin/users",
      },
    ],
    [stats]
  );

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              نظرة عامة — مدير النظام
            </h1>
            <p className="text-white/55 font-cairo">
              ملخّص سريع للمشاريع والموردين والأعضاء
            </p>
          </div>
          <Link
            href="/BREAKAPP/dashboard"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة للوحة التحكم
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {statCards.map((card) => (
            <CardSpotlight
              key={card.key}
              className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6"
            >
              <p className="text-sm text-white/55 font-cairo mb-2">
                {card.label}
              </p>
              <p className="text-4xl font-bold text-white font-cairo">
                {loading
                  ? "…"
                  : card.value === null
                    ? "—"
                    : card.value.toString()}
              </p>
              <Link
                href={card.href}
                className="mt-4 inline-block text-sm text-white/85 hover:text-white font-cairo transition"
              >
                فتح القسم ←
              </Link>
            </CardSpotlight>
          ))}
        </div>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            روابط سريعة
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Link
              href="/BREAKAPP/admin/projects/new"
              className="px-4 py-3 text-sm bg-white/8 text-white hover:bg-white/12 transition font-cairo rounded-[22px] border border-white/8"
            >
              إنشاء مشروع جديد
            </Link>
            <Link
              href="/BREAKAPP/admin/projects"
              className="px-4 py-3 text-sm bg-white/8 text-white hover:bg-white/12 transition font-cairo rounded-[22px] border border-white/8"
            >
              كل المشاريع ورموز QR
            </Link>
            <Link
              href="/BREAKAPP/admin/vendors"
              className="px-4 py-3 text-sm bg-white/8 text-white hover:bg-white/12 transition font-cairo rounded-[22px] border border-white/8"
            >
              إدارة الموردين
            </Link>
            <Link
              href="/BREAKAPP/admin/users"
              className="px-4 py-3 text-sm bg-white/8 text-white hover:bg-white/12 transition font-cairo rounded-[22px] border border-white/8"
            >
              أعضاء المشاريع
            </Link>
          </div>
        </CardSpotlight>
      </div>
    </div>
  );
}
