import { Router, Request, Response } from "express";
import { pluginManager } from "../core/PluginManager";
import { getRequestBody } from "./route-utils";

export function registerInspirationRoutes(router: Router): void {
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
}
