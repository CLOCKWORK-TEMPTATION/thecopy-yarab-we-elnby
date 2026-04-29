import { logger } from "@/lib/logger";
import { authMiddleware } from "@/middleware/auth.middleware";
import { csrfProtection } from "@/middleware/csrf.middleware";
import {
  blockIP,
  getBlockedIPs,
  getWAFConfig,
  getWAFEvents,
  getWAFStats,
  unblockIP,
  updateWAFConfig,
  type WAFConfig,
} from "@/middleware/waf.middleware";

import { wafConfigUpdateSchema, wafIpBodySchema } from "../schemas";

import type { Application } from "express";

export function registerWafRoutes(app: Application): void {
  registerWafReadRoutes(app);
  registerWafConfigRoutes(app);
  registerWafIpRoutes(app);
}

function registerWafReadRoutes(app: Application): void {
  app.get("/api/waf/stats", authMiddleware, (_req, res) => {
    try {
      const stats = getWAFStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error("Failed to get WAF stats:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to retrieve WAF stats" });
    }
  });

  app.get("/api/waf/events", authMiddleware, (req, res) => {
    try {
      const limit = readWafEventLimit(req.query["limit"]);
      const events = getWAFEvents(limit);
      res.json({ success: true, data: events });
    } catch (error) {
      logger.error("Failed to get WAF events:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to retrieve WAF events" });
    }
  });

  app.get("/api/waf/blocked-ips", authMiddleware, (_req, res) => {
    try {
      const ips = getBlockedIPs();
      res.json({ success: true, data: ips });
    } catch (error) {
      logger.error("Failed to get blocked IPs:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to retrieve blocked IPs" });
    }
  });
}

function registerWafConfigRoutes(app: Application): void {
  app.get("/api/waf/config", authMiddleware, (_req, res) => {
    try {
      const config = getWAFConfig();
      res.json({ success: true, data: config });
    } catch (error) {
      logger.error("Failed to get WAF config:", error);
      res
        .status(500)
        .json({ success: false, error: "Failed to retrieve WAF config" });
    }
  });

  app.put("/api/waf/config", authMiddleware, csrfProtection, (req, res) => {
    try {
      const validation = wafConfigUpdateSchema.safeParse(req.body);
      if (!validation.success) {
        res.status(400).json({ success: false, error: "Invalid WAF config" });
        return;
      }

      updateWAFConfig(validation.data as Partial<WAFConfig>);
      res.json({ success: true, message: "WAF configuration updated" });
    } catch {
      logger.error("Failed to update WAF config");
      res
        .status(500)
        .json({ success: false, error: "Failed to update WAF config" });
    }
  });
}

function registerWafIpRoutes(app: Application): void {
  app.post(
    "/api/waf/block-ip",
    authMiddleware,
    csrfProtection,
    (req, res): void => {
      try {
        const validation = wafIpBodySchema.safeParse(req.body);
        if (!validation.success) {
          res
            .status(400)
            .json({ success: false, error: "IP address required" });
          return;
        }
        const { ip, reason } = validation.data;
        blockIP(ip, reason);
        res.json({ success: true, message: `IP ${ip} blocked successfully` });
      } catch (error) {
        logger.error("Failed to block IP:", error);
        res.status(500).json({ success: false, error: "Failed to block IP" });
      }
    },
  );

  app.post(
    "/api/waf/unblock-ip",
    authMiddleware,
    csrfProtection,
    (req, res): void => {
      try {
        const validation = wafIpBodySchema.safeParse(req.body);
        if (!validation.success) {
          res
            .status(400)
            .json({ success: false, error: "IP address required" });
          return;
        }
        const { ip } = validation.data;
        unblockIP(ip);
        res.json({ success: true, message: `IP ${ip} unblocked successfully` });
      } catch (error) {
        logger.error("Failed to unblock IP:", error);
        res.status(500).json({ success: false, error: "Failed to unblock IP" });
      }
    },
  );
}

function readWafEventLimit(rawLimit: unknown): number {
  if (typeof rawLimit !== "string") return 100;

  const parsedLimit = Number.parseInt(rawLimit, 10);
  return Number.isNaN(parsedLimit) ? 100 : parsedLimit;
}
