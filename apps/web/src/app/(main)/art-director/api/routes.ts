// CineArchitect AI - API Routes
// مسارات الواجهة البرمجية

import { Router } from "express";

import pluginsRouter from "./routes/plugins";
import xrRouter from "./routes/xr";
import trainingRouter from "./routes/training";
import conceptArtRouter from "./routes/concept-art";
import virtualProductionRouter from "./routes/virtual-production";

export const router = Router();

// Mount all route modules
router.use(pluginsRouter);
router.use(xrRouter);
router.use(trainingRouter);
router.use(conceptArtRouter);
router.use(virtualProductionRouter);
