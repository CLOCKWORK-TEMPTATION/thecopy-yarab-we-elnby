import {
  Router,
  type RequestHandler,
  type Router as ExpressRouter,
} from "express";

import { actorAiController } from "../controllers/actorai.controller";

const router: ExpressRouter = Router();

const saveVoiceAnalytics: RequestHandler = (req, res) => {
  void actorAiController.saveVoiceAnalytics(req, res);
};

const saveWebcamAnalysis: RequestHandler = (req, res) => {
  void actorAiController.saveWebcamAnalysis(req, res);
};

router.post("/voice-analytics", saveVoiceAnalytics);
router.post("/webcam-analysis", saveWebcamAnalysis);

export { router as actoraiRouter };
