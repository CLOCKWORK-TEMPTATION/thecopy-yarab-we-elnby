// Plugin Routes

import { Router, Request, Response } from "express";
import { pluginManager } from "../../core/PluginManager";
import { PluginCategorySchema } from "../../types";
import { getRouteParam, getRequestBody, toPluginInput } from "../utils";

const router = Router();

// Health check
router.get("/health", (_req: Request, res: Response) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    initialized: pluginManager.isInitialized(),
  });
});

// Get all plugins
router.get("/plugins", (_req: Request, res: Response) => {
  const plugins = pluginManager.getPluginInfo();
  res.json({
    success: true,
    count: plugins.length,
    plugins,
  });
});

// Get plugin by ID
router.get("/plugins/:id", (req: Request, res: Response) => {
  const pluginId = getRouteParam(req, "id");
  if (!pluginId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required route parameter "id"',
    });
  }

  const plugin = pluginManager.getPlugin(pluginId);
  if (!plugin) {
    return res.status(404).json({
      success: false,
      error: `Plugin "${pluginId}" not found`,
    });
  }

  return res.json({
    success: true,
    plugin: {
      id: plugin.id,
      name: plugin.name,
      nameAr: plugin.nameAr,
      version: plugin.version,
      description: plugin.description,
      descriptionAr: plugin.descriptionAr,
      category: plugin.category,
    },
  });
});

// Get plugins by category
router.get("/plugins/category/:category", (req: Request, res: Response) => {
  const categoryParam = getRouteParam(req, "category");
  if (!categoryParam) {
    return res.status(400).json({
      success: false,
      error: 'Missing required route parameter "category"',
    });
  }

  const parsedCategory = PluginCategorySchema.safeParse(categoryParam);
  if (!parsedCategory.success) {
    return res.status(400).json({
      success: false,
      error: `Invalid plugin category "${categoryParam}"`,
    });
  }

  const plugins = pluginManager.getPluginsByCategory(parsedCategory.data);
  return res.json({
    success: true,
    category: parsedCategory.data,
    count: plugins.length,
    plugins: plugins.map((p) => ({
      id: p.id,
      name: p.name,
      nameAr: p.nameAr,
      version: p.version,
    })),
  });
});

// Execute plugin
router.post("/plugins/:id/execute", async (req: Request, res: Response) => {
  const pluginId = getRouteParam(req, "id");
  if (!pluginId) {
    return res.status(400).json({
      success: false,
      error: 'Missing required route parameter "id"',
    });
  }

  const input = toPluginInput(getRequestBody(req));

  if (!input?.type) {
    return res.status(400).json({
      success: false,
      error: 'Invalid input: "type" field is required',
    });
  }

  const result = await pluginManager.executePlugin(pluginId, input);
  return res.json(result);
});

// Visual Consistency Analysis endpoint
router.post(
  "/analyze/visual-consistency",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("visual-analyzer", {
      type: "analyze",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

// Terminology Translation endpoint
router.post("/translate/cinema-terms", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("terminology-translator", {
    type: "translate",
    data: getRequestBody(req),
  });
  res.json(result);
});

// Budget Optimization endpoint
router.post("/optimize/budget", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("budget-optimizer", {
    type: "optimize",
    data: getRequestBody(req),
  });
  res.json(result);
});

// Risk Analysis endpoint
router.post("/analyze/risks", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("risk-analyzer", {
    type: "analyze",
    data: getRequestBody(req),
  });
  res.json(result);
});

// Lighting Simulation endpoint
router.post("/simulate/lighting", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("lighting-simulator", {
    type: "simulate",
    data: getRequestBody(req),
  });
  res.json(result);
});

// Production Readiness Report prompt endpoint
router.post(
  "/analyze/production-readiness",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "production-readiness-report",
      {
        type: "build-prompt",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

// Creative Inspiration endpoints
router.post("/inspiration/analyze", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("creative-inspiration", {
    type: "analyze",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/inspiration/moodboard", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("creative-inspiration", {
    type: "generate-moodboard",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/inspiration/palette", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("creative-inspiration", {
    type: "suggest-palette",
    data: getRequestBody(req),
  });
  res.json(result);
});

// Location Coordinator endpoints
router.post("/locations/add", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("location-coordinator", {
    type: "add-location",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/locations/search", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("location-coordinator", {
    type: "search",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/locations/match", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("location-coordinator", {
    type: "match",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/sets/add", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("location-coordinator", {
    type: "add-set",
    data: getRequestBody(req),
  });
  res.json(result);
});

// Set Reusability endpoints
router.post("/sets/reusability", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("set-reusability", {
    type: "analyze",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/sets/inventory", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("set-reusability", {
    type: "inventory",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/sets/add-piece", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("set-reusability", {
    type: "add-piece",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/sets/find-reusable", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("set-reusability", {
    type: "find-reusable",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/sets/sustainability-report",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("set-reusability", {
      type: "sustainability-report",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

// Productivity Analyzer endpoints
router.post("/analyze/productivity", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("productivity-analyzer", {
    type: "analyze",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/productivity/log-time", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("productivity-analyzer", {
    type: "log-time",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/productivity/report-delay",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("productivity-analyzer", {
      type: "report-delay",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/productivity/recommendations",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("productivity-analyzer", {
      type: "recommendations",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

// Documentation Generator endpoints
router.post("/documentation/generate", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("documentation-generator", {
    type: "generate-book",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/documentation/style-guide",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "documentation-generator",
      {
        type: "generate-style-guide",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/documentation/log-decision",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "documentation-generator",
      {
        type: "log-decision",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post("/documentation/export", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("documentation-generator", {
    type: "export-book",
    data: getRequestBody(req),
  });
  res.json(result);
});

export default router;
