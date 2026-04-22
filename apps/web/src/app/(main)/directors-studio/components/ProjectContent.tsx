/**
 * @fileoverview مكوّن محتوى المشروع الرئيسي
 *
 * السبب في فصل هذا المكوّن: تقسيم واجهة المستخدم
 * إلى أجزاء أصغر قابلة للاختبار وإعادة الاستخدام.
 *
 * يعرض هذا المكوّن:
 * 1. إحصائيات المشروع (عدد المشاهد، الشخصيات، اللقطات)
 * 2. التبويبات للتنقل بين المشاهد والشخصيات
 */
"use client";

import { useMemo } from "react";
import ProjectStats from "@/app/(main)/directors-studio/components/ProjectStats";
import { ProjectTabs } from "@/app/(main)/directors-studio/components/ProjectTabs";
import {
  calculateProjectStats,
  type CharacterTrackerProps,
  type SceneCardProps,
} from "@/app/(main)/directors-studio/helpers/projectSummary";

/**
 * واجهة خصائص مكوّن محتوى المشروع
 */
interface ProjectContentProps {
  /** قائمة مشاهد المشروع */
  scenes: SceneCardProps[];
  /** قائمة شخصيات المشروع */
  characters: CharacterTrackerProps["characters"];
}

/**
 * مكوّن محتوى المشروع
 *
 * السبب في وجود هذا المكوّن: توفير عرض موحد لمحتوى المشروع
 * يجمع بين الإحصائيات والتبويبات في مكان واحد.
 *
 * @param props - خصائص المكوّن تشمل المشاهد والشخصيات
 * @returns عنصر React يعرض محتوى المشروع
 */
export function ProjectContent({ scenes, characters }: ProjectContentProps) {
  /**
   * حساب إحصائيات المشروع
   * السبب في useMemo: تجنب إعادة الحساب عند كل render
   * لأن الحساب يتضمن عمليات reduce على المصفوفات
   */
  const stats = useMemo(
    () => calculateProjectStats(scenes, characters),
    [scenes, characters]
  );

  return (
    <>
      <ProjectStats {...stats} />
      <ProjectTabs scenes={scenes} characters={characters} />
    </>
  );
}

export default ProjectContent;
