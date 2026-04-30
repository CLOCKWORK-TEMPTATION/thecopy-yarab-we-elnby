import cookieParser from "cookie-parser";
import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { registerAllRoutes } from "@/server/route-registrars";

import type { Application, NextFunction, Request, Response } from "express";
import type { Response as SupertestResponse } from "supertest";

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
  mockMemoryRoutes,
  mockPassThroughMiddleware,
  mockQueueController,
  mockScenesController,
  mockShotsController,
  mockWeaviateGetStatus,
  mockWorkflowController,
} = vi.hoisted(() => {
  const okHandler = (): ReturnType<typeof vi.fn<RouteHandler>> =>
    vi.fn<RouteHandler>((_req, res) => {
      res.json({ success: true });
    });
  const createdHandler = (): ReturnType<typeof vi.fn<RouteHandler>> =>
    vi.fn<RouteHandler>((_req, res) => {
      res.status(201).json({ success: true });
    });
  const passThrough = vi.fn<MiddlewareHandler>((_req, _res, next) => {
    next();
  });
  const memoryRoutes = vi.fn<MiddlewareHandler>((_req, res) => {
    res.json({ success: true, memory: true });
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
  const getStatus = vi.fn(() => ({
    enabled: false,
    required: false,
    state: "disabled",
  }));

  return {
    mockAnalysisController: {
      exportAnalysis: okHandler(), exportPublicAnalysis: okHandler(),
      getAnalysisSnapshot: okHandler(), getPublicAnalysisSnapshot: okHandler(),
      getStationDetails: okHandler(), retryStation: okHandler(),
      retryPublicStation: okHandler(), runSevenStationsPipeline: okHandler(),
      startPublicStreamSession: okHandler(), startStreamSession: okHandler(),
      streamEvents: okHandler(), streamPublicEvents: okHandler(),
    },
    mockAppStateController: {
      clearState: okHandler(),
      getState: okHandler(),
      setState: okHandler(),
    },
    mockAuthController: {
      getCurrentUser: okHandler(),
      login: okHandler(),
      logout: okHandler(),
      refresh: okHandler(),
      signup: createdHandler(),
    },
    mockAuthMiddleware: auth,
    mockBreakdownController: {
      analyzeProject: okHandler(),
      bootstrapProject: createdHandler(),
      chat: okHandler(),
      exportReport: okHandler(),
      getProjectReport: okHandler(),
      getProjectSchedule: okHandler(),
      getSceneBreakdown: okHandler(),
      health: okHandler(),
      parseProject: okHandler(),
      reanalyzeScene: okHandler(),
    },
    mockCharactersController: {
      createCharacter: createdHandler(),
      deleteCharacter: okHandler(),
      getCharacter: okHandler(),
      getCharacters: okHandler(),
      updateCharacter: okHandler(),
    },
    mockHealthController: {
      getDetailedHealth: okHandler(),
      getHealth: okHandler(),
      getLiveness: vi.fn<RouteHandler>((_req, res) => {
        res.status(200).json({ status: "alive" });
      }),
      getReadiness: okHandler(),
      getStartup: okHandler(),
    },
    mockMemoryRoutes: memoryRoutes,
    mockPassThroughMiddleware: passThrough,
    mockQueueController: {
      cleanQueue: okHandler(),
      getJobStatus: okHandler(),
      getQueueStats: okHandler(),
      getSpecificQueueStats: okHandler(),
      retryJob: okHandler(),
    },
    mockScenesController: {
      createScene: createdHandler(),
      deleteScene: okHandler(),
      getScene: okHandler(),
      getScenes: okHandler(),
      updateScene: okHandler(),
    },
    mockShotsController: {
      createShot: createdHandler(),
      deleteShot: okHandler(),
      generateShotSuggestion: okHandler(),
      getShot: okHandler(),
      getShots: okHandler(),
      updateShot: okHandler(),
    },
    mockWeaviateGetStatus: getStatus,
    mockWorkflowController: {
      execute: okHandler(),
      executeCustom: okHandler(),
      getPreset: okHandler(),
      history: okHandler(),
      listPresets: okHandler(),
      progress: okHandler(),
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
  memoryRoutes: mockMemoryRoutes,
  weaviateStore: {
    getStatus: mockWeaviateGetStatus,
  },
}));

vi.mock("@/middleware", () => ({
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

  const deps = {
    analysisController: mockAnalysisController as unknown as Parameters<
      typeof registerAllRoutes
    >[1]["analysisController"],
    healthController: mockHealthController as unknown as Parameters<
      typeof registerAllRoutes
    >[1]["healthController"],
  };

  registerAllRoutes(app, deps);
  return app;
}

function bodyOf(response: SupertestResponse): unknown {
  return response.body as unknown;
}

function csrfCookie(token: string): string {
  return `XSRF-TOKEN=${token}`;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockWeaviateGetStatus.mockReturnValue({
    enabled: false,
    required: false,
    state: "disabled",
  });
});

describe("controllers integration public routes", () => {
  it("routes liveness through the registered health controller", async () => {
    const response = await request(buildApp()).get("/health/live");

    expect(response.status).toBe(200);
    expect(bodyOf(response)).toEqual({ status: "alive" });
    expect(mockHealthController.getLiveness).toHaveBeenCalledTimes(1);
  });

  it("serves metrics without authentication through the registered endpoint", async () => {
    const response = await request(buildApp()).get("/metrics");

    expect(response.status).toBe(200);
    expect(response.text).toBe("metrics 1");
  });

  it("routes public analysis stream start without authentication or csrf", async () => {
    const response = await request(buildApp())
      .post("/api/public/analysis/seven-stations/start")
      .send({ text: "نص عام للتحليل" });

    expect(response.status).toBe(200);
    expect(bodyOf(response)).toEqual({ success: true });
    expect(mockAuthMiddleware).not.toHaveBeenCalled();
    expect(
      mockAnalysisController.startPublicStreamSession,
    ).toHaveBeenCalledTimes(1);
  });

  it("routes public analysis snapshot without authentication", async () => {
    const response = await request(buildApp()).get(
      "/api/public/analysis/seven-stations/analysis-1/snapshot",
    );

    expect(response.status).toBe(200);
    expect(bodyOf(response)).toEqual({ success: true });
    expect(mockAuthMiddleware).not.toHaveBeenCalled();
    expect(
      mockAnalysisController.getPublicAnalysisSnapshot,
    ).toHaveBeenCalledTimes(1);
  });
});

describe("controllers integration authentication and csrf", () => {
  it("blocks a protected read route before the controller is reached", async () => {
    const response = await request(buildApp()).get(
      "/api/projects/project-1/characters",
    );

    expect(response.status).toBe(401);
    expect(bodyOf(response)).toEqual({
      success: false,
      error: "غير مصرح - يرجى تسجيل الدخول",
    });
    expect(mockCharactersController.getCharacters).not.toHaveBeenCalled();
  });

  it("passes authenticated protected reads to the expected controller", async () => {
    const response = await request(buildApp())
      .get("/api/projects/project-1/characters")
      .set("Authorization", "Bearer valid-token");

    expect(response.status).toBe(200);
    expect(bodyOf(response)).toEqual({ success: true });
    expect(mockAuthMiddleware).toHaveBeenCalledTimes(1);
    expect(mockCharactersController.getCharacters).toHaveBeenCalledTimes(1);
  });

  it("rejects protected writes when the csrf token is missing", async () => {
    const response = await request(buildApp())
      .post("/api/characters")
      .set("Authorization", "Bearer valid-token")
      .send({ projectId: "project-1", name: "ليلى" });

    expect(response.status).toBe(403);
    expect(bodyOf(response)).toEqual({
      success: false,
      error: "CSRF token missing",
      code: "CSRF_TOKEN_MISSING",
    });
    expect(mockCharactersController.createCharacter).not.toHaveBeenCalled();
  });

  it("rejects protected writes when the csrf token does not match", async () => {
    const response = await request(buildApp())
      .post("/api/characters")
      .set("Authorization", "Bearer valid-token")
      .set("Cookie", [csrfCookie("cookie-token")])
      .set("X-XSRF-TOKEN", "header-token")
      .send({ projectId: "project-1", name: "ليلى" });

    expect(response.status).toBe(403);
    expect(bodyOf(response)).toEqual({
      success: false,
      error: "CSRF token invalid",
      code: "CSRF_TOKEN_INVALID",
    });
    expect(mockCharactersController.createCharacter).not.toHaveBeenCalled();
  });

  it("passes protected writes when authentication and csrf are both valid", async () => {
    const token = "matching-csrf-token";
    const response = await request(buildApp())
      .post("/api/characters")
      .set("Authorization", "Bearer valid-token")
      .set("Cookie", [csrfCookie(token)])
      .set("X-XSRF-TOKEN", token)
      .send({ projectId: "project-1", name: "ليلى" });

    expect(response.status).toBe(201);
    expect(bodyOf(response)).toEqual({ success: true });
    expect(mockCharactersController.createCharacter).toHaveBeenCalledTimes(1);
  });
});
