import { Router, type Router as ExpressRouter } from "express";

import {
  handleScanQr,
  handleVerifyToken,
  handleRefreshToken,
  handleLogout,
} from "./auth-handlers";
import { publicAuthLimiter, protectedLimiter } from "./limiters";
import { requireAuth } from "./middlewares";

import type { AuthenticatedRequest } from "./middlewares";

const router: ExpressRouter = Router();

router.post("/auth/scan-qr", publicAuthLimiter, handleScanQr);

router.post("/auth/verify", publicAuthLimiter, handleVerifyToken);

router.post("/auth/refresh", publicAuthLimiter, handleRefreshToken);

router.post("/auth/logout", publicAuthLimiter, handleLogout);

router.get(
  "/auth/me",
  protectedLimiter,
  requireAuth,
  (req: AuthenticatedRequest, res) => {
    const auth = req.breakappAuth;
    if (!auth) {
      res.status(401).json({ success: false, error: "غير مصرح" });
      return;
    }
    res.json({
      user: {
        id: auth.sub,
        projectId: auth.projectId,
        role: auth.role,
      },
    });
  },
);

export { router as authRouter };
