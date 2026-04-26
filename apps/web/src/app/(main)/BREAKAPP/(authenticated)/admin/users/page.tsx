"use client";

/**
 * أعضاء المشاريع — Admin Users
 *
 * @description
 * تعرض قائمة الأعضاء المنتمين إلى مشروع مختار من قائمة منسدلة،
 * مع دورهم وتاريخ الانضمام.
 *
 * السبب: مدير النظام بحاجة لصورة شفافة عن توزيع الأعضاء
 * على المشاريع قبل اتخاذ قرارات دعوة أو إلغاء صلاحيات.
 */

import { api, getRoleLabel } from "@the-copy/breakapp";
import { AxiosError } from "axios";
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

interface ProjectMember {
  userId: string;
  role: string;
  joinedAt: string;
}

export default function AdminUsersPage() {
  const [projects, setProjects] = useState<AdminProject[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [loadingProjects, setLoadingProjects] = useState<boolean>(true);
  const [loadingMembers, setLoadingMembers] = useState<boolean>(false);

  const fetchProjects = useCallback(async (): Promise<void> => {
    setLoadingProjects(true);
    try {
      const response = await api.get<AdminProject[]>("/admin/projects");
      setProjects(response.data);
      const first = response.data[0];
      if (first) {
        setSelectedProjectId(first.id);
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب المشاريع",
        description: axiosError.message || "تعذّر تحميل المشاريع",
        variant: "destructive",
      });
    } finally {
      setLoadingProjects(false);
    }
  }, []);

  const fetchMembers = useCallback(async (projectId: string): Promise<void> => {
    if (!projectId) {
      setMembers([]);
      return;
    }
    setLoadingMembers(true);
    try {
      const response = await api.get<ProjectMember[]>("/admin/users", {
        params: { projectId },
      });
      setMembers(response.data);
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      toast({
        title: "خطأ في جلب الأعضاء",
        description: axiosError.message || "تعذّر تحميل قائمة الأعضاء",
        variant: "destructive",
      });
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    void fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    void fetchMembers(selectedProjectId);
  }, [selectedProjectId, fetchMembers]);

  const handleProjectChange = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>): void => {
      setSelectedProjectId(event.target.value);
    },
    []
  );

  return (
    <div dir="rtl" className="min-h-screen bg-black/8 p-8 backdrop-blur-xl">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2 font-cairo">
              أعضاء المشاريع
            </h1>
            <p className="text-white/55 font-cairo">
              اختر مشروعاً لعرض أعضائه وأدوارهم
            </p>
          </div>
          <Link
            href="/BREAKAPP/admin"
            className="px-4 py-2 text-sm bg-white/6 text-white hover:bg-white/8 transition font-cairo rounded-[22px]"
          >
            العودة
          </Link>
        </div>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6 mb-6">
          <label className="block text-sm font-medium text-white mb-2 font-cairo">
            المشروع
          </label>
          <select
            value={selectedProjectId}
            onChange={handleProjectChange}
            disabled={loadingProjects || projects.length === 0}
            className="w-full px-4 py-2 border border-white/8 rounded-[22px] bg-white/4 text-white focus:ring-2 focus:ring-white/20 focus:border-transparent font-cairo disabled:opacity-50"
          >
            {projects.length === 0 ? (
              <option value="" className="bg-black text-white">
                لا توجد مشاريع
              </option>
            ) : (
              projects.map((project: AdminProject) => (
                <option
                  key={project.id}
                  value={project.id}
                  className="bg-black text-white"
                >
                  {project.name}
                </option>
              ))
            )}
          </select>
        </CardSpotlight>

        <CardSpotlight className="overflow-hidden rounded-[22px] bg-white/[0.04] backdrop-blur-xl border border-white/8 p-6">
          <h2 className="text-xl font-semibold mb-4 text-white font-cairo">
            الأعضاء ({members.length})
          </h2>
          {loadingMembers ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/40" />
            </div>
          ) : members.length === 0 ? (
            <p className="text-white/55 text-center py-8 font-cairo">
              لا يوجد أعضاء في هذا المشروع بعد
            </p>
          ) : (
            <div className="space-y-3">
              {members.map((member: ProjectMember) => (
                <div
                  key={`${member.userId}-${member.joinedAt}`}
                  className="flex flex-col md:flex-row md:items-center justify-between gap-2 p-4 border border-white/8 rounded-[22px] bg-white/[0.02]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-mono truncate">
                      {member.userId}
                    </p>
                    <p className="text-xs text-white/45 mt-1 font-cairo">
                      انضمّ في{" "}
                      {new Date(member.joinedAt).toLocaleString("ar-SA")}
                    </p>
                  </div>
                  <span className="px-3 py-1 text-xs bg-white/8 text-white rounded-full font-cairo border border-white/12">
                    {getRoleLabel(member.role)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardSpotlight>
      </div>
    </div>
  );
}
