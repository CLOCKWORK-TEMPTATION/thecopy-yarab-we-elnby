import type { ScenarioAnalysis } from "../../domain/models";
import {
  analyzeBreakdownProject,
  bootstrapBreakdownProject,
} from "../platform-client";

export interface ScenarioAnalysisOptions {
  includeRecommended?: boolean;
  scenarioCount?: number;
  prioritizeBudget?: boolean;
  prioritizeCreative?: boolean;
  prioritizeSchedule?: boolean;
}

export const analyzeProductionScenarios = async (
  sceneContent: string,
  _options: ScenarioAnalysisOptions = {}
): Promise<ScenarioAnalysis> => {
  const bootstrap = await bootstrapBreakdownProject(
    sceneContent,
    "سيناريوهات إنتاجية"
  );
  const report = await analyzeBreakdownProject(bootstrap.projectId);
  const firstScene = report.scenes[0];

  return firstScene?.scenarios || { scenarios: [] };
};
