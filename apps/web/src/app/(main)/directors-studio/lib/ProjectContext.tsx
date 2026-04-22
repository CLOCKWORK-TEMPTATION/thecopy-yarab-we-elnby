/**
 * سياق المشروع الحالي — يحل مشكلة currentProjectId الفارغ
 *
 * التصميم:
 * 1. يقرأ المشروع من sessionStorage عند التحميل
 * 2. يوفر دوال setProject / clearProject لكل المكونات الفرعية
 * 3. يُزامن التغييرات مع sessionStorage تلقائياً
 * 4. يُبث حدث storage مخصص لإعلام التبويبات الأخرى
 */
"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  getCurrentProject,
  setCurrentProject as storeSet,
  clearCurrentProject as storeClear,
} from "@/lib/projectStore";
import type { Project } from "@/types/api";

/** الشكل الداخلي للمشروع المخزن */
interface StoredProject extends Project {
  scriptContent: string | null;
}

/** واجهة السياق */
interface ProjectContextValue {
  /** المشروع الحالي — null إذا لم يُختر مشروع */
  project: StoredProject | null;
  /** معرّف المشروع الحالي — سلسلة فارغة إذا لم يُختر */
  projectId: string;
  /** تعيين المشروع الحالي */
  setProject: (project: Project) => void;
  /** مسح المشروع الحالي */
  clearProject: () => void;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

/** اسم الحدث المخصص للتزامن بين المكونات */
const PROJECT_CHANGE_EVENT = "directors-studio:project-changed";

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, setProjectState] = useState<StoredProject | null>(() => {
    const stored = getCurrentProject();
    return stored as StoredProject | null;
  });

  const projectId = project?.id ?? "";

  /** تعيين مشروع جديد */
  const setProject = useCallback((p: Project) => {
    const stored: StoredProject = {
      ...p,
      scriptContent: p.scriptContent ?? null,
    };
    storeSet(stored);
    setProjectState(stored);
    window.dispatchEvent(new CustomEvent(PROJECT_CHANGE_EVENT));
  }, []);

  /** مسح المشروع */
  const clearProject = useCallback(() => {
    storeClear();
    setProjectState(null);
    window.dispatchEvent(new CustomEvent(PROJECT_CHANGE_EVENT));
  }, []);

  /** الاستماع لتغييرات المشروع من مكونات أخرى */
  useEffect(() => {
    const handler = () => {
      const stored = getCurrentProject();
      setProjectState(stored as StoredProject | null);
    };
    window.addEventListener(PROJECT_CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(PROJECT_CHANGE_EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return (
    <ProjectContext.Provider
      value={{ project, projectId, setProject, clearProject }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Hook للوصول لسياق المشروع
 * يرمي خطأ إذا استُخدم خارج ProjectProvider
 */
export function useCurrentProject(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error("useCurrentProject يجب استخدامه داخل ProjectProvider");
  }
  return ctx;
}
