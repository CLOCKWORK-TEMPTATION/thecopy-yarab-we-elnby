import { Router, Request, Response } from "express";

import { pluginManager } from "../core/PluginManager";
import { PluginCategorySchema } from "../types";

import { getRouteParam, getRequestBody, toPluginInput } from "./route-utils";

export function registerPluginRoutes(router: Router): void {
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
}
