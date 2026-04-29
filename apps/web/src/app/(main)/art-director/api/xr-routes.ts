import { Router, Request, Response } from "express";

import { pluginManager } from "../core/PluginManager";

import { getRequestBody } from "./route-utils";

function registerPrevizRoutes(router: Router): void {
  router.post(
    "/xr/previz/create-scene",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("mr-previz-studio", {
          type: "create-scene",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post("/xr/previz/add-object", async (req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("mr-previz-studio", {
        type: "add-object",
        data: getRequestBody(req),
      })
    );
  });
  router.post(
    "/xr/previz/setup-camera",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("mr-previz-studio", {
          type: "setup-camera",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/xr/previz/simulate-movement",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("mr-previz-studio", {
          type: "simulate-movement",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post("/xr/previz/ar-preview", async (req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("mr-previz-studio", {
        type: "ar-preview",
        data: getRequestBody(req),
      })
    );
  });
  router.post(
    "/xr/previz/vr-walkthrough",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("mr-previz-studio", {
          type: "vr-walkthrough",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.get("/xr/previz/devices", async (_req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("mr-previz-studio", {
        type: "get-devices",
        data: {},
      })
    );
  });
  router.get("/xr/previz/scenes", async (_req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("mr-previz-studio", {
        type: "list-scenes",
        data: {},
      })
    );
  });
}

function registerSetEditorRoutes(router: Router): void {
  router.post("/xr/set-editor/create", async (req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("virtual-set-editor", {
        type: "create-set",
        data: getRequestBody(req),
      })
    );
  });
  router.post(
    "/xr/set-editor/add-element",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-set-editor", {
          type: "add-element",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/xr/set-editor/modify-element",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-set-editor", {
          type: "modify-element",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post(
    "/xr/set-editor/adjust-lighting",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-set-editor", {
          type: "adjust-lighting",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.post("/xr/set-editor/add-cgi", async (req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("virtual-set-editor", {
        type: "add-cgi",
        data: getRequestBody(req),
      })
    );
  });
  router.post("/xr/set-editor/preview", async (req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("virtual-set-editor", {
        type: "real-time-preview",
        data: getRequestBody(req),
      })
    );
  });
  router.post("/xr/set-editor/share", async (req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("virtual-set-editor", {
        type: "share-vision",
        data: getRequestBody(req),
      })
    );
  });
  router.post(
    "/xr/set-editor/color-grade",
    async (req: Request, res: Response) => {
      res.json(
        await pluginManager.executePlugin("virtual-set-editor", {
          type: "color-grade",
          data: getRequestBody(req),
        })
      );
    }
  );
  router.get("/xr/set-editor/list", async (_req: Request, res: Response) => {
    res.json(
      await pluginManager.executePlugin("virtual-set-editor", {
        type: "list-sets",
        data: {},
      })
    );
  });
}

export function registerXRRoutes(router: Router): void {
  registerPrevizRoutes(router);
  registerSetEditorRoutes(router);
}
