// CineArchitect AI - Main Application Entry Point
// نقطة الدخول الرئيسية للتطبيق

import cors from "cors";
import express from "express";

import { logger } from "@/lib/logger";

import { router } from "./api/routes";
import { pluginManager } from "./core/PluginManager";

// Import plugins
import { budgetOptimizer } from "./plugins/budget-optimizer";
import { cinemaSkillsTrainer } from "./plugins/cinema-skills-trainer";
import { creativeInspiration } from "./plugins/creative-inspiration";
import { documentationGenerator } from "./plugins/documentation-generator";
import { immersiveConceptArt } from "./plugins/immersive-concept-art";
import { lightingSimulator } from "./plugins/lighting-simulator";
import { locationCoordinator } from "./plugins/location-coordinator";
import { mrPrevizStudio } from "./plugins/mr-previz-studio";
import { productionReadinessReportPromptBuilder } from "./plugins/production-readiness-report";
import { productivityAnalyzer } from "./plugins/productivity-analyzer";
import { riskAnalyzer } from "./plugins/risk-analyzer";
import { setReusability } from "./plugins/set-reusability";
import { terminologyTranslator } from "./plugins/terminology-translator";
import { virtualProductionEngine } from "./plugins/virtual-production-engine";
import { virtualSetEditor } from "./plugins/virtual-set-editor";
import { visualAnalyzer } from "./plugins/visual-analyzer";

const PORT = parseInt(process.env["API_PORT"] ?? "3001", 10);
const HOST = "0.0.0.0";

async function bootstrap(): Promise<void> {
  logger.info("");
  logger.info(
    "╔═══════════════════════════════════════════════════════════════╗"
  );
  logger.info(
    "║                     CineArchitect AI                          ║"
  );
  logger.info(
    "║              Art Director Tools Suite v1.0.0                  ║"
  );
  logger.info(
    "║         مجموعة أدوات الارت ديركتور - النسخة 1.0.0             ║"
  );
  logger.info(
    "╚═══════════════════════════════════════════════════════════════╝"
  );
  logger.info("");

  // Register all plugins
  logger.info("[CineArchitect] Registering plugins...");

  pluginManager.registerPlugin(visualAnalyzer);
  pluginManager.registerPlugin(terminologyTranslator);
  pluginManager.registerPlugin(budgetOptimizer);
  pluginManager.registerPlugin(lightingSimulator);
  pluginManager.registerPlugin(riskAnalyzer);
  pluginManager.registerPlugin(productionReadinessReportPromptBuilder);
  pluginManager.registerPlugin(creativeInspiration);
  pluginManager.registerPlugin(locationCoordinator);
  pluginManager.registerPlugin(setReusability);
  pluginManager.registerPlugin(productivityAnalyzer);
  pluginManager.registerPlugin(documentationGenerator);
  pluginManager.registerPlugin(mrPrevizStudio);
  pluginManager.registerPlugin(virtualSetEditor);
  pluginManager.registerPlugin(cinemaSkillsTrainer);
  pluginManager.registerPlugin(immersiveConceptArt);
  pluginManager.registerPlugin(virtualProductionEngine);

  // Initialize all plugins
  await pluginManager.initializeAll();

  // Create Express app
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Welcome route
  app.get("/", (_req, res) => {
    res.json({
      name: "CineArchitect AI",
      nameAr: "سينماركيتكت إيه آي",
      version: "1.0.0",
      description:
        "Comprehensive ecosystem for Art Directors in film production",
      descriptionAr: "نظام بيئي متكامل لمديري الفن في الإنتاج السينمائي",
      endpoints: {
        health: "/api/health",
        plugins: "/api/plugins",
        visualAnalysis: "POST /api/analyze/visual-consistency",
        translate: "POST /api/translate/cinema-terms",
        budget: "POST /api/optimize/budget",
        lighting: "POST /api/simulate/lighting",
        risks: "POST /api/analyze/risks",
        inspiration: "POST /api/inspiration/analyze",
        locations: "POST /api/locations/search",
        reusability: "POST /api/sets/reusability",
        productivity: "POST /api/analyze/productivity",
        documentation: "POST /api/documentation/generate",
        mrPreviz: "POST /api/xr/previz/*",
        virtualSetEditor: "POST /api/xr/set-editor/*",
        cinemaTrainer: "POST /api/training/*",
        conceptArt: "POST /api/concept-art/*",
        virtualProduction: "POST /api/virtual-production/*",
      },
    });
  });

  // API routes
  app.use("/api", router);

  // Error handling
  app.use((err: Error, _req: express.Request, res: express.Response) => {
    logger.error("[CineArchitect] Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  });

  // Start server
  app.listen(PORT, HOST, () => {
    logger.info("");
    logger.info(`[CineArchitect] Server running on http://${HOST}:${PORT}`);
    logger.info("");
    logger.info("Available Plugins / الإضافات المتاحة:");
    logger.info("─────────────────────────────────────");

    const plugins = pluginManager.getPluginInfo();
    plugins.forEach((plugin, index) => {
      logger.info(`  ${index + 1}. ${plugin.name}`);
      logger.info(`     ${plugin.nameAr}`);
      logger.info(
        `     Category: ${plugin.category} | Version: ${plugin.version}`
      );
      logger.info("");
    });

    logger.info("API Endpoints:");
    logger.info("─────────────────────────────────────");
    logger.info("  GET  /api/health              - Health check");
    logger.info("  GET  /api/plugins             - List all plugins");
    logger.info("  POST /api/plugins/:id/execute - Execute plugin");
    logger.info("  POST /api/analyze/visual-consistency");
    logger.info("  POST /api/translate/cinema-terms");
    logger.info("  POST /api/optimize/budget");
    logger.info("  POST /api/simulate/lighting");
    logger.info("  POST /api/analyze/risks");
    logger.info("  POST /api/analyze/production-readiness");
    logger.info("  POST /api/inspiration/analyze");
    logger.info("  POST /api/locations/search");
    logger.info("  POST /api/sets/reusability");
    logger.info("  POST /api/analyze/productivity");
    logger.info("  POST /api/documentation/generate");
    logger.info("");
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    logger.info("\n[CineArchitect] Shutting down...");
    await pluginManager.shutdownAll();
    logger.info("[CineArchitect] Goodbye! مع السلامة");
    process.exit(0);
  });
}

// Run the application
bootstrap().catch((error) => {
  logger.error("[CineArchitect] Failed to start:", error);
  process.exit(1);
});
