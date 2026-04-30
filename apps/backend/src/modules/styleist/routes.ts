import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";
import { z } from "zod";

import { logger } from "@/lib/logger";

import { styleistService } from "./service";

export const styleistRouter: ExpressRouter = Router();

const createDesignBodySchema = z
  .object({
    projectId: z.string().min(1),
    lookTitle: z.string().min(1),
  })
  .passthrough();

const createWardrobeBodySchema = z
  .object({
    projectId: z.string().min(1),
    name: z.string().min(1),
    imageUrl: z.string().min(1),
  })
  .passthrough();

const assignSceneCostumeBodySchema = z
  .object({
    projectId: z.string().min(1),
    sceneId: z.string().min(1),
  })
  .passthrough();

const updateSceneCostumeBodySchema = z
  .object({
    projectId: z.string().min(1),
  })
  .passthrough();

// ==========================================
// Costume Designs
// ==========================================

styleistRouter.get("/designs", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string;
    if (!projectId) {
      res.status(400).json({ success: false, error: "projectId مطلوب" });
      return;
    }
    const designs = await styleistService.getDesignsByProject(projectId);
    res.json({ success: true, data: designs });
  } catch (error) {
    logger.error("Failed to get designs", { error });
    res.status(500).json({ success: false, error: "فشل في جلب التصاميم" });
  }
});

styleistRouter.get("/designs/:id", async (req: Request, res: Response) => {
  try {
    const design = await styleistService.getDesignById(
      req.params["id"] as string,
    );
    if (!design) {
      res.status(404).json({ success: false, error: "التصميم غير موجود" });
      return;
    }
    res.json({ success: true, data: design });
  } catch (error) {
    logger.error("Failed to get design", { error });
    res.status(500).json({ success: false, error: "فشل في جلب التصميم" });
  }
});

styleistRouter.post("/designs", async (req: Request, res: Response) => {
  try {
    const validation = createDesignBodySchema.safeParse(req.body);
    if (!validation.success) {
      res
        .status(400)
        .json({ success: false, error: "projectId و lookTitle مطلوبان" });
      return;
    }
    const userId = (req as unknown as Record<string, unknown>)[
      "userId"
    ] as string;
    const design = await styleistService.createDesign({
      ...validation.data,
      userId,
    });
    res.status(201).json({ success: true, data: design });
  } catch (error) {
    logger.error("Failed to create design", { error });
    res.status(500).json({ success: false, error: "فشل في إنشاء التصميم" });
  }
});

styleistRouter.delete("/designs/:id", async (req: Request, res: Response) => {
  try {
    await styleistService.deleteDesign(req.params["id"] as string);
    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete design", { error });
    res.status(500).json({ success: false, error: "فشل في حذف التصميم" });
  }
});

// ==========================================
// Wardrobe Items
// ==========================================

styleistRouter.get("/wardrobe", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string;
    if (!projectId) {
      res.status(400).json({ success: false, error: "projectId مطلوب" });
      return;
    }
    const items = await styleistService.getWardrobeByProject(projectId);
    res.json({ success: true, data: items });
  } catch (error) {
    logger.error("Failed to get wardrobe", { error });
    res.status(500).json({ success: false, error: "فشل في جلب خزانة الملابس" });
  }
});

styleistRouter.post("/wardrobe", async (req: Request, res: Response) => {
  try {
    const validation = createWardrobeBodySchema.safeParse(req.body);
    if (!validation.success) {
      res
        .status(400)
        .json({ success: false, error: "projectId, name, imageUrl مطلوبة" });
      return;
    }
    const userId = (req as unknown as Record<string, unknown>)[
      "userId"
    ] as string;
    const item = await styleistService.createWardrobeItem({
      ...validation.data,
      userId,
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    logger.error("Failed to create wardrobe item", { error });
    res
      .status(500)
      .json({ success: false, error: "فشل في إضافة قطعة الملابس" });
  }
});

styleistRouter.delete("/wardrobe/:id", async (req: Request, res: Response) => {
  try {
    await styleistService.deleteWardrobeItem(req.params["id"] as string);
    res.json({ success: true });
  } catch (error) {
    logger.error("Failed to delete wardrobe item", { error });
    res.status(500).json({ success: false, error: "فشل في حذف قطعة الملابس" });
  }
});

// ==========================================
// Scene-Costume Assignments
// ==========================================

styleistRouter.get("/scene-costumes", async (req: Request, res: Response) => {
  try {
    const projectId = req.query["projectId"] as string;
    if (!projectId) {
      res.status(400).json({ success: false, error: "projectId مطلوب" });
      return;
    }
    const assignments =
      await styleistService.getSceneCostumesByProject(projectId);
    res.json({ success: true, data: assignments });
  } catch (error) {
    logger.error("Failed to get scene costumes", { error });
    res
      .status(500)
      .json({ success: false, error: "فشل في جلب تعيينات الأزياء" });
  }
});

styleistRouter.post("/scene-costumes", async (req: Request, res: Response) => {
  try {
    const validation = assignSceneCostumeBodySchema.safeParse(req.body);
    if (!validation.success) {
      res
        .status(400)
        .json({ success: false, error: "projectId و sceneId مطلوبان" });
      return;
    }
    const assignment = await styleistService.assignSceneCostume(
      validation.data,
    );
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    logger.error("Failed to assign scene costume", { error });
    res.status(500).json({ success: false, error: "فشل في تعيين الزي للمشهد" });
  }
});

styleistRouter.put(
  "/scene-costumes/:sceneId",
  async (req: Request, res: Response) => {
    try {
      const validation = updateSceneCostumeBodySchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: "projectId مطلوب" });
        return;
      }
      const { projectId } = validation.data;
      const updated = await styleistService.updateSceneCostume(
        req.params["sceneId"] as string,
        projectId,
        validation.data,
      );
      if (!updated) {
        res.status(404).json({ success: false, error: "التعيين غير موجود" });
        return;
      }
      res.json({ success: true, data: updated });
    } catch (error) {
      logger.error("Failed to update scene costume", { error });
      res
        .status(500)
        .json({ success: false, error: "فشل في تحديث تعيين الزي" });
    }
  },
);
