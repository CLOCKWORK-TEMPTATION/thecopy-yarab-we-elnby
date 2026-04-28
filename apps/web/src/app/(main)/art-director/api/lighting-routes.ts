import { Router, Request, Response } from "express";
import { pluginManager } from "../core/PluginManager";
import { getRequestBody } from "./route-utils";

export function registerLightingRoutes(router: Router): void {
  // Lighting Simulation endpoint
  router.post("/simulate/lighting", async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("lighting-simulator", {
      type: "simulate",
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

  // Terminology Translation endpoint
  router.post(
    "/translate/cinema-terms",
    async (req: Request, res: Response) => {
      const result = await pluginManager.executePlugin(
        "terminology-translator",
        {
          type: "translate",
          data: getRequestBody(req),
        }
      );
      res.json(result);
    }
  );
}
