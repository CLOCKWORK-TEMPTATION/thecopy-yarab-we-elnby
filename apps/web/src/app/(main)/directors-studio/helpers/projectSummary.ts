/**
 * @fileoverview دوال وأنواع مساعدة لإدارة ملخص المشروع في استوديو المخرجين
 *
 * يحتوي هذا الملف على المنطق الأساسي لتحويل بيانات المشروع
 * وحساب الإحصائيات بطريقة موحدة تُستخدم في جميع أنحاء التطبيق.
 *
 * السبب في فصل هذا المنطق: تسهيل الاختبار وإعادة الاستخدام
 * عبر مكونات متعددة دون تكرار الكود.
 */

import type CharacterTracker from "@/app/(main)/directors-studio/components/CharacterTracker";
import type SceneCard from "@/app/(main)/directors-studio/components/SceneCard";
import type { ComponentProps } from "react";

/**
 * نوع خصائص بطاقة المشهد المُستخرج من المكوّن
 * السبب: ضمان التوافق التام بين البيانات والمكوّن
 */
export type SceneCardProps = ComponentProps<typeof SceneCard>;

/**
 * نوع خصائص متتبع الشخصيات المُستخرج من المكوّن
 * السبب: الحفاظ على اتساق الأنواع عبر التطبيق
 */
export type CharacterTrackerProps = ComponentProps<typeof CharacterTracker>;

/**
 * نوع بيانات الشخصية القادمة من API
 * السبب: البيانات من الخادم قد تحتوي على قيم null
 * لذلك نحتاج نوعاً وسيطاً للتحويل
 */
export type ProjectCharacterInput = readonly (Omit<
    CharacterTrackerProps["characters"][number],
    "consistencyStatus" | "lastSeen"
  > & {
    consistencyStatus?:
      | CharacterTrackerProps["characters"][number]["consistencyStatus"]
      | null;
    lastSeen?: string | null;
  })[];

/**
 * القيم الافتراضية لحالة اتساق الشخصية
 * السبب: توحيد القيم الافتراضية في مكان واحد
 */
const DEFAULT_CONSISTENCY_STATUS: CharacterTrackerProps["characters"][number]["consistencyStatus"] =
  "good";
const DEFAULT_LAST_SEEN = "غير محدد";

/**
 * تحويل قائمة الشخصيات القادمة من API إلى الشكل المطلوب للعرض
 *
 * السبب: البيانات من الخادم قد تحتوي على قيم فارغة أو null
 * لذلك نحتاج ملء القيم الافتراضية لضمان عدم انهيار المكونات
 *
 * @param characters - قائمة الشخصيات من API (قد تكون undefined)
 * @returns قائمة الشخصيات المُجهزة للعرض
 *
 * @example
 * const characters = prepareCharacterList(apiData);
 * // جميع الشخصيات الآن لها consistencyStatus و lastSeen
 */
export function prepareCharacterList(
  characters?: ProjectCharacterInput
): CharacterTrackerProps["characters"] {
  if (!characters) {
    return [];
  }

  return characters.map((character) => ({
    ...character,
    consistencyStatus: (character.consistencyStatus ??
      DEFAULT_CONSISTENCY_STATUS),
    lastSeen: character.lastSeen ?? DEFAULT_LAST_SEEN,
  }));
}

/**
 * التحقق من وجود مشروع نشط بناءً على معرف المشروع
 *
 * السبب: يُستخدم لتحديد ما يجب عرضه للمستخدم:
 * - إذا لا يوجد مشروع: نعرض واجهة إنشاء مشروع جديد
 * - إذا يوجد مشروع: نعرض محتوى المشروع
 *
 * @param projectId - معرف المشروع الحالي (قد يكون null)
 * @returns true إذا كان هناك مشروع نشط
 */
export function hasActiveProject(projectId: string | null): boolean {
  return Boolean(projectId);
}

/**
 * واجهة ملخص إحصائيات المشروع
 * السبب: توفير بنية واضحة للإحصائيات المعروضة في لوحة التحكم
 */
export interface ProjectStatsSummary {
  /** العدد الإجمالي للمشاهد */
  totalScenes: number;
  /** العدد الإجمالي للشخصيات */
  totalCharacters: number;
  /** العدد الإجمالي للقطات المخططة */
  totalShots: number;
  /** عدد المشاهد المكتملة */
  completedScenes: number;
}

/**
 * حساب إحصائيات المشروع من بيانات المشاهد والشخصيات
 *
 * السبب: توفير نظرة شاملة سريعة على حالة المشروع
 * تُعرض في أعلى صفحة المشروع لمساعدة المخرج في متابعة التقدم
 *
 * @param scenes - قائمة مشاهد المشروع
 * @param characters - قائمة شخصيات المشروع
 * @returns كائن يحتوي على الإحصائيات الأساسية
 *
 * @example
 * const stats = calculateProjectStats(scenes, characters);
 * // { totalScenes: 10, totalCharacters: 5, totalShots: 45, completedScenes: 3 }
 */
export function calculateProjectStats(
  scenes: SceneCardProps[],
  characters: CharacterTrackerProps["characters"]
): ProjectStatsSummary {
  const completedScenes = scenes.filter(
    (scene) => scene.status === "completed"
  ).length;

  const totalShots = scenes.reduce(
    (sum, scene) => sum + (scene.shotCount ?? 0),
    0
  );

  return {
    totalScenes: scenes.length,
    totalCharacters: characters.length,
    totalShots,
    completedScenes,
  };
}
