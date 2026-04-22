/**
 * @fileoverview خطاف إدارة المشاهد
 *
 * هذا الخطاف يفصل منطق إدارة المشاهد وتحليلها عن المكون الرئيسي.
 *
 * السبب: نقل المنطق المعقد لإدارة حالة المشاهد والإصدارات
 * إلى خطاف مخصص يحسن قابلية الاختبار ويقلل تعقيد المكونات.
 */

import { useState, useCallback } from "react";
import { definedProps } from "@/lib/defined-props";
import { Scene, SceneBreakdown, ScenarioAnalysis, Version } from "../types";
import {
  reanalyzeBreakdownScene,
  chatWithBreakdownAssistant,
} from "../infrastructure/platform-client";
import { logError } from "../config";

/**
 * نتيجة عملية التحليل
 */
interface AnalysisResult {
  success: boolean;
  error?: string;
}

/**
 * حالة الخطاف
 */
interface UseSceneManagerState {
  /** المشاهد الحالية */
  scenes: Scene[];
  /** معرفات المشاهد قيد التحليل */
  analyzingIds: Set<number>;
  /** معرفات المشاهد قيد تحليل السيناريوهات */
  strategizingIds: Set<number>;
}

/**
 * دوال الخطاف
 */
interface UseSceneManagerActions {
  /** يضبط قائمة المشاهد */
  setScenes: (scenes: Scene[]) => void;
  /** يحدث بيانات مشهد معين */
  updateScene: (
    id: number,
    breakdown?: SceneBreakdown,
    scenarios?: ScenarioAnalysis
  ) => void;
  /** يستعيد إصدار قديم من المشهد */
  restoreVersion: (sceneId: number, versionId: string) => void;
  /** يحلل مشهد معين */
  analyzeScene: (scene: Scene) => Promise<AnalysisResult>;
  /** يولد سيناريوهات استراتيجية للمشهد */
  runStrategy: (scene: Scene) => Promise<AnalysisResult>;
}

type UseSceneManagerReturn = UseSceneManagerState & UseSceneManagerActions;

/**
 * خطاف إدارة المشاهد
 *
 * يوفر واجهة موحدة لإدارة حالة المشاهد، التحليل، والإصدارات.
 *
 * @param initialScenes - المشاهد الأولية (اختياري)
 * @returns حالة ودوال إدارة المشاهد
 *
 * @example
 * ```tsx
 * const {
 *   scenes,
 *   analyzingIds,
 *   analyzeScene,
 *   restoreVersion
 * } = useSceneManager(initialScenes);
 *
 * const handleAnalyze = async (scene) => {
 *   const result = await analyzeScene(scene);
 *   if (!result.success) {
 *     showToast('error', result.error);
 *   }
 * };
 * ```
 */
export function useSceneManager(
  initialScenes: Scene[] = []
): UseSceneManagerReturn {
  const [scenes, setScenesState] = useState<Scene[]>(initialScenes);
  const [analyzingIds, setAnalyzingIds] = useState<Set<number>>(new Set());
  const [strategizingIds, setStrategizingIds] = useState<Set<number>>(
    new Set()
  );

  /**
   * يضبط قائمة المشاهد
   */
  const setScenes = useCallback((newScenes: Scene[]) => {
    setScenesState(newScenes);
  }, []);

  /**
   * يحدث مشهد معين مع حفظ الإصدار السابق
   *
   * السبب: نحافظ على تاريخ التغييرات لإتاحة الاستعادة
   * وتتبع تطور التحليل مع الوقت
   */
  const updateScene = useCallback(
    (id: number, breakdown?: SceneBreakdown, scenarios?: ScenarioAnalysis) => {
      setScenesState((prev) =>
        prev.map((scene) => {
          if (scene.id !== id) return scene;

          const oldVersions = scene.versions || [];
          const newVersions = [...oldVersions];

          // حفظ الحالة القديمة كإصدار قبل الكتابة فوقها
          if (scene.isAnalyzed && (scene.analysis || scene.scenarios)) {
            const newVersion: Version = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              label: `نسخة ${oldVersions.length + 1} - ${new Date().toLocaleTimeString("ar-EG")}`,
              ...definedProps({
                analysis: scene.analysis,
                scenarios: scene.scenarios,
              }),
            };
            newVersions.unshift(newVersion);
          }

          return {
            ...scene,
            isAnalyzed: !!breakdown || !!scene.analysis,
            versions: newVersions,
            ...definedProps({
              analysis: breakdown || scene.analysis,
              scenarios: scenarios || scene.scenarios,
            }),
          };
        })
      );
    },
    []
  );

  /**
   * يستعيد إصدار قديم من المشهد
   *
   * السبب: نتيح للمستخدم الرجوع لتحليل سابق إذا كان أفضل
   */
  const restoreVersion = useCallback((sceneId: number, versionId: string) => {
    setScenesState((prev) =>
      prev.map((scene) => {
        if (scene.id !== sceneId || !scene.versions) return scene;

        const versionToRestore = scene.versions.find((v) => v.id === versionId);
        if (!versionToRestore) return scene;

        // حفظ الحالة الحالية قبل الاستعادة
        const currentVersion: Version = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          label: `نسخة ما قبل الاستعادة (${new Date().toLocaleTimeString("ar-EG")})`,
          ...definedProps({
            analysis: scene.analysis,
            scenarios: scene.scenarios,
          }),
        };

        return {
          ...scene,
          versions: [currentVersion, ...scene.versions],
          ...definedProps({
            analysis: versionToRestore.analysis,
            scenarios: versionToRestore.scenarios,
          }),
        };
      })
    );
  }, []);

  /**
   * يحلل مشهد معين باستخدام خدمة Gemini
   *
   * السبب: نفصل منطق التحليل لإتاحة إعادة الاستخدام
   * والتعامل مع الأخطاء بشكل موحد
   */
  const analyzeScene = useCallback(
    async (scene: Scene): Promise<AnalysisResult> => {
      if (analyzingIds.has(scene.id)) {
        return { success: false, error: "التحليل قيد التنفيذ بالفعل" };
      }

      setAnalyzingIds((prev) => new Set(prev).add(scene.id));

      try {
        // استدعاء API عبر platform-client بدلاً من Gemini مباشرة
        let breakdown: SceneBreakdown;
        if (scene.remoteId) {
          const result = await reanalyzeBreakdownScene(scene.remoteId);
          breakdown = result.analysis;
        } else {
          // احتياط: استدعاء chat endpoint لتحليل المشهد
          const chatResult = await chatWithBreakdownAssistant(
            `حلل هذا المشهد السينمائي واستخرج العناصر الإنتاجية:\n${scene.content}`,
            { type: "scene-analysis" }
          );
          breakdown = JSON.parse(chatResult.answer) as SceneBreakdown;
        }
        updateScene(scene.id, breakdown, scene.scenarios);
        return { success: true };
      } catch (err) {
        logError("useSceneManager.analyzeScene", err);
        const errorMessage =
          err instanceof Error ? err.message : "خطأ غير معروف";
        return { success: false, error: `فشل التحليل: ${errorMessage}` };
      } finally {
        setAnalyzingIds((prev) => {
          const next = new Set(prev);
          next.delete(scene.id);
          return next;
        });
      }
    },
    [analyzingIds, updateScene]
  );

  /**
   * يولد سيناريوهات استراتيجية للمشهد
   *
   * السبب: نفصل منطق توليد السيناريوهات لتسهيل الاختبار
   */
  const runStrategy = useCallback(
    async (scene: Scene): Promise<AnalysisResult> => {
      if (strategizingIds.has(scene.id)) {
        return { success: false, error: "تحليل السيناريوهات قيد التنفيذ" };
      }

      setStrategizingIds((prev) => new Set(prev).add(scene.id));

      try {
        // استدعاء API عبر platform-client لتحليل السيناريوهات الإنتاجية
        let scenarios: ScenarioAnalysis;
        if (scene.remoteId) {
          const result = await reanalyzeBreakdownScene(scene.remoteId);
          scenarios = result.scenarios;
        } else {
          const chatResult = await chatWithBreakdownAssistant(
            `حلل سيناريوهات الإنتاج لهذا المشهد وقدم بدائل استراتيجية:\n${scene.content}`,
            { type: "scenario-analysis" }
          );
          scenarios = JSON.parse(chatResult.answer) as ScenarioAnalysis;
        }
        updateScene(scene.id, scene.analysis, scenarios);
        return { success: true };
      } catch (err) {
        logError("useSceneManager.runStrategy", err);
        const errorMessage =
          err instanceof Error ? err.message : "خطأ غير معروف";
        return {
          success: false,
          error: `فشل تحليل السيناريوهات: ${errorMessage}`,
        };
      } finally {
        setStrategizingIds((prev) => {
          const next = new Set(prev);
          next.delete(scene.id);
          return next;
        });
      }
    },
    [strategizingIds, updateScene]
  );

  return {
    scenes,
    analyzingIds,
    strategizingIds,
    setScenes,
    updateScene,
    restoreVersion,
    analyzeScene,
    runStrategy,
  };
}

export type { AnalysisResult, UseSceneManagerReturn };
