import { Router, Request, Response } from "express";

import { pluginManager } from "../core/PluginManager";

import { getRequestBody } from "./route-utils";

function registerVirtualProductionPostRoutes(router: Router): void {
  router.post(
    "/virtual-production/create",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "create-production",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/led-wall",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "setup-led-wall",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/camera",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "configure-camera",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/tracking",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "start-tracking",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/frustum",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "calculate-frustum",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/scene",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "setup-scene",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/illusion",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "calculate-illusion",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/vfx",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "add-vfx",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/calibrate",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "calibrate-system",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/composite",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "real-time-composite",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/virtual-production/export",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "export-previz",
          data: getRequestBody(req),
        })
      );
    }
  );
}

function registerVirtualProductionGetRoutes(router: Router): void {
  router.get(
    "/virtual-production/illusions",
    async (_req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "list-illusions",
          data: {},
        })
      );
    }
  );
  router.get(
    "/virtual-production/list",
    async (_req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-production-engine", {
          type: "list-productions",
          data: {},
        })
      );
    }
  );
}

export function registerVirtualProductionRoutes(router: Router): void {
  registerVirtualProductionPostRoutes(router);
  registerVirtualProductionGetRoutes(router);
}
