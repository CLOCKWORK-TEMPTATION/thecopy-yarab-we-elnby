import { Router } from "express";

import { handleArtDirectorRequest } from "./handlers";

import type { Request, Response } from "express";

function getRouteSegments(pathname: string): string[] {
  return pathname
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean);
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
          searchEntries.push([key, String(item)]);
        });
        return;
      }

      if (value !== undefined) {
        searchEntries.push([key, String(value)]);
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

export const artDirectorRouter = Router();

artDirectorRouter.use((req, res) => {
  void respond(req, res);
});

