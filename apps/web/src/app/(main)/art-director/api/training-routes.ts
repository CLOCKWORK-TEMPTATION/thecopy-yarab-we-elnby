import { Router, Request, Response } from "express";
import { pluginManager } from "../core/PluginManager";
import { getRequestBody, getRouteParam } from "./route-utils";

export function registerTrainingRoutes(router: Router): void {
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

      const result = await pluginManager.executePlugin(
        "cinema-skills-trainer",
        {
          type: "get-progress",
          data: { traineeId },
        }
      );
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

      const result = await pluginManager.executePlugin(
        "cinema-skills-trainer",
        {
          type: "get-recommendations",
          data: { traineeId },
        }
      );
      return res.json(result);
    }
  );
}
