/**
 * Main WAF Middleware Function
 */

import { Request, Response, NextFunction } from "express";

import { getClientIP, isPathWhitelisted, sendBlockResponse } from "./checks";
import {
  executeCheckPipeline,
  WAF_CHECK_PIPELINE,
  type RequestContext,
} from "./handlers";
import { getWafConfig } from "./state";

/**
 * Main WAF middleware
 * Refactored to use Strategy pattern with a check handler pipeline
 */
export function wafMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const wafConfig = getWafConfig();

  // Skip if WAF is disabled
  if (!wafConfig.enabled) {
    return next();
  }

  const ctx: RequestContext = {
    ip: getClientIP(req),
    userAgent: req.headers["user-agent"] || "",
    path: req.path,
    method: req.method,
  };

  // Check whitelist first (bypass all checks)
  if (
    wafConfig.whitelist.ips.includes(ctx.ip) ||
    isPathWhitelisted(ctx.path)
  ) {
    return next();
  }

  // Execute check pipeline
  const blockResult = executeCheckPipeline(WAF_CHECK_PIPELINE, req, res, ctx);

  if (blockResult?.blocked) {
    return sendBlockResponse(
      res,
      blockResult.statusCode || 403,
      blockResult.message
    );
  }

  next();
}
