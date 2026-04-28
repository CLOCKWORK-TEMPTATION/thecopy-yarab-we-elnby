import { Router, type RequestHandler } from "express";

import { actorAiController } from "../controllers/actorai.controller";

const router = Router();

const saveVoiceAnalytics: RequestHandler = (req, res) => {
  void actorAiController.saveVoiceAnalytics(req, res);
};

const saveWebcamAnalysis: RequestHandler = (req, res) => {
  void actorAiController.saveWebcamAnalysis(req, res);
};

router.post("/voice-analytics", saveVoiceAnalytics);
router.post("/webcam-analysis", saveWebcamAnalysis);

export { router as actoraiRouter };
