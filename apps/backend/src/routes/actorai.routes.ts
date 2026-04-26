import { Router } from 'express';

import { analyzeVoice, analyzeWebcam } from '../controllers/actorai.controller';

const router = Router();

router.post('/voice-analytics', analyzeVoice);
router.post('/webcam-analysis', analyzeWebcam);

export { router as actoraiRouter };
