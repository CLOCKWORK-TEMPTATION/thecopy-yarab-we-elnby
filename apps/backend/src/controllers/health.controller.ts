import { Request, Response } from "express";

import { logger } from "@/lib/logger";

import {
  performHealthChecks,
  performReadinessChecks,
  performDetailedHealthChecks,
} from "./health-checks.helpers.js";

import type { LivenessStatus } from "./health-checks.helpers.js";

export class HealthController {
  private startTime = Date.now();

  async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = await performHealthChecks(this.startTime);
      res.status(healthStatus.status === "unhealthy" ? 503 : 200).json(healthStatus);
    } catch (error) {
      logger.error("Health check failed", { error });
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        version: process.env.npm_package_version || "1.0.0",
        uptime: Date.now() - this.startTime,
        error: "Health check failed",
      });
    }
  }

  async getReadiness(_req: Request, res: Response): Promise<void> {
    try {
      const readinessStatus = await performReadinessChecks();
      res.status(readinessStatus.status === "not_ready" ? 503 : 200).json(readinessStatus);
    } catch (error) {
      logger.error("Readiness check failed", { error });
      res.status(503).json({
        status: "not_ready",
        timestamp: new Date().toISOString(),
        error: "Readiness check failed",
      });
    }
  }

  async getLiveness(_req: Request, res: Response): Promise<void> {
    try {
      const livenessStatus: LivenessStatus = {
        status: "alive",
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime,
      };

      res.status(200).json(livenessStatus);
    } catch (error) {
      logger.error("Liveness check failed", { error });
      res.status(503).json({
        status: "dead",
        timestamp: new Date().toISOString(),
        error: "Liveness check failed",
      });
    }
  }

  async getStartup(_req: Request, res: Response): Promise<void> {
    try {
      const uptime = Date.now() - this.startTime;
      const isStarted = uptime > 30000;

      res.status(isStarted ? 200 : 503).json({
        status: isStarted ? "started" : "starting",
        timestamp: new Date().toISOString(),
        uptime,
        startTime: new Date(this.startTime).toISOString(),
      });
    } catch (error) {
      logger.error("Startup check failed", { error });
      res.status(503).json({
        status: "failed",
        timestamp: new Date().toISOString(),
        error: "Startup check failed",
      });
    }
  }

  async getDetailedHealth(_req: Request, res: Response): Promise<void> {
    try {
      const detailedHealth = await performDetailedHealthChecks(this.startTime);
      res.status(detailedHealth.status === "unhealthy" ? 503 : 200).json(detailedHealth);
    } catch (error) {
      logger.error("Detailed health check failed", { error });
      res.status(503).json({
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: "Detailed health check failed",
      });
    }
  }
}
