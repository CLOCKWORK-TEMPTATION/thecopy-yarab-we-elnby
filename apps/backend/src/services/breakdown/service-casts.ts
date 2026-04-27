import type {
  BreakdownReport,
  BreakdownSceneAnalysis,
  ScenarioAnalysis,
  SceneHeader,
  ShootingScheduleDay,
} from "./types";

export function asBreakdownReport(value: unknown): BreakdownReport {
  return value as BreakdownReport;
}

export function asShootingScheduleDay(value: unknown): ShootingScheduleDay {
  return value as ShootingScheduleDay;
}

export function asSceneHeader(value: unknown): SceneHeader {
  return value as SceneHeader;
}

export function asBreakdownSceneAnalysis(
  value: unknown,
): BreakdownSceneAnalysis {
  return value as BreakdownSceneAnalysis;
}

export function asScenarioAnalysis(value: unknown): ScenarioAnalysis {
  if (Array.isArray(value)) {
    return { scenarios: value as ScenarioAnalysis["scenarios"] };
  }

  if (value && typeof value === "object" && "scenarios" in value) {
    return value as ScenarioAnalysis;
  }

  return { scenarios: [] };
}
