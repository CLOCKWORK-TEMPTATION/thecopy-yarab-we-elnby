import { randomUUID } from "node:crypto";

import {
  success,
  failure,
  asString,
  asNumber,
  parseList,
  slugify,
} from "./handlers-shared";
import { runPlugin } from "./plugin-executor";
import { BudgetOptimizer } from "./plugins/budget-optimizer";
import { LightingSimulator } from "./plugins/lighting-simulator";
import { ProductionReadinessReportPromptBuilder } from "./plugins/production-readiness-report";
import { RiskAnalyzer } from "./plugins/risk-analyzer";
import { TerminologyTranslator } from "./plugins/terminology-translator";
import { VisualConsistencyAnalyzer } from "./plugins/visual-analyzer";
import { readStore } from "./store";

import type { ArtDirectorHandlerResponse } from "./handlers-shared";

const COLOR_TEMPERATURE_MAP: Record<string, number> = {
  daylight: 5600,
  sunset: 3400,
  night: 4200,
  artificial: 3200,
};

function buildScenePair(
  sceneId: string,
  palette: string[],
  lightingCondition: string
) {
  const temperature = COLOR_TEMPERATURE_MAP[lightingCondition] ?? 5600;
  return [
    {
      id: `${sceneId}-reference`,
      name: "Reference Scene",
      colorPalette: {
        primary: palette.slice(0, 2),
        secondary: palette.slice(2),
      },
      lighting: {
        type: lightingCondition,
        colorTemperature: temperature,
        intensity: 95,
      },
    },
    {
      id: sceneId,
      name: "Candidate Scene",
      colorPalette: {
        primary: palette.slice().reverse().slice(0, 2),
        secondary: palette.slice(1),
      },
      lighting: {
        type: lightingCondition,
        colorTemperature: temperature + 600,
        intensity: 80,
      },
    },
  ];
}

export async function handleVisualConsistency(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const sceneId =
    asString(payload["sceneId"]) || randomUUID();
  const lightingCondition =
    asString(payload["lightingCondition"]) || "daylight";
  const colors = parseList(payload["referenceColors"]);
  const palette =
    colors.length > 0 ? colors : ["#2E3A59", "#C58A4B", "#E6D7C3"];

  const scenes = buildScenePair(sceneId, palette, lightingCondition);
  const result = await runPlugin(VisualConsistencyAnalyzer, {
    type: "analyze",
    data: {
      scenes,
      referenceScene: `${sceneId}-reference`,
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر تحليل الاتساق البصري");
  }

  return success({ data: result.data ?? {} });
}

export async function handleTerminologyTranslation(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const term = asString(payload["term"]);
  const sourceLang = asString(payload["sourceLang"]) || "en";
  const targetLang = asString(payload["targetLang"]) || "ar";

  if (!term) {
    return failure("المصطلح مطلوب");
  }

  const result = await runPlugin(TerminologyTranslator, {
    type: "translate",
    data: { text: term, from: sourceLang, to: targetLang },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر ترجمة المصطلح");
  }

  return success({ data: result.data ?? {} });
}

function buildBudgetCategories(
  categories: string[],
  requestPerCategory: number,
  priority: string
) {
  return categories.map((category, index) => ({
    name: slugify(category),
    nameAr: category,
    requested: requestPerCategory + index * 250,
    priority:
      priority === "quality"
        ? "high"
        : priority === "cost"
          ? "medium"
          : index === 0
            ? "critical"
            : "high",
    flexibility: priority === "cost" ? 0.5 : 0.2,
  }));
}

export async function handleBudgetOptimization(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const totalBudget = Math.max(asNumber(payload["totalBudget"]), 1);
  const categories = parseList(payload["categories"]);
  const priority = asString(payload["priority"]) || "balanced";
  const categoryWeight =
    priority === "quality" ? 1.08 : priority === "cost" ? 0.92 : 1;
  const baseCategories =
    categories.length > 0
      ? categories
      : ["الديكور", "الإضاءة", "الإكسسوارات"];
  const requestPerCategory = Math.round(
    (totalBudget / baseCategories.length) * categoryWeight
  );

  const result = await runPlugin(BudgetOptimizer, {
    type: "optimize",
    data: {
      totalBudget,
      currency: "USD",
      categories: buildBudgetCategories(
        baseCategories,
        requestPerCategory,
        priority
      ),
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر تحسين الميزانية");
  }

  return success({ data: result.data ?? {} });
}

const TIME_OF_DAY_MAP: Record<string, string> = {
  dawn: "dawn",
  morning: "morning",
  noon: "midday",
  afternoon: "afternoon",
  sunset: "sunset",
  night: "night",
};

export async function handleLightingSimulation(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const location = asString(payload["location"]) || "interior";
  const timeOfDay = asString(payload["timeOfDay"]) || "morning";
  const mood = asString(payload["mood"]) || "dramatic";

  const result = await runPlugin(LightingSimulator, {
    type: "simulate",
    data: {
      scene: {
        location,
        timeOfDay: TIME_OF_DAY_MAP[timeOfDay] ?? "morning",
        mood,
      },
      style: mood.includes("رومان") ? "romantic" : "dramatic",
      budget: "medium",
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر محاكاة الإضاءة");
  }

  return success({ data: result.data ?? {} });
}

export async function handleRiskAnalysis(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const budget = Math.max(asNumber(payload["budget"]), 1000);
  const timeline = Math.max(asNumber(payload["timeline"]), 1);
  const projectPhase = asString(payload["projectPhase"]) || "production";
  const isProduction = projectPhase === "production";

  const result = await runPlugin(RiskAnalyzer, {
    type: "analyze",
    data: {
      project: {
        name: `Art Director ${projectPhase}`,
        budget,
        duration: timeline,
        locations: [
          {
            name: "Primary Set",
            type: projectPhase === "pre-production" ? "indoor" : "outdoor",
          },
        ],
        crew: { size: 12, departments: ["art", "props", "locations"] },
        specialRequirements: isProduction ? ["night-shoot"] : [],
      },
      production: {
        hasStunts: false,
        hasSpecialEffects: isProduction,
        hasAnimals: false,
        hasChildren: false,
        hasWaterScenes: false,
        hasNightShoots: isProduction,
      },
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر تحليل المخاطر");
  }

  return success({ data: result.data ?? {} });
}

export async function handleProductionReadinessPrompt(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const projectName = asString(payload["projectName"]) || "art-director";
  const department = asString(payload["department"]) || "art";
  const checklistType = asString(payload["checklistType"]) || "full";
  const store = await readStore();

  const result = await runPlugin(ProductionReadinessReportPromptBuilder, {
    type: "build-prompt",
    data: {
      owner: "the-copy",
      repo: projectName,
      analysisData: {
        languages: ["TypeScript", "CSS"],
        hasPackageJson: true,
        hasTests: true,
        hasCI: true,
        hasReadme: true,
        hasGitignore: true,
        fileStructure: [
          "app/(main)/art-director",
          "apps/backend/src/modules/art-director/routes.ts",
          `stored-locations=${store.locations.length}`,
          `stored-set-pieces=${store.setPieces.length}`,
          `department=${department}`,
          `checklist=${checklistType}`,
        ],
      },
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر توليد موجه الجاهزية");
  }

  return success({ data: result.data ?? {} });
}
