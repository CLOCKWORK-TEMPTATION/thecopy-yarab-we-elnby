import { useCallback, useMemo, useState } from "react";

import { AGENTS } from "../../constants";
import { logError } from "../../domain/errors";
import { validateScriptSegmentResponse } from "../../domain/schemas";
import {
  analyzeBreakdownProject,
  bootstrapBreakdownProject,
  mapReportSceneToWorkspaceScene,
} from "../../infrastructure/platform-client";
import {
  clearStoredAnalysisReport,
  writeAnalysisReportToStorage,
} from "../report/report-storage";

import { useToastQueue } from "./use-toast-queue";

import type {
  BreakdownReport,
  Scene,
  SceneBreakdown,
  ScenarioAnalysis,
  Version,
} from "../../domain/models";

// أقسام التفكيك المتاحة للتنقل في كل الحالات (خمول أو بعد المعالجة)
export type BreakdownSection = "input" | "cast" | "results" | "chat";

export interface ScriptError {
  message: string;
  code:
    | "EMPTY_SCRIPT"
    | "API_ERROR"
    | "PARSE_ERROR"
    | "VALIDATION_ERROR"
    | "NO_SCENES";
}

function buildSceneVersion(scene: Scene, oldVersionsLength: number): Version {
  const newVersion: Version = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    label: `نسخة ${oldVersionsLength + 1} - ${new Date().toLocaleTimeString("ar-EG")}`,
  };
  if (scene.analysis) newVersion.analysis = scene.analysis;
  if (scene.scenarios) newVersion.scenarios = scene.scenarios;
  if (scene.headerData) newVersion.headerData = scene.headerData;
  if (scene.stats) newVersion.stats = scene.stats;
  if (scene.warnings) newVersion.warnings = scene.warnings;
  return newVersion;
}

interface ResolvedSceneFields {
  remoteId: string | undefined;
  projectId: string | undefined;
  reportId: string | undefined;
  analysis: SceneBreakdown | undefined;
  scenarios: ScenarioAnalysis | undefined;
  headerData: Scene["headerData"] | undefined;
  stats: Scene["stats"] | undefined;
  elements: Scene["elements"] | undefined;
  warnings: Scene["warnings"] | undefined;
  source: Scene["source"] | undefined;
}

function compactSceneFields(fields: ResolvedSceneFields): Partial<Scene> {
  const patch: Partial<Scene> = {};
  if (fields.remoteId !== undefined) patch.remoteId = fields.remoteId;
  if (fields.projectId !== undefined) patch.projectId = fields.projectId;
  if (fields.reportId !== undefined) patch.reportId = fields.reportId;
  if (fields.analysis !== undefined) patch.analysis = fields.analysis;
  if (fields.scenarios !== undefined) patch.scenarios = fields.scenarios;
  if (fields.headerData !== undefined) patch.headerData = fields.headerData;
  if (fields.stats !== undefined) patch.stats = fields.stats;
  if (fields.elements !== undefined) patch.elements = fields.elements;
  if (fields.warnings !== undefined) patch.warnings = fields.warnings;
  if (fields.source !== undefined) patch.source = fields.source;
  return patch;
}

function pickSceneValue<T>(
  patchValue: T | undefined,
  breakdownValue: T | undefined,
  currentValue: T | undefined
): T | undefined {
  return patchValue ?? breakdownValue ?? currentValue;
}

function resolvePatchFields(
  scene: Scene,
  breakdown: SceneBreakdown | undefined,
  scenarios: ScenarioAnalysis | undefined,
  scenePatch: Partial<Scene>
): Partial<Scene> {
  return compactSceneFields({
    remoteId: scenePatch.remoteId ?? scene.remoteId,
    projectId: scenePatch.projectId ?? scene.projectId,
    reportId: scenePatch.reportId ?? scene.reportId,
    analysis: breakdown ?? scene.analysis,
    scenarios: scenarios ?? scene.scenarios,
    headerData: pickSceneValue(
      scenePatch.headerData,
      breakdown?.headerData,
      scene.headerData
    ),
    stats: pickSceneValue(scenePatch.stats, breakdown?.stats, scene.stats),
    elements: pickSceneValue(
      scenePatch.elements,
      breakdown?.elements,
      scene.elements
    ),
    warnings: pickSceneValue(
      scenePatch.warnings,
      breakdown?.warnings,
      scene.warnings
    ),
    source: pickSceneValue(scenePatch.source, breakdown?.source, scene.source),
  });
}

function applyScenePatch(
  scene: Scene,
  breakdown: SceneBreakdown | undefined,
  scenarios: ScenarioAnalysis | undefined,
  scenePatch: Partial<Scene>,
  newVersions: Version[]
): Scene {
  const optionalFields = resolvePatchFields(
    scene,
    breakdown,
    scenarios,
    scenePatch
  );

  return {
    id: scene.id,
    header: scenePatch.header ?? scene.header,
    content: scenePatch.content ?? scene.content,
    isAnalyzed: Boolean(optionalFields.analysis),
    versions: newVersions,
    ...optionalFields,
  };
}

function buildRestoredScene(scene: Scene, versionToRestore: Version): Scene {
  const currentVersion: Version = {
    id: Date.now().toString(),
    timestamp: Date.now(),
    label: `نسخة ما قبل الاستعادة (${new Date().toLocaleTimeString("ar-EG")})`,
  };
  if (scene.analysis) currentVersion.analysis = scene.analysis;
  if (scene.scenarios) currentVersion.scenarios = scene.scenarios;
  if (scene.headerData) currentVersion.headerData = scene.headerData;
  if (scene.stats) currentVersion.stats = scene.stats;
  if (scene.warnings) currentVersion.warnings = scene.warnings;

  const nextScene: Scene = {
    ...scene,
    versions: [currentVersion, ...(scene.versions ?? [])],
  };
  const restoredAnalysis = versionToRestore.analysis ?? scene.analysis;
  if (restoredAnalysis) nextScene.analysis = restoredAnalysis;
  const restoredScenarios = versionToRestore.scenarios ?? scene.scenarios;
  if (restoredScenarios) nextScene.scenarios = restoredScenarios;
  const restoredHeaderData = versionToRestore.headerData ?? scene.headerData;
  if (restoredHeaderData) nextScene.headerData = restoredHeaderData;
  const restoredStats = versionToRestore.stats ?? scene.stats;
  if (restoredStats) nextScene.stats = restoredStats;
  const restoredWarnings = versionToRestore.warnings ?? scene.warnings;
  if (restoredWarnings) nextScene.warnings = restoredWarnings;
  return nextScene;
}

export function useScriptWorkspace() {
  const [scriptText, setScriptText] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [report, setReport] = useState<BreakdownReport | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [error, setError] = useState<ScriptError | null>(null);
  const [section, setSection] = useState<BreakdownSection>("input");
  const [isProcessed, setIsProcessed] = useState(false);
  const toast = useToastQueue();

  const processScript = useCallback(async () => {
    if (!scriptText.trim()) {
      const nextError: ScriptError = {
        message: "الرجاء إدخال نص السيناريو",
        code: "EMPTY_SCRIPT",
      };
      setError(nextError);
      toast.error(nextError.message);
      return false;
    }

    setIsSegmenting(true);
    setError(null);

    try {
      const bootstrap = await bootstrapBreakdownProject(scriptText);
      const validationResult = validateScriptSegmentResponse(bootstrap.parsed);

      if (!validationResult.success) {
        const nextError: ScriptError = {
          message: `خطأ في تنسيق البيانات: ${validationResult.error}`,
          code: "VALIDATION_ERROR",
        };
        setError(nextError);
        toast.error(nextError.message);
        return false;
      }

      if (validationResult.data.scenes.length === 0) {
        const nextError: ScriptError = {
          message:
            "لم يتم اكتشاف أي مشاهد في السيناريو. تأكد من تنسيق السيناريو.",
          code: "NO_SCENES",
        };
        setError(nextError);
        toast.error(nextError.message);
        return false;
      }

      const nextReport = await analyzeBreakdownProject(bootstrap.projectId);
      const nextScenes = nextReport.scenes.map((scene, index) =>
        mapReportSceneToWorkspaceScene(
          scene,
          nextReport.projectId,
          nextReport.id,
          index
        )
      );

      setProjectId(nextReport.projectId);
      setReport(nextReport);
      setScenes(nextScenes);
      setIsProcessed(true);
      setSection("results");
      writeAnalysisReportToStorage(nextReport);
      return true;
    } catch (err) {
      logError("useScriptWorkspace.processScript", err);
      const nextError: ScriptError = {
        message: `خطأ في معالجة السيناريو: ${err instanceof Error ? err.message : "خطأ غير معروف"}`,
        code: "API_ERROR",
      };
      setError(nextError);
      toast.error(nextError.message);
      return false;
    } finally {
      setIsSegmenting(false);
    }
  }, [scriptText, toast]);

  const updateScene = useCallback(
    (
      id: number,
      breakdown?: SceneBreakdown,
      scenarios?: ScenarioAnalysis,
      scenePatch: Partial<Scene> = {}
    ) => {
      setScenes((prev) =>
        prev.map((scene) => {
          if (scene.id !== id) return scene;

          const oldVersions = scene.versions ?? [];
          const newVersions = [...oldVersions];
          if (scene.isAnalyzed && (scene.analysis || scene.scenarios)) {
            newVersions.unshift(buildSceneVersion(scene, oldVersions.length));
          }

          return applyScenePatch(
            scene,
            breakdown,
            scenarios,
            scenePatch,
            newVersions
          );
        })
      );

      setReport((prevReport) => {
        if (!prevReport || !breakdown) {
          return prevReport;
        }

        const nextScenes = prevReport.scenes.map((scene) =>
          scene.sceneId === scenePatch.remoteId
            ? {
                ...scene,
                analysis: breakdown,
                scenarios: scenarios ?? scene.scenarios,
                headerData:
                  scenePatch.headerData ??
                  breakdown.headerData ??
                  scene.headerData,
                header: scenePatch.header ?? scene.header,
                content: scenePatch.content ?? scene.content,
              }
            : scene
        );

        const nextReport = {
          ...prevReport,
          updatedAt: new Date().toISOString(),
          scenes: nextScenes,
        };

        writeAnalysisReportToStorage(nextReport);
        return nextReport;
      });
    },
    []
  );

  const restoreVersion = useCallback((sceneId: number, versionId: string) => {
    let restoredScene: Scene | null = null;

    setScenes((prev) =>
      prev.map((scene) => {
        if (scene.id !== sceneId || !scene.versions) return scene;

        const versionToRestore = scene.versions.find(
          (version) => version.id === versionId
        );
        if (!versionToRestore) return scene;

        const nextScene = buildRestoredScene(scene, versionToRestore);
        restoredScene = nextScene;
        return nextScene;
      })
    );

    setReport((prevReport) => {
      if (!prevReport || !restoredScene?.remoteId) {
        return prevReport;
      }

      const restoredAnalysis = restoredScene.analysis;
      const restoredHeaderData = restoredScene.headerData;
      if (!restoredAnalysis || !restoredHeaderData) {
        return prevReport;
      }

      const nextScenes = prevReport.scenes.map((scene) =>
        scene.sceneId === restoredScene?.remoteId
          ? {
              ...scene,
              analysis: restoredAnalysis,
              scenarios: restoredScene.scenarios ?? scene.scenarios,
              headerData: restoredHeaderData,
              header: restoredScene.header,
              content: restoredScene.content,
            }
          : scene
      );

      const nextReport = {
        ...prevReport,
        updatedAt: new Date().toISOString(),
        scenes: nextScenes,
      };

      writeAnalysisReportToStorage(nextReport);
      return nextReport;
    });
  }, []);

  const resetWorkspace = useCallback(() => {
    setSection("input");
    setIsProcessed(false);
    setScenes([]);
    setReport(null);
    setProjectId(null);
    setError(null);
    clearStoredAnalysisReport();
  }, []);

  const previewAgents = useMemo(
    () => AGENTS.filter((agent) => agent.type === "breakdown").slice(0, 4),
    []
  );

  return {
    scriptText,
    setScriptText,
    scenes,
    setScenes,
    report,
    projectId,
    isSegmenting,
    error,
    section,
    setSection,
    isProcessed,
    processScript,
    updateScene,
    restoreVersion,
    resetWorkspace,
    clearError: () => setError(null),
    previewAgents,
    toast,
  };
}
