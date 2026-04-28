import { Router, Request, Response } from "express";

import { pluginManager } from "../core/PluginManager";

import { getRequestBody } from "./route-utils";

export function registerAnalysisRoutes(router: Router): void {
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

  // Risk Analysis endpoint
  router.post("/analyze/risks", async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("risk-analyzer", {
      type: "analyze",
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

  // Productivity Analyzer endpoints
  router.post("/analyze/productivity", async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("productivity-analyzer", {
      type: "analyze",
      data: getRequestBody(req),
    });
    res.json(result);
  });
}
