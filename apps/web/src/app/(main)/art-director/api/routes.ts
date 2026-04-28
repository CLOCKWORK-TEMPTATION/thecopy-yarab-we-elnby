// CineArchitect AI - API Routes
// مسارات الواجهة البرمجية

import { Router } from "express";

import conceptArtRouter from "./routes/concept-art";
import pluginsRouter from "./routes/plugins";
import trainingRouter from "./routes/training";
import virtualProductionRouter from "./routes/virtual-production";
import xrRouter from "./routes/xr";

export const router = Router();

// Mount all route modules
router.use(pluginsRouter);
router.use(xrRouter);
router.use(trainingRouter);
router.use(conceptArtRouter);
router.use(virtualProductionRouter);
