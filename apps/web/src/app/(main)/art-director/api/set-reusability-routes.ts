import { Router, Request, Response } from "express";

import { pluginManager } from "../core/PluginManager";

import { getRequestBody } from "./route-utils";

export function registerSetReusabilityRoutes(router: Router): void {
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
}
