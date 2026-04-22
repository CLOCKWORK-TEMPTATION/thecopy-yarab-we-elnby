import { useCallback, useMemo, useState } from "react";
import type {
  BreakdownReport,
  Scene,
  SceneBreakdown,
  ScenarioAnalysis,
  Version,
} from "../../domain/models";
import { logError } from "../../domain/errors";
import { validateScriptSegmentResponse } from "../../domain/schemas";
import { AGENTS } from "../../constants";
import {
  analyzeBreakdownProject,
  bootstrapBreakdownProject,
  mapReportSceneToWorkspaceScene,
} from "../../infrastructure/platform-client";
import { useToastQueue } from "./use-toast-queue";
import {
  clearStoredAnalysisReport,
  writeAnalysisReportToStorage,
} from "../report/report-storage";

export interface ScriptError {
  message: string;
  code:
    | "EMPTY_SCRIPT"
    | "API_ERROR"
    | "PARSE_ERROR"
    | "VALIDATION_ERROR"
    | "NO_SCENES";
}

export function useScriptWorkspace() {
  const [scriptText, setScriptText] = useState("");
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [report, setReport] = useState<BreakdownReport | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [error, setError] = useState<ScriptError | null>(null);
  const [view, setView] = useState<"input" | "results">("input");
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
      setView("results");
      writeAnalysisReportToStorage(nextReport);
      return true;
    } catch (err) {
      logError("useScriptWorkspace.processScript", err);
      const nextError: ScriptError = {
        message: `خطأ في معالجة السيناريو: ${
          err instanceof Error ? err.message : "خطأ غير معروف"
        }`,
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
          if (scene.id !== id) {
            return scene;
          }

          const oldVersions = scene.versions || [];
          const newVersions = [...oldVersions];

          if (scene.isAnalyzed && (scene.analysis || scene.scenarios)) {
            const newVersion: Version = {
              id: Date.now().toString(),
              timestamp: Date.now(),
              label: `نسخة ${oldVersions.length + 1} - ${new Date().toLocaleTimeString(
                "ar-EG"
              )}`,
            };
            if (scene.analysis) {
              newVersion.analysis = scene.analysis;
            }
            if (scene.scenarios) {
              newVersion.scenarios = scene.scenarios;
            }
            if (scene.headerData) {
              newVersion.headerData = scene.headerData;
            }
            if (scene.stats) {
              newVersion.stats = scene.stats;
            }
            if (scene.warnings) {
              newVersion.warnings = scene.warnings;
            }
            newVersions.unshift(newVersion);
          }

          const nextAnalysis = breakdown ?? scene.analysis;
          const nextScenarios = scenarios ?? scene.scenarios;
          const nextHeaderData =
            scenePatch.headerData ?? breakdown?.headerData ?? scene.headerData;
          const nextStats = scenePatch.stats ?? breakdown?.stats ?? scene.stats;
          const nextElements =
            scenePatch.elements ?? breakdown?.elements ?? scene.elements;
          const nextWarnings =
            scenePatch.warnings ?? breakdown?.warnings ?? scene.warnings;
          const nextSource =
            scenePatch.source ?? breakdown?.source ?? scene.source;

          const nextScene: Scene = {
            id: scene.id,
            header: scenePatch.header ?? scene.header,
            content: scenePatch.content ?? scene.content,
            isAnalyzed: !!nextAnalysis,
            versions: newVersions,
          };
          if (scene.remoteId) {
            nextScene.remoteId = scene.remoteId;
          }
          if (scenePatch.remoteId) {
            nextScene.remoteId = scenePatch.remoteId;
          }
          if (scene.projectId) {
            nextScene.projectId = scene.projectId;
          }
          if (scenePatch.projectId) {
            nextScene.projectId = scenePatch.projectId;
          }
          if (scene.reportId) {
            nextScene.reportId = scene.reportId;
          }
          if (scenePatch.reportId) {
            nextScene.reportId = scenePatch.reportId;
          }
          if (nextAnalysis) {
            nextScene.analysis = nextAnalysis;
          }
          if (nextScenarios) {
            nextScene.scenarios = nextScenarios;
          }
          if (nextHeaderData) {
            nextScene.headerData = nextHeaderData;
          }
          if (nextStats) {
            nextScene.stats = nextStats;
          }
          if (nextElements) {
            nextScene.elements = nextElements;
          }
          if (nextWarnings) {
            nextScene.warnings = nextWarnings;
          }
          if (nextSource) {
            nextScene.source = nextSource;
          }

          return nextScene;
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
                scenarios: scenarios || scene.scenarios,
                headerData:
                  scenePatch.headerData ||
                  breakdown.headerData ||
                  scene.headerData,
                header: scenePatch.header || scene.header,
                content: scenePatch.content || scene.content,
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
        if (scene.id !== sceneId || !scene.versions) {
          return scene;
        }

        const versionToRestore = scene.versions.find(
          (version) => version.id === versionId
        );
        if (!versionToRestore) {
          return scene;
        }

        const currentVersion: Version = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          label: `نسخة ما قبل الاستعادة (${new Date().toLocaleTimeString(
            "ar-EG"
          )})`,
        };
        if (scene.analysis) {
          currentVersion.analysis = scene.analysis;
        }
        if (scene.scenarios) {
          currentVersion.scenarios = scene.scenarios;
        }
        if (scene.headerData) {
          currentVersion.headerData = scene.headerData;
        }
        if (scene.stats) {
          currentVersion.stats = scene.stats;
        }
        if (scene.warnings) {
          currentVersion.warnings = scene.warnings;
        }

        const nextScene: Scene = {
          ...scene,
          versions: [currentVersion, ...scene.versions],
        };
        const restoredAnalysis = versionToRestore.analysis ?? scene.analysis;
        if (restoredAnalysis) {
          nextScene.analysis = restoredAnalysis;
        }
        const restoredScenarios = versionToRestore.scenarios ?? scene.scenarios;
        if (restoredScenarios) {
          nextScene.scenarios = restoredScenarios;
        }
        const restoredHeaderData =
          versionToRestore.headerData ?? scene.headerData;
        if (restoredHeaderData) {
          nextScene.headerData = restoredHeaderData;
        }
        const restoredStats = versionToRestore.stats ?? scene.stats;
        if (restoredStats) {
          nextScene.stats = restoredStats;
        }
        const restoredWarnings = versionToRestore.warnings ?? scene.warnings;
        if (restoredWarnings) {
          nextScene.warnings = restoredWarnings;
        }

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
              scenarios: restoredScene.scenarios || scene.scenarios,
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
    setView("input");
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
    view,
    processScript,
    updateScene,
    restoreVersion,
    resetWorkspace,
    clearError: () => setError(null),
    previewAgents,
    toast,
  };
}
