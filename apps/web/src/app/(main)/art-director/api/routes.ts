// CineArchitect AI - API Routes
// مسارات الواجهة البرمجية

import { Router, Request, Response } from "express";

import { pluginManager } from "../core/PluginManager";
import { PluginCategorySchema, PluginInput } from "../types";

export const router = Router();

function getRouteParam(req: Request, paramName: string): string | null {
  const value = req.params[paramName];

  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  return value;
}

function getRequestBody(req: Request): Record<string, unknown> {
  const body: unknown = req.body;
  return typeof body === "object" && body !== null
    ? (body as Record<string, unknown>)
    : {};
}

function toPluginInput(body: Record<string, unknown>): PluginInput {
  const data = body["data"];
  const options = body["options"];

  return {
    type: typeof body["type"] === "string" ? body["type"] : "",
    data:
      typeof data === "object" && data !== null
        ? (data as Record<string, unknown>)
        : {},
    options:
      typeof options === "object" && options !== null
        ? (options as Record<string, unknown>)
        : undefined,
  };
}

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

// =====================================================
// Mixed Reality Pre-visualization Studio endpoints
// استوديو التصور المسبق بالواقع المختلط
// =====================================================

router.post("/xr/previz/create-scene", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("mr-previz-studio", {
    type: "create-scene",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/xr/previz/add-object", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("mr-previz-studio", {
    type: "add-object",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/xr/previz/setup-camera", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("mr-previz-studio", {
    type: "setup-camera",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/xr/previz/simulate-movement",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("mr-previz-studio", {
      type: "simulate-movement",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post("/xr/previz/ar-preview", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("mr-previz-studio", {
    type: "ar-preview",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/xr/previz/vr-walkthrough",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("mr-previz-studio", {
      type: "vr-walkthrough",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.get("/xr/previz/devices", async (_req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("mr-previz-studio", {
    type: "get-devices",
    data: {},
  });
  res.json(result);
});

router.get("/xr/previz/scenes", async (_req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("mr-previz-studio", {
    type: "list-scenes",
    data: {},
  });
  res.json(result);
});

// =====================================================
// Virtual Set Editor endpoints
// محرر الديكورات الافتراضي في الموقع
// =====================================================

router.post("/xr/set-editor/create", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("virtual-set-editor", {
    type: "create-set",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/xr/set-editor/add-element",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("virtual-set-editor", {
      type: "add-element",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/xr/set-editor/modify-element",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("virtual-set-editor", {
      type: "modify-element",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/xr/set-editor/adjust-lighting",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("virtual-set-editor", {
      type: "adjust-lighting",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post("/xr/set-editor/add-cgi", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("virtual-set-editor", {
    type: "add-cgi",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/xr/set-editor/preview", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("virtual-set-editor", {
    type: "real-time-preview",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/xr/set-editor/share", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("virtual-set-editor", {
    type: "share-vision",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/xr/set-editor/color-grade",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("virtual-set-editor", {
      type: "color-grade",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.get("/xr/set-editor/list", async (_req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("virtual-set-editor", {
    type: "list-sets",
    data: {},
  });
  res.json(result);
});

// =====================================================
// Cinema Skills Trainer endpoints
// المدرب الافتراضي للمهارات السينمائية
// =====================================================

router.get("/training/scenarios", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("cinema-skills-trainer", {
    type: "list-scenarios",
    data: req.query,
  });
  res.json(result);
});

router.post("/training/start", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("cinema-skills-trainer", {
    type: "start-scenario",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.get("/training/equipment", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("cinema-skills-trainer", {
    type: "get-equipment",
    data: req.query,
  });
  res.json(result);
});

router.post("/training/simulate", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("cinema-skills-trainer", {
    type: "simulate-equipment",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/training/evaluate", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("cinema-skills-trainer", {
    type: "evaluate-performance",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/training/complete", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("cinema-skills-trainer", {
    type: "complete-scenario",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.get(
  "/training/progress/:traineeId",
  async (req: Request, res: Response) => {
    const traineeId = getRouteParam(req, "traineeId");
    if (!traineeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required route parameter "traineeId"',
      });
    }

    const result = await pluginManager.executePlugin("cinema-skills-trainer", {
      type: "get-progress",
      data: { traineeId },
    });
    return res.json(result);
  }
);

router.get(
  "/training/recommendations/:traineeId",
  async (req: Request, res: Response) => {
    const traineeId = getRouteParam(req, "traineeId");
    if (!traineeId) {
      return res.status(400).json({
        success: false,
        error: 'Missing required route parameter "traineeId"',
      });
    }

    const result = await pluginManager.executePlugin("cinema-skills-trainer", {
      type: "get-recommendations",
      data: { traineeId },
    });
    return res.json(result);
  }
);

// =====================================================
// Immersive Concept Art Studio endpoints
// استوديو الفن المفاهيمي الغامر
// =====================================================

router.post(
  "/concept-art/create-project",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-project",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/concept-art/create-model",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-model",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/concept-art/create-environment",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-environment",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/concept-art/create-character",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-character",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post("/concept-art/moodboard", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "generate-moodboard",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/concept-art/vr-experience",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-vr-experience",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post("/concept-art/sculpt", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "sculpt-model",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/concept-art/material", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "apply-material",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/concept-art/render", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "render-preview",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/concept-art/export", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "export-assets",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.get("/concept-art/projects", async (_req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "list-projects",
    data: {},
  });
  res.json(result);
});

// =====================================================
// Virtual Production Engine endpoints
// محرك الإنتاج الافتراضي والتصور المسبق
// =====================================================

router.post(
  "/virtual-production/create",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "create-production",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/virtual-production/led-wall",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "setup-led-wall",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/virtual-production/camera",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "configure-camera",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/virtual-production/tracking",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "start-tracking",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/virtual-production/frustum",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "calculate-frustum",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/virtual-production/scene",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "setup-scene",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/virtual-production/illusion",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "calculate-illusion",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.get(
  "/virtual-production/illusions",
  async (_req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "list-illusions",
        data: {},
      }
    );
    res.json(result);
  }
);

router.post("/virtual-production/vfx", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin(
    "virtual-production-engine",
    {
      type: "add-vfx",
      data: getRequestBody(req),
    }
  );
  res.json(result);
});

router.post(
  "/virtual-production/calibrate",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "calibrate-system",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/virtual-production/composite",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "real-time-composite",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.post(
  "/virtual-production/export",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin(
      "virtual-production-engine",
      {
        type: "export-previz",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  }
);

router.get("/virtual-production/list", async (_req: Request, res: Response) => {
  const result = await pluginManager.executePlugin(
    "virtual-production-engine",
    {
      type: "list-productions",
      data: {},
    }
  );
  res.json(result);
});
