import type { SceneBreakdown } from "../../domain/models";
import {
  analyzeBreakdownProject,
  bootstrapBreakdownProject,
} from "../platform-client";

export const analyzeScene = async (
  sceneContent: string
): Promise<SceneBreakdown> => {
  const bootstrap = await bootstrapBreakdownProject(
    sceneContent,
    "تحليل مشهد منفرد"
  );
  const report = await analyzeBreakdownProject(bootstrap.projectId);
  const firstScene = report.scenes[0];

  if (!firstScene) {
    throw new Error("لم يرجع الخادم أي مشهد قابل للتحليل.");
  }

  return firstScene.analysis;
};
