import {
  handleDocumentationState,
  handleDocumentationGenerate,
  handleDocumentationStyleGuide,
  handleDocumentationDecision,
  handleDocumentationExport,
} from "./handlers-documentation";
import { handleInspirationAnalyze, handleInspirationPalette } from "./handlers-inspiration";
import { handleLocationSearch, handleLocationAdd } from "./handlers-location";
import {
  handleProductivitySummary,
  handleProductivityAnalyze,
  handleProductivityLogTime,
  handleProductivityDelay,
  handleProductivityRecommendations,
} from "./handlers-productivity";
import {
  handleSetReusabilityAnalyze,
  handleSetPieceAdd,
  handleSetInventory,
  handleSustainabilityReport,
} from "./handlers-set-piece";
import {
  type ArtDirectorHandlerResponse,
  success,
  failure,
  asRecord,
  asString,
} from "./handlers-shared";
import {
  handlePrevizCreateScene,
  handleVirtualSetCreate,
  handleTrainingScenarios,
  handleConceptArtCreate,
  handleVirtualProductionCreate,
} from "./handlers-virtual-production";
import {
  handleVisualConsistency,
  handleTerminologyTranslation,
  handleBudgetOptimization,
  handleLightingSimulation,
  handleRiskAnalysis,
  handleProductionReadinessPrompt,
} from "./handlers-visual";
import { BudgetOptimizer } from "./plugins/budget-optimizer";
import { CinemaSkillsTrainer } from "./plugins/cinema-skills-trainer";
import { CreativeInspirationAssistant } from "./plugins/creative-inspiration";
import { AutomaticDocumentationGenerator } from "./plugins/documentation-generator";
import { ImmersiveConceptArt } from "./plugins/immersive-concept-art";
import { LightingSimulator } from "./plugins/lighting-simulator";
import { LocationSetCoordinator } from "./plugins/location-coordinator";
import { MRPrevizStudio } from "./plugins/mr-previz-studio";
import { ProductionReadinessReportPromptBuilder } from "./plugins/production-readiness-report";
import { PerformanceProductivityAnalyzer } from "./plugins/productivity-analyzer";
import { RiskAnalyzer } from "./plugins/risk-analyzer";
import { SetReusabilityOptimizer } from "./plugins/set-reusability";
import { TerminologyTranslator } from "./plugins/terminology-translator";
import { VirtualProductionEngine } from "./plugins/virtual-production-engine";
import { VirtualSetEditor } from "./plugins/virtual-set-editor";
import { VisualConsistencyAnalyzer } from "./plugins/visual-analyzer";
import { readStore, type ArtDirectorStore } from "./store";

import type { PluginInfo } from "./types";

export type { ArtDirectorHandlerResponse };

type PluginMetadataFactory = new () => {
    id: string;
    name: string;
    nameAr: string;
    version: string;
    category: string;
  };

const PLUGIN_METADATA_FACTORIES: PluginMetadataFactory[] = [
  VisualConsistencyAnalyzer,
  TerminologyTranslator,
  BudgetOptimizer,
  LightingSimulator,
  RiskAnalyzer,
  ProductionReadinessReportPromptBuilder,
  CreativeInspirationAssistant,
  LocationSetCoordinator,
  SetReusabilityOptimizer,
  PerformanceProductivityAnalyzer,
  AutomaticDocumentationGenerator,
  MRPrevizStudio,
  VirtualSetEditor,
  CinemaSkillsTrainer,
  ImmersiveConceptArt,
  VirtualProductionEngine,
];

function getPluginCatalog(): PluginInfo[] {
  return PLUGIN_METADATA_FACTORIES.map((Factory) => {
    const plugin = new Factory();
    return {
      id: plugin.id,
      name: plugin.name,
      nameAr: plugin.nameAr,
      version: plugin.version,
      category: plugin.category,
    };
  });
}

function computeDashboardSummary(
  store: ArtDirectorStore
): Record<string, unknown> {
  const uniqueProjects = new Set<string>();

  store.productionBooks.forEach((b) => uniqueProjects.add(b.productionId));
  store.styleGuides.forEach((g) => uniqueProjects.add(g.productionId));
  store.decisions.forEach((d) => uniqueProjects.add(d.productionId));
  store.conceptProjects.forEach((p) => {
    const id = asString(p["id"]);
    if (id) uniqueProjects.add(id);
  });
  store.virtualProductions.forEach((p) => {
    const id = asString(p["id"]);
    if (id) uniqueProjects.add(id);
  });

  return {
    projectsActive: uniqueProjects.size,
    locationsCount: store.locations.length,
    setsCount: store.setPieces.length,
    completedTasks: store.timeEntries.filter(
      (e) => e.status === "completed"
    ).length,
    pluginsCount: getPluginCatalog().length,
    lastUpdated: store.updatedAt,
  };
}

async function handleHealth(): Promise<ArtDirectorHandlerResponse> {
  const store = await readStore();
  return success({
    status: "ok",
    storage: { available: true, updatedAt: store.updatedAt },
    summary: computeDashboardSummary(store),
  });
}

async function handlePlugins(): Promise<ArtDirectorHandlerResponse> {
  const plugins = getPluginCatalog();
  return success({ plugins, count: plugins.length });
}

async function handleDashboardSummary(): Promise<ArtDirectorHandlerResponse> {
  const store = await readStore();
  return success({ summary: computeDashboardSummary(store) });
}

type OptionalRouteResponse = Promise<ArtDirectorHandlerResponse> |
  ArtDirectorHandlerResponse | undefined;

function handleGetRoute(
  routePath: string,
  payload: Record<string, unknown>
): OptionalRouteResponse {
  switch (routePath) {
    case "health":
      return handleHealth();
    case "plugins":
      return handlePlugins();
    case "dashboard/summary":
      return handleDashboardSummary();
    case "productivity/summary":
      return handleProductivitySummary();
    case "documentation/state":
      return handleDocumentationState();
    case "training/scenarios":
      return handleTrainingScenarios(payload);
    default:
      return undefined;
  }
}
function handleAnalyzePostRoute(
  routePath: string,
  payload: Record<string, unknown>
): OptionalRouteResponse {
  switch (routePath) {
    case "analyze/visual-consistency":
      return handleVisualConsistency(payload);
    case "analyze/risks":
      return handleRiskAnalysis(payload);
    case "analyze/production-readiness":
      return handleProductionReadinessPrompt(payload);
    case "analyze/productivity":
      return handleProductivityAnalyze(payload);
    default:
      return undefined;
  }
}
function handleProductionPostRoute(
  routePath: string,
  payload: Record<string, unknown>
): OptionalRouteResponse {
  switch (routePath) {
    case "translate/cinema-terms":
      return handleTerminologyTranslation(payload);
    case "optimize/budget":
      return handleBudgetOptimization(payload);
    case "simulate/lighting":
      return handleLightingSimulation(payload);
    case "training/scenarios":
      return handleTrainingScenarios(payload);
    case "concept-art/create-project":
      return handleConceptArtCreate(payload);
    case "virtual-production/create":
      return handleVirtualProductionCreate(payload);
    default:
      return undefined;
  }
}
function handleInspirationLocationPostRoute(
  routePath: string,
  payload: Record<string, unknown>
): OptionalRouteResponse {
  switch (routePath) {
    case "inspiration/analyze":
      return handleInspirationAnalyze(payload);
    case "inspiration/palette":
      return handleInspirationPalette(payload);
    case "locations/search":
      return handleLocationSearch(payload);
    case "locations/add":
      return handleLocationAdd(payload);
    default:
      return undefined;
  }
}
function handleSetProductivityPostRoute(
  routePath: string,
  payload: Record<string, unknown>
): OptionalRouteResponse {
  switch (routePath) {
    case "sets/reusability":
      return handleSetReusabilityAnalyze(payload);
    case "sets/add-piece":
      return handleSetPieceAdd(payload);
    case "sets/inventory":
      return handleSetInventory(payload);
    case "sets/sustainability-report":
      return handleSustainabilityReport();
    case "productivity/log-time":
      return handleProductivityLogTime(payload);
    case "productivity/report-delay":
      return handleProductivityDelay(payload);
    case "productivity/recommendations":
      return handleProductivityRecommendations();
    default:
      return undefined;
  }
}
function handleDocumentationXrPostRoute(
  routePath: string,
  payload: Record<string, unknown>
): OptionalRouteResponse {
  switch (routePath) {
    case "documentation/generate":
      return handleDocumentationGenerate(payload);
    case "documentation/style-guide":
      return handleDocumentationStyleGuide(payload);
    case "documentation/log-decision":
      return handleDocumentationDecision(payload);
    case "documentation/export":
      return handleDocumentationExport(payload);
    case "xr/previz/create-scene":
      return handlePrevizCreateScene(payload);
    case "xr/set-editor/create":
      return handleVirtualSetCreate(payload);
    default:
      return undefined;
  }
}
function handlePostRoute(
  routePath: string,
  payload: Record<string, unknown>
): OptionalRouteResponse {
  return (
    handleAnalyzePostRoute(routePath, payload) ??
    handleProductionPostRoute(routePath, payload) ??
    handleInspirationLocationPostRoute(routePath, payload) ??
    handleSetProductivityPostRoute(routePath, payload) ??
    handleDocumentationXrPostRoute(routePath, payload)
  );
}

export async function handleArtDirectorRequest(params: {
  method: "GET" | "POST";
  path: string[];
  body?: unknown;
  searchParams?: URLSearchParams;
}): Promise<ArtDirectorHandlerResponse> {
  const routePath = params.path.join("/");

  const payload = {
    ...Object.fromEntries(params.searchParams?.entries() ?? []),
    ...asRecord(params.body),
  };

  const response =
    params.method === "GET"
      ? handleGetRoute(routePath, payload)
      : handlePostRoute(routePath, payload);

  return response ?? failure(`المسار غير مدعوم: ${routePath}`, 404);
}
