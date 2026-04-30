import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerAllRoutes } from "@/server/route-registrars";

import type { Application, NextFunction, Request, Response } from "express";

type RouteHandler = (req: Request, res: Response) => void;
type MiddlewareHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void;
type AuthenticatedRequest = Request & {
  user?: {
    email: string;
    id: string;
  };
  userId?: string;
};

const {
  mockAnalysisController,
  mockAppStateController,
  mockAuthController,
  mockAuthMiddleware,
  mockBreakdownController,
  mockCharactersController,
  mockHealthController,
  mockPassThroughMiddleware,
  mockQueueController,
  mockScenesController,
  mockShotsController,
  mockWorkflowController,
} = vi.hoisted(() => {
  const handler = vi.fn<RouteHandler>((_req, res) => {
    res.json({ success: true });
  });
  const createdHandler = vi.fn<RouteHandler>((_req, res) => {
    res.status(201).json({ success: true });
  });
  const passThrough = vi.fn<MiddlewareHandler>((_req, _res, next) => {
    next();
  });
  const auth = vi.fn<MiddlewareHandler>((req, res, next) => {
    if (req.get("authorization") !== "Bearer valid-token") {
      res.status(401).json({
        success: false,
        error: "غير مصرح - يرجى تسجيل الدخول",
      });
      return;
    }

    const authenticatedRequest = req as AuthenticatedRequest;
    authenticatedRequest.userId = "user-123";
    authenticatedRequest.user = { id: "user-123", email: "owner@example.com" };
    next();
  });

  return {
    mockAnalysisController: {
      exportAnalysis: handler,
      getAnalysisSnapshot: handler,
      getStationDetails: handler,
      retryStation: handler,
      runSevenStationsPipeline: handler,
      startStreamSession: handler,
      streamEvents: handler,
    },
    mockAppStateController: {
      clearState: handler,
      getState: handler,
      setState: handler,
    },
    mockAuthController: {
      getCurrentUser: handler,
      login: handler,
      logout: handler,
      refresh: handler,
      signup: createdHandler,
    },
    mockAuthMiddleware: auth,
    mockBreakdownController: {
      analyzeProject: handler,
      bootstrapProject: createdHandler,
      chat: handler,
      exportReport: handler,
      getProjectReport: handler,
      getProjectSchedule: handler,
      getSceneBreakdown: handler,
      health: handler,
      parseProject: handler,
      reanalyzeScene: handler,
    },
    mockCharactersController: {
      createCharacter: createdHandler,
      deleteCharacter: handler,
      getCharacter: handler,
      getCharacters: handler,
      updateCharacter: handler,
    },
    mockHealthController: {
      getDetailedHealth: handler,
      getHealth: handler,
      getLiveness: vi.fn<RouteHandler>((_req, res) => {
        res.status(200).json({ status: "alive" });
      }),
      getReadiness: handler,
      getStartup: handler,
    },
    mockPassThroughMiddleware: passThrough,
    mockQueueController: {
      cleanQueue: handler,
      getJobStatus: handler,
      getQueueStats: handler,
      getSpecificQueueStats: handler,
      retryJob: handler,
    },
    mockScenesController: {
      createScene: createdHandler,
      deleteScene: handler,
      getScene: handler,
      getScenes: handler,
      updateScene: handler,
    },
    mockShotsController: {
      createShot: createdHandler,
      deleteShot: handler,
      generateShotSuggestion: handler,
      getShot: handler,
      getShots: handler,
      updateShot: handler,
    },
    mockWorkflowController: {
      execute: handler,
      executeCustom: handler,
      getPreset: handler,
      history: handler,
      listPresets: handler,
      progress: handler,
    },
  };
});

vi.mock("@/controllers/actorai.controller", () => ({
  actorAiController: {
    getAnalyticsById: mockPassThroughMiddleware,
    listAnalytics: mockPassThroughMiddleware,
    saveMemorizationStats: mockPassThroughMiddleware,
    saveVoiceAnalytics: mockPassThroughMiddleware,
    saveWebcamAnalysis: mockPassThroughMiddleware,
  },
}));

vi.mock("@/controllers/ai.controller", () => ({
  aiController: {
    chat: mockPassThroughMiddleware,
    getShotSuggestion: mockPassThroughMiddleware,
  },
}));

vi.mock("@/controllers/appState.controller", () => ({
  appStateController: mockAppStateController,
}));

vi.mock("@/controllers/auth.controller", () => ({
  authController: mockAuthController,
}));

vi.mock("@/controllers/breakdown.controller", () => ({
  breakdownController: mockBreakdownController,
}));

vi.mock("@/controllers/characters.controller", () => ({
  charactersController: mockCharactersController,
}));

vi.mock("@/controllers/queue.controller", () => ({
  queueController: mockQueueController,
}));

vi.mock("@/controllers/scenes.controller", () => ({
  scenesController: mockScenesController,
}));

vi.mock("@/controllers/shots.controller", () => ({
  shotsController: mockShotsController,
}));

vi.mock("@/controllers/workflow.controller", () => ({
  workflowController: mockWorkflowController,
}));

vi.mock("@/controllers/zkAuth.controller", () => ({
  manageRecoveryArtifact: mockPassThroughMiddleware,
  zkLoginInit: mockPassThroughMiddleware,
  zkLoginVerify: mockPassThroughMiddleware,
  zkSignup: mockPassThroughMiddleware,
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/memory", () => ({
  memoryHealthHandler: mockPassThroughMiddleware,
  memoryRoutes: mockPassThroughMiddleware,
  weaviateStore: {
    getStatus: vi.fn(() => ({
      enabled: false,
      required: false,
      state: "disabled",
    })),
  },
}));

vi.mock("@/middleware", () => ({
  authMiddleware: mockAuthMiddleware,
  csrfProtection: mockPassThroughMiddleware,
  perUserAiLimiter: mockPassThroughMiddleware,
}));

vi.mock("@/middleware/auth.middleware", () => ({
  authMiddleware: mockAuthMiddleware,
}));

vi.mock("@/middleware/metrics.middleware", () => ({
  metricsEndpoint: vi.fn<RouteHandler>((_req, res) => {
    res.status(200).type("text/plain").send("metrics 1");
  }),
}));

vi.mock("@/server/route-registrars/metrics-routes", () => ({
  registerMetricsRoutes: vi.fn(),
}));

vi.mock("@/server/route-registrars/project-public-routes", () => ({
  registerProjectAndPublicRoutes: vi.fn(),
}));

vi.mock("@/server/route-registrars/waf-routes", () => ({
  registerWafRoutes: vi.fn(),
}));

vi.mock("@/services/actorai.service", () => ({
  actorAiService: {
    saveMemorizationStats: vi.fn(),
    saveVoiceAnalytics: vi.fn(),
    saveWebcamAnalysis: vi.fn(),
  },
}));

function buildApp(): Application {
  const app = express();
  app.use(cookieParser());
  app.use(express.json());
  registerAllRoutes(app, {
    analysisController: mockAnalysisController as unknown as Parameters<
      typeof registerAllRoutes
    >[1]["analysisController"],
    healthController: mockHealthController as unknown as Parameters<
      typeof registerAllRoutes
    >[1]["healthController"],
  });
  return app;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("تكامل مسارات الواجهة البرمجية", () => {
  it("يعيد مسار الحياة عبر تسجيل المسارات الفعلي", async () => {
    const app = buildApp();

    const response = await request(app).get("/health/live");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "alive" });
    expect(mockHealthController.getLiveness).toHaveBeenCalledTimes(1);
  });

  it("يرفض مسار الشخصيات المحمي عند غياب رمز التوثيق", async () => {
    const app = buildApp();

    const response = await request(app).get("/api/projects/project-1/characters");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      error: "غير مصرح - يرجى تسجيل الدخول",
    });
    expect(mockCharactersController.getCharacters).not.toHaveBeenCalled();
  });

  it("يمرر مسار الشخصيات المحمي عند وجود توثيق صحيح", async () => {
    const app = buildApp();

    const response = await request(app)
      .get("/api/projects/project-1/characters")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true });
    expect(mockAuthMiddleware).toHaveBeenCalledTimes(1);
    expect(mockCharactersController.getCharacters).toHaveBeenCalledTimes(1);
  });

  it("يرفض إنشاء الشخصية عندما يغيب رمز الحماية من التعديل", async () => {
    const app = buildApp();

    const response = await request(app)
      .post("/api/characters")
      .set("Authorization", "Bearer valid-token")
      .send({ projectId: "project-1", name: "ليلى" });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      error: "CSRF token missing",
      code: "CSRF_TOKEN_MISSING",
    });
    expect(mockCharactersController.createCharacter).not.toHaveBeenCalled();
  });

  it("ينشئ الشخصية عندما ينجح التوثيق ورمز الحماية", async () => {
    const app = buildApp();
    const csrfToken = "matching-csrf-token";

    const response = await request(app)
      .post("/api/characters")
      .set("Authorization", "Bearer valid-token")
      .set("Cookie", [`XSRF-TOKEN=${csrfToken}`])
      .set("X-XSRF-TOKEN", csrfToken)
      .send({ projectId: "project-1", name: "ليلى" });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ success: true });
    expect(mockAuthMiddleware).toHaveBeenCalledTimes(1);
    expect(mockCharactersController.createCharacter).toHaveBeenCalledTimes(1);
  });
});
