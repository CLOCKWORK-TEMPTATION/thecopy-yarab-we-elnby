// CineArchitect AI - Main Application Entry Point
// نقطة الدخول الرئيسية للتطبيق

import cors from "cors";
import express from "express";

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
  console.log("");
  console.log(
    "╔═══════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║                     CineArchitect AI                          ║"
  );
  console.log(
    "║              Art Director Tools Suite v1.0.0                  ║"
  );
  console.log(
    "║         مجموعة أدوات الارت ديركتور - النسخة 1.0.0             ║"
  );
  console.log(
    "╚═══════════════════════════════════════════════════════════════╝"
  );
  console.log("");

  // Register all plugins
  console.log("[CineArchitect] Registering plugins...");

  await pluginManager.registerPlugin(visualAnalyzer);
  await pluginManager.registerPlugin(terminologyTranslator);
  await pluginManager.registerPlugin(budgetOptimizer);
  await pluginManager.registerPlugin(lightingSimulator);
  await pluginManager.registerPlugin(riskAnalyzer);
  await pluginManager.registerPlugin(productionReadinessReportPromptBuilder);
  await pluginManager.registerPlugin(creativeInspiration);
  await pluginManager.registerPlugin(locationCoordinator);
  await pluginManager.registerPlugin(setReusability);
  await pluginManager.registerPlugin(productivityAnalyzer);
  await pluginManager.registerPlugin(documentationGenerator);
  await pluginManager.registerPlugin(mrPrevizStudio);
  await pluginManager.registerPlugin(virtualSetEditor);
  await pluginManager.registerPlugin(cinemaSkillsTrainer);
  await pluginManager.registerPlugin(immersiveConceptArt);
  await pluginManager.registerPlugin(virtualProductionEngine);

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
    console.error("[CineArchitect] Error:", err.message);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  });

  // Start server
  app.listen(PORT, HOST, () => {
    console.log("");
    console.log(`[CineArchitect] Server running on http://${HOST}:${PORT}`);
    console.log("");
    console.log("Available Plugins / الإضافات المتاحة:");
    console.log("─────────────────────────────────────");

    const plugins = pluginManager.getPluginInfo();
    plugins.forEach((plugin, index) => {
      console.log(`  ${index + 1}. ${plugin.name}`);
      console.log(`     ${plugin.nameAr}`);
      console.log(
        `     Category: ${plugin.category} | Version: ${plugin.version}`
      );
      console.log("");
    });

    console.log("API Endpoints:");
    console.log("─────────────────────────────────────");
    console.log("  GET  /api/health              - Health check");
    console.log("  GET  /api/plugins             - List all plugins");
    console.log("  POST /api/plugins/:id/execute - Execute plugin");
    console.log("  POST /api/analyze/visual-consistency");
    console.log("  POST /api/translate/cinema-terms");
    console.log("  POST /api/optimize/budget");
    console.log("  POST /api/simulate/lighting");
    console.log("  POST /api/analyze/risks");
    console.log("  POST /api/analyze/production-readiness");
    console.log("  POST /api/inspiration/analyze");
    console.log("  POST /api/locations/search");
    console.log("  POST /api/sets/reusability");
    console.log("  POST /api/analyze/productivity");
    console.log("  POST /api/documentation/generate");
    console.log("");
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\n[CineArchitect] Shutting down...");
    await pluginManager.shutdownAll();
    console.log("[CineArchitect] Goodbye! مع السلامة");
    process.exit(0);
  });
}

// Run the application
bootstrap().catch((error) => {
  console.error("[CineArchitect] Failed to start:", error);
  process.exit(1);
});
