// Concept Art Routes

import { Router, Request, Response } from "express";
import { pluginManager } from "../../core/PluginManager";
import { getRequestBody } from "../utils";

const router = Router();

// =====================================================
// Immersive Concept Art Studio endpoints
// استوديو الفن المفاهيمي الغامر
// =====================================================

router.post(
  "/concept-art/create-project",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-project",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/concept-art/create-model",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-model",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/concept-art/create-environment",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-environment",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post(
  "/concept-art/create-character",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-character",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post("/concept-art/moodboard", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "generate-moodboard",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post(
  "/concept-art/vr-experience",
  async (req: Request, res: Response) => {
    const result = await pluginManager.executePlugin("immersive-concept-art", {
      type: "create-vr-experience",
      data: getRequestBody(req),
    });
    res.json(result);
  }
);

router.post("/concept-art/sculpt", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "sculpt-model",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/concept-art/material", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "apply-material",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/concept-art/render", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "render-preview",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.post("/concept-art/export", async (req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "export-assets",
    data: getRequestBody(req),
  });
  res.json(result);
});

router.get("/concept-art/projects", async (_req: Request, res: Response) => {
  const result = await pluginManager.executePlugin("immersive-concept-art", {
    type: "list-projects",
    data: {},
  });
  res.json(result);
});

export default router;
