import { createServer, Server as HTTPServer } from "http";

import { afterEach, beforeEach, expect, it, vi } from "vitest";

const {
  mockSocketServerCtor,
  mockVerifyToken,
  mockTrackWebSocketAuth,
  mockUpdateRunnerLocation,
  mockUpdateOrderStatus,
} = vi.hoisted(() => ({
  mockSocketServerCtor: vi.fn(),
  mockVerifyToken: vi.fn(),
  mockTrackWebSocketAuth: vi.fn(),
  mockUpdateRunnerLocation: vi.fn(),
  mockUpdateOrderStatus: vi.fn(),
}));

const roomEmitter = {
  emit: vi.fn(),
};

const mockIO = {
  use: vi.fn(),
  on: vi.fn(),
  emit: vi.fn(),
  to: vi.fn(() => roomEmitter),
  engine: {
    on: vi.fn(),
  },
  sockets: {
    adapter: {
      rooms: new Map<string, Set<string>>([
        ["test-socket-id", new Set(["test-socket-id"])],
        ["user:test-user", new Set(["socket-1"])],
        ["project:test-project", new Set(["socket-2"])],
      ]),
    },
  },
  disconnectSockets: vi.fn(),
  close: vi.fn((callback: () => void) => callback()),
};

const createMockSocket = () => ({
  id: "test-socket-id",
  userId: undefined as string | undefined,
  authenticated: false,
  authExpiresAtMs: undefined as number | undefined,
  rooms: new Set(["test-socket-id"]),
  handshake: {
    auth: {},
    headers: {},
    address: "127.0.0.1",
  },
  conn: {
    remoteAddress: "127.0.0.1",
  },
  join: vi.fn(),
  leave: vi.fn(),
  emit: vi.fn(),
  on: vi.fn(),
  disconnect: vi.fn(),
});

type MockFn = ReturnType<typeof vi.fn>;
type MockHandler = (payload?: unknown) => void;

function findMockHandler(mock: MockFn, eventName: string): MockHandler {
  const calls = mock.mock.calls as unknown[][];
  const handler = calls.find((call) => call[0] === eventName)?.[1];
  if (typeof handler !== "function") {
    throw new Error(`Missing mock handler for ${eventName}`);
  }

  return handler as MockHandler;
}

vi.mock("socket.io", () => {
  class MockServer {
    constructor(...args: unknown[]) {
      mockSocketServerCtor(...args);
      return mockIO;
    }
  }

  return {
    Server: MockServer,
  };
});

vi.mock("@/config/env", () => ({
  env: {
    NODE_ENV: "development",
    CORS_ORIGIN: "http://localhost:5000",
  },
}));

vi.mock("./auth.service", () => ({
  authService: {
    verifyToken: mockVerifyToken,
  },
}));

vi.mock("@/utils/connectivity-telemetry", () => ({
  trackWebSocketAuth: mockTrackWebSocketAuth,
}));

vi.mock("@/modules/breakapp/service", () => ({
  breakappService: {
    updateRunnerLocation: mockUpdateRunnerLocation,
    updateOrderStatus: mockUpdateOrderStatus,
  },
}));

vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { RealtimeEventType } from "@/types/realtime.types";

import { websocketService } from "./websocket.service";

let httpServer: HTTPServer;

beforeEach(async () => {
  await websocketService.shutdown();
  vi.clearAllMocks();
  vi.useRealTimers();
  httpServer = createServer();
  mockVerifyToken.mockReturnValue({
    userId: "verified-user",
    exp: Math.floor(Date.now() / 1000) + 60,
  });
});

afterEach(async () => {
  await websocketService.shutdown();
  if (httpServer.listening) {
    httpServer.close();
  }
  vi.useRealTimers();
});

it("يسجل الوسطاء والمعالجات عند التهيئة", () => {
  websocketService.initialize(httpServer);

  expect(mockSocketServerCtor).toHaveBeenCalledTimes(1);
  expect(mockIO.use).toHaveBeenCalledTimes(1);
  expect(mockIO.on).toHaveBeenCalledWith("connection", expect.any(Function));
  expect(mockIO.engine.on).toHaveBeenCalledWith("error", expect.any(Function));
});

it("لا يعيد التهيئة مرتين", () => {
  websocketService.initialize(httpServer);
  websocketService.initialize(httpServer);

  expect(mockSocketServerCtor).toHaveBeenCalledTimes(1);
});

it("يرسل حدث الاتصال ويسجل معالجات الجلسة", () => {
  websocketService.initialize(httpServer);
  const socket = createMockSocket();
  const connectionHandler = findMockHandler(mockIO.on, "connection");

  connectionHandler(socket);

  expect(socket.on).toHaveBeenCalledWith("authenticate", expect.any(Function));
  expect(socket.on).toHaveBeenCalledWith("token:refresh", expect.any(Function));
  expect(socket.on).toHaveBeenCalledWith("disconnect", expect.any(Function));
  expect(socket.on).toHaveBeenCalledWith("subscribe", expect.any(Function));
  expect(socket.on).toHaveBeenCalledWith("unsubscribe", expect.any(Function));
  expect(socket.emit).toHaveBeenCalledWith(
    RealtimeEventType.CONNECTED,
    expect.objectContaining({
      socketId: socket.id,
      message: "Connected successfully",
    }),
  );
});

it("يقطع الاتصال غير المصدق بعد انتهاء المهلة", () => {
  vi.useFakeTimers();
  websocketService.initialize(httpServer);
  const socket = createMockSocket();
  const connectionHandler = findMockHandler(mockIO.on, "connection");

  connectionHandler(socket);
  vi.advanceTimersByTime(5001);

  expect(socket.emit).toHaveBeenCalledWith(
    "auth_error",
    expect.objectContaining({
      reason: "auth_timeout",
      message: "Connection timed out. Please reconnect.",
    }),
  );
  expect(socket.disconnect).toHaveBeenCalledWith(true);
});

it("يوثق المستخدم بنجاح عند تمرير توكن صالح", () => {
  websocketService.initialize(httpServer);
  const socket = createMockSocket();
  const connectionHandler = findMockHandler(mockIO.on, "connection");

  connectionHandler(socket);
  const authHandler = findMockHandler(socket.on, "authenticate");
  authHandler({ token: "valid-token" });

  expect(mockVerifyToken).toHaveBeenCalledWith("valid-token");
  expect(socket.join).toHaveBeenCalledWith("user:verified-user");
  expect(socket.emit).toHaveBeenCalledWith(
    RealtimeEventType.AUTHENTICATED,
    expect.objectContaining({
      userId: "verified-user",
      message: "Authenticated successfully",
    }),
  );
  expect(mockTrackWebSocketAuth).toHaveBeenCalledWith(
    "ws:auth:event_success",
    expect.objectContaining({ userId: "verified-user" }),
  );
});

it("يدعم مسار التطوير المحلي عند توفر userId على العنوان المحلي", () => {
  websocketService.initialize(httpServer);
  const socket = createMockSocket();
  const connectionHandler = findMockHandler(mockIO.on, "connection");

  connectionHandler(socket);
  const authHandler = findMockHandler(socket.on, "authenticate");
  authHandler({ userId: "dev-user" });

  expect(socket.join).toHaveBeenCalledWith("user:dev-user");
  expect(socket.emit).toHaveBeenCalledWith(
    RealtimeEventType.AUTHENTICATED,
    expect.objectContaining({ userId: "dev-user" }),
  );
  expect(mockTrackWebSocketAuth).toHaveBeenCalledWith(
    "ws:auth:dev_fallback",
    expect.objectContaining({ userId: "dev-user" }),
  );
});

it("يرفض المصادقة غير الصالحة", () => {
  websocketService.initialize(httpServer);
  const socket = createMockSocket();
  const connectionHandler = findMockHandler(mockIO.on, "connection");

  connectionHandler(socket);
  const authHandler = findMockHandler(socket.on, "authenticate");
  authHandler({});

  expect(socket.emit).toHaveBeenCalledWith(
    "auth_error",
    expect.objectContaining({
      reason: "missing_token",
      message: "Authentication required.",
    }),
  );
  expect(socket.disconnect).toHaveBeenCalledWith(true);
});

it("يدير الاشتراك في الغرف بحسب حالة المصادقة", () => {
  websocketService.initialize(httpServer);
  const socket = createMockSocket();
  const connectionHandler = findMockHandler(mockIO.on, "connection");

  connectionHandler(socket);
  const subscribeHandler = findMockHandler(socket.on, "subscribe");

  subscribeHandler({ room: "project:123" });
  expect(socket.emit).toHaveBeenCalledWith(
    RealtimeEventType.UNAUTHORIZED,
    expect.objectContaining({
      message: "Must authenticate before subscribing to rooms",
    }),
  );

  socket.emit.mockClear();
  socket.authenticated = true;
  subscribeHandler({ room: "project:123" });

  expect(socket.join).toHaveBeenCalledWith("project:123");
  expect(socket.emit).toHaveBeenCalledWith(
    RealtimeEventType.SYSTEM_INFO,
    expect.objectContaining({
      message: "Subscribed to room: project:123",
    }),
  );
});

it("يوجه البث العام وغرف المستخدم والمشروع والطابور بشكل صحيح", () => {
  websocketService.initialize(httpServer);
  const event = {
    event: RealtimeEventType.SYSTEM_INFO,
    payload: {
      timestamp: new Date().toISOString(),
      eventType: RealtimeEventType.SYSTEM_INFO,
      level: "info" as const,
      message: "رسالة اختبار",
    },
  };

  websocketService.broadcast(event);
  websocketService.toUser("user-123", event);
  websocketService.toProject("project-123", event);
  websocketService.toQueue("queue-123", event);

  expect(mockIO.emit).toHaveBeenCalledWith(event.event, event.payload);
  expect(mockIO.to).toHaveBeenCalledWith("user:user-123");
  expect(mockIO.to).toHaveBeenCalledWith("project:project-123");
  expect(mockIO.to).toHaveBeenCalledWith("queue:queue-123");
  expect(roomEmitter.emit).toHaveBeenCalledWith(event.event, event.payload);
});

it("يرسل أحداث الوظائف إلى غرفة الطابور وغرفة المستخدم", () => {
  websocketService.initialize(httpServer);

  websocketService.emitJobStarted({
    jobId: "job-1",
    queueName: "analysis",
    jobName: "analysis-job",
    userId: "user-1",
  });

  expect(mockIO.to).toHaveBeenCalledWith("queue:analysis");
  expect(mockIO.to).toHaveBeenCalledWith("user:user-1");
  expect(roomEmitter.emit).toHaveBeenCalledWith(
    RealtimeEventType.JOB_STARTED,
    expect.objectContaining({
      jobId: "job-1",
      queueName: "analysis",
    }),
  );
});

it("يعرض الإحصاءات الحالية ويصفرها بعد الإغلاق", () => {
  websocketService.initialize(httpServer);
  const socket = createMockSocket();
  socket.authenticated = true;
  socket.userId = "test-user";
  const connectionHandler = findMockHandler(mockIO.on, "connection");
  connectionHandler(socket);

  const stats = websocketService.getStats();

  expect(stats.totalConnections).toBe(1);
  expect(stats.authenticatedConnections).toBe(1);
  expect(stats.rooms).toContain("user:test-user");

  return websocketService.shutdown().then(() => {
    expect(websocketService.getStats()).toEqual({
      totalConnections: 0,
      authenticatedConnections: 0,
      rooms: [],
    });
  });
});

it("يغلق الخدمة بشكل منظم", async () => {
  websocketService.initialize(httpServer);

  await websocketService.shutdown();

  expect(mockIO.disconnectSockets).toHaveBeenCalledWith(true);
  expect(mockIO.close).toHaveBeenCalled();
  expect(websocketService.getIO()).toBeNull();
});
