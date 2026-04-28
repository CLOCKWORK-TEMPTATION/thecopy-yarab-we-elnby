import { Router, Request, Response } from "express";
import { pluginManager } from "../core/PluginManager";
import { getRequestBody } from "./route-utils";

export function registerLocationRoutes(router: Router): void {
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
}
