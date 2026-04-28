import { Request, Response } from "express";

import { logger } from "@/lib/logger";
import { actorAiService } from "@/services/actorai.service";
import { definedProps } from "@/utils/defined-props";

const MAX_ANALYTICS_PAYLOAD_BYTES = 1024 * 1024;

function getRequestPayloadSize(req: Request): number {
  try {
    return Buffer.byteLength(JSON.stringify(req.body ?? {}), "utf8");
  } catch {
    return MAX_ANALYTICS_PAYLOAD_BYTES + 1;
  }
}

function ensurePayloadWithinLimit(req: Request, res: Response): boolean {
  const size = getRequestPayloadSize(req);
  if (size <= MAX_ANALYTICS_PAYLOAD_BYTES) {
    return true;
  }

  res.status(413).json({
    success: false,
    error: "payload_too_large",
    message: "Payload exceeds 1MB limit",
  });
  return false;
}

function ensureAuthenticated(req: Request, res: Response): boolean {
  if (req.userId) {
    return true;
  }

  res.status(401).json({
    success: false,
    error: "authentication_required",
  });
  return false;
}

function ensureAdminOrOperator(req: Request, res: Response): boolean {
  const role = req.user?.accountStatus ?? "";
  const normalizedRole = String(role).toLowerCase();
  if (normalizedRole === "admin" || normalizedRole === "operator") {
    return true;
  }

  res.status(403).json({
    success: false,
    error: "forbidden",
  });
  return false;
}

export class ActorAiController {
  async saveVoiceAnalytics(req: Request, res: Response): Promise<void> {
    if (!ensureAuthenticated(req, res) || !ensurePayloadWithinLimit(req, res)) {
      return;
    }

    try {
      const result = await actorAiService.saveVoiceAnalytics(
        req.body,
        req.userId,
      );
      res.status(201).json(result);
    } catch (error) {
      logger.error("Failed to save voice analytics:", error);
      res.status(503).json({
        success: false,
        error: "analytics_storage_unavailable",
        message: "Unable to persist analytics data. Please retry.",
      });
    }
  }

  async saveWebcamAnalysis(req: Request, res: Response): Promise<void> {
    if (!ensureAuthenticated(req, res) || !ensurePayloadWithinLimit(req, res)) {
      return;
    }

    try {
      const result = await actorAiService.saveWebcamAnalysis(
        req.body,
        req.userId,
      );
      res.status(201).json(result);
    } catch (error) {
      logger.error("Failed to save webcam analysis:", error);
      res.status(503).json({
        success: false,
        error: "analytics_storage_unavailable",
        message: "Unable to persist analytics data. Please retry.",
      });
    }
  }

  async saveMemorizationStats(req: Request, res: Response): Promise<void> {
    if (!ensureAuthenticated(req, res) || !ensurePayloadWithinLimit(req, res)) {
      return;
    }

    try {
      const result = await actorAiService.saveMemorizationStats(
        req.body,
        req.userId,
      );
      res.status(201).json(result);
    } catch (error) {
      logger.error("Failed to save memorization stats:", error);
      res.status(503).json({
        success: false,
        error: "analytics_storage_unavailable",
        message: "Unable to persist analytics data. Please retry.",
      });
    }
  }

  async getAnalyticsById(req: Request, res: Response): Promise<void> {
    if (!ensureAuthenticated(req, res) || !ensureAdminOrOperator(req, res)) {
      return;
    }

    try {
      const id =
        typeof req.params["id"] === "string" ? req.params["id"] : undefined;
      if (!id) {
        res.status(400).json({
          success: false,
          error: "invalid_id",
        });
        return;
      }

      const record = await actorAiService.getAnalyticsById(id);
      if (!record) {
        res.status(404).json({
          success: false,
          error: "not_found",
        });
        return;
      }

      res.status(200).json(record);
    } catch (error) {
      logger.error("Failed to retrieve analytics record:", error);
      res.status(500).json({ success: false, error: "internal_error" });
    }
  }

  async listAnalytics(req: Request, res: Response): Promise<void> {
    if (!ensureAuthenticated(req, res) || !ensureAdminOrOperator(req, res)) {
      return;
    }

    try {
      const category =
        typeof req.query["category"] === "string"
          ? (req.query["category"] as "voice" | "webcam" | "memorization")
          : undefined;
      const limit =
        typeof req.query["limit"] === "string"
          ? Number(req.query["limit"])
          : undefined;
      const offset =
        typeof req.query["offset"] === "string"
          ? Number(req.query["offset"])
          : undefined;

      const result = await actorAiService.listAnalytics(
        definedProps({ category, limit, offset }),
      );
      res.status(200).json(result);
    } catch (error) {
      logger.error("Failed to list analytics records:", error);
      res.status(500).json({ success: false, error: "internal_error" });
    }
  }
}

export const actorAiController = new ActorAiController();
