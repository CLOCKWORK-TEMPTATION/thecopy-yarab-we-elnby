import type { PluginInfo } from "./types";
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
import {
  type ArtDirectorHandlerResponse,
  success,
  failure,
  asRecord,
  asString,
} from "./handlers-shared";
import {
  handleVisualConsistency,
  handleTerminologyTranslation,
  handleBudgetOptimization,
  handleLightingSimulation,
  handleRiskAnalysis,
  handleProductionReadinessPrompt,
} from "./handlers-visual";
import {
  handleInspirationAnalyze,
  handleInspirationPalette,
} from "./handlers-inspiration";
import {
  handleLocationSearch,
  handleLocationAdd,
} from "./handlers-location";
import {
  handleSetReusabilityAnalyze,
  handleSetPieceAdd,
  handleSetInventory,
  handleSustainabilityReport,
} from "./handlers-set-piece";
import {
  handleProductivitySummary,
  handleProductivityAnalyze,
  handleProductivityLogTime,
  handleProductivityDelay,
  handleProductivityRecommendations,
} from "./handlers-productivity";
import {
  handleDocumentationState,
  handleDocumentationGenerate,
  handleDocumentationStyleGuide,
  handleDocumentationDecision,
  handleDocumentationExport,
} from "./handlers-documentation";
import {
  handlePrevizCreateScene,
  handleVirtualSetCreate,
  handleTrainingScenarios,
  handleConceptArtCreate,
  handleVirtualProductionCreate,
} from "./handlers-virtual-production";

export type { ArtDirectorHandlerResponse };

type PluginMetadataFactory = {
  new (): {
    id: string;
    name: string;
    nameAr: string;
    version: string;
    category: string;
  };
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
      (e) => e["status"] === "completed"
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

type RouteHandler = (
  payload: Record<string, unknown>
) => Promise<ArtDirectorHandlerResponse> | ArtDirectorHandlerResponse;

const ROUTE_HANDLERS = new Map<string, RouteHandler>([
  ["GET health", () => handleHealth()],
  ["GET plugins", () => handlePlugins()],
  ["GET dashboard/summary", () => handleDashboardSummary()],
  ["GET productivity/summary", () => handleProductivitySummary()],
  ["GET documentation/state", () => handleDocumentationState()],
  ["GET training/scenarios", (payload) => handleTrainingScenarios(payload)],
  ["POST analyze/visual-consistency", (payload) => handleVisualConsistency(payload)],
  ["POST translate/cinema-terms", (payload) => handleTerminologyTranslation(payload)],
  ["POST optimize/budget", (payload) => handleBudgetOptimization(payload)],
  ["POST simulate/lighting", (payload) => handleLightingSimulation(payload)],
  ["POST analyze/risks", (payload) => handleRiskAnalysis(payload)],
  [
    "POST analyze/production-readiness",
    (payload) => handleProductionReadinessPrompt(payload),
  ],
  ["POST inspiration/analyze", (payload) => handleInspirationAnalyze(payload)],
  ["POST inspiration/palette", (payload) => handleInspirationPalette(payload)],
  ["POST locations/search", (payload) => handleLocationSearch(payload)],
  ["POST locations/add", (payload) => handleLocationAdd(payload)],
  ["POST sets/reusability", (payload) => handleSetReusabilityAnalyze(payload)],
  ["POST sets/add-piece", (payload) => handleSetPieceAdd(payload)],
  ["POST sets/inventory", (payload) => handleSetInventory(payload)],
  ["POST sets/sustainability-report", () => handleSustainabilityReport()],
  ["POST analyze/productivity", (payload) => handleProductivityAnalyze(payload)],
  ["POST productivity/log-time", (payload) => handleProductivityLogTime(payload)],
  ["POST productivity/report-delay", (payload) => handleProductivityDelay(payload)],
  ["POST productivity/recommendations", () => handleProductivityRecommendations()],
  ["POST documentation/generate", (payload) => handleDocumentationGenerate(payload)],
  ["POST documentation/style-guide", (payload) => handleDocumentationStyleGuide(payload)],
  ["POST documentation/log-decision", (payload) => handleDocumentationDecision(payload)],
  ["POST documentation/export", (payload) => handleDocumentationExport(payload)],
  ["POST xr/previz/create-scene", (payload) => handlePrevizCreateScene(payload)],
  ["POST xr/set-editor/create", (payload) => handleVirtualSetCreate(payload)],
  ["POST training/scenarios", (payload) => handleTrainingScenarios(payload)],
  ["POST concept-art/create-project", (payload) => handleConceptArtCreate(payload)],
  [
    "POST virtual-production/create",
    (payload) => handleVirtualProductionCreate(payload),
  ],
]);

export async function handleArtDirectorRequest(params: {
  method: "GET" | "POST";
  path: string[];
  body?: unknown;
  searchParams?: URLSearchParams;
}): Promise<ArtDirectorHandlerResponse> {
  const routePath = params.path.join("/");
  const routeKey = `${params.method} ${routePath}`;

  const payload = {
    ...Object.fromEntries(params.searchParams?.entries() ?? []),
    ...asRecord(params.body),
  };

  const handler = ROUTE_HANDLERS.get(routeKey);
  return handler ? handler(payload) : failure(`المسار غير مدعوم: ${routePath}`, 404);
}
