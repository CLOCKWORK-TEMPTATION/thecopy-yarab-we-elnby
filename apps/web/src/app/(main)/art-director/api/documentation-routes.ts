import { Router, Request, Response } from "express";
import { pluginManager } from "../core/PluginManager";
import { getRequestBody } from "./route-utils";

export function registerDocumentationRoutes(router: Router): void {
  // Documentation Generator endpoints
  router.post(
    "/documentation/generate",
    async (req: Request, res: Response) => {
      const result = await pluginManager.executePlugin(
        "documentation-generator",
        {
          type: "generate-book",
          data: getRequestBody(req),
        }
      );
      res.json(result);
    }
  );

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
    const result = await pluginManager.executePlugin(
      "documentation-generator",
      {
        type: "export-book",
        data: getRequestBody(req),
      }
    );
    res.json(result);
  });
}
