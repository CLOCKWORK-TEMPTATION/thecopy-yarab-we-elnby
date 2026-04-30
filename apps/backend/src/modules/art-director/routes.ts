import {
  Router,
  type Request,
  type Response,
  type Router as ExpressRouter,
} from "express";

import { handleArtDirectorRequest } from "./handlers";
import {
  handleProductivitySummary,
  handleProductivityAnalyze,
  handleProductivityRecommendations,
  handleProductivityLogTime,
  handleProductivityDelay,
} from "./handlers-productivity";

import type { ArtDirectorHandlerResponse } from "./handlers-shared";

function getRouteSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function stringifyQueryValue(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
    case "symbol":
      return String(value);
    case "object":
      return value === null ? "" : (JSON.stringify(value) ?? "");
    default:
      return "";
  }
}

async function respond(req: Request, res: Response): Promise<void> {
  const method = req.method.toUpperCase();

  if (method !== "GET" && method !== "POST") {
    res.status(405).json({
      success: false,
      error: `الطريقة غير مدعومة: ${req.method}`,
    });
    return;
  }

  try {
    const searchEntries: string[][] = [];
    Object.entries(req.query).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          searchEntries.push([key, stringifyQueryValue(item)]);
        });
        return;
      }

      if (value !== undefined) {
        searchEntries.push([key, stringifyQueryValue(value)]);
      }
    });

    const result = await handleArtDirectorRequest({
      method,
      path: getRouteSegments(req.path),
      body: req.body,
      searchParams: new URLSearchParams(searchEntries),
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء معالجة طلب art-director",
    });
  }
}

async function invokeHandler(
  fn: () => Promise<ArtDirectorHandlerResponse>,
  res: Response,
): Promise<void> {
  try {
    const result = await fn();
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(500).json({
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "حدث خطأ غير متوقع أثناء معالجة طلب art-director",
    });
  }
}

export const artDirectorRouter: ExpressRouter = Router();

artDirectorRouter.get("/productivity/summary", (_req, res) => {
  void invokeHandler(() => handleProductivitySummary(), res);
});
artDirectorRouter.post("/analyze/productivity", (req, res) => {
  void invokeHandler(
    () =>
      handleProductivityAnalyze((req.body as Record<string, unknown>) ?? {}),
    res,
  );
});
artDirectorRouter.post("/productivity/recommendations", (_req, res) => {
  void invokeHandler(() => handleProductivityRecommendations(), res);
});
artDirectorRouter.post("/productivity/log-time", (req, res) => {
  void invokeHandler(
    () =>
      handleProductivityLogTime((req.body as Record<string, unknown>) ?? {}),
    res,
  );
});
artDirectorRouter.post("/productivity/report-delay", (req, res) => {
  void invokeHandler(
    () => handleProductivityDelay((req.body as Record<string, unknown>) ?? {}),
    res,
  );
});

artDirectorRouter.use((req, res) => {
  void respond(req, res);
});
