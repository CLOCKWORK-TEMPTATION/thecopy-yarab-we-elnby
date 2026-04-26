"use client";

/**
 * قائمة المشاريع — Admin Projects List
 *
 * @description
 * تعرض كل المشاريع المسجّلة مع مدخل سريع لإنشاء مشروع جديد
 * ومدخل آخر لتوليد رموز QR لكل مشروع.
 *
 * السبب: المشاريع هي الحاوية الرئيسية التي تنتمي إليها
 * الأدوار وأعضاء الفريق، لذا يحتاج مدير النظام جدولاً
 * مباشراً يفتح منه مسار الدعوة أو الإدارة.
 */

import { api } from "@the-copy/breakapp";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { CardSpotlight } from "@/components/aceternity/card-spotlight";
import { toast } from "@/hooks/use-toast";

interface AdminProject {
  id: string;
  name: string;
  directorUserId: string;
  createdAt: string;
}

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchProjects = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const response = await api.get<AdminProject[]>("/admin/projects");
      setProjects(response.data);
    } catch (error: unknown) {
      const axiosError = error as { message?: string };
      toast({
        title: "خطأ في جلب المشاريع",
        description: axiosError.message ?? "تعذّر تحميل المشاريع",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              المشاريع
            </h1>
            <p className="text-white/55 font-cairo">
              قائمة المشاريع وإدارة رموز الدعوة
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/BREAKAPP/admin"
              className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
            >
              العودة
            </Link>
            <Link
              href="/BREAKAPP/admin/projects/new"
              className="px-4 py-2 text-sm bg-white/8 text-white hover:bg-white/12 transition font-cairo rounded-[22px] border border-white/12"
            >
              إنشاء مشروع جديد
            </Link>
          </div>
        </div>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
            </div>
          ) : projects.length === 0 ? (
            <p className="text-white/55 text-center py-8 font-cairo">
              لا توجد مشاريع حالياً
            </p>
          ) : (
            <div className="space-y-3">
              {projects.map((project: AdminProject) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-white/8 rounded-[22px] bg-white/[0.02]"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-white font-cairo">
                      {project.name}
                    </h3>
                    <p className="text-xs text-white/45 mt-1">
                      معرّف المشروع: {project.id}
                    </p>
                    <p className="text-xs text-white/45 mt-1">
                      أُنشئ في:{" "}
                      {new Date(project.createdAt).toLocaleString("ar-SA")}
                    </p>
                  </div>
                  <Link
                    href={`/BREAKAPP/admin/projects/${project.id}/invites`}
                    className="px-4 py-2 text-sm bg-white/8 text-white hover:bg-white/12 transition font-cairo rounded-[22px]"
                  >
                    رموز QR
                  </Link>
                </div>
              ))}
            </div>
          )}
        </CardSpotlight>
      </div>
    </div>
  );
}
