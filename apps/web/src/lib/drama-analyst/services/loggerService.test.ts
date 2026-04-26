import { describe, it, expect, vi, beforeEach } from "vitest";

import { log, LogLevel, LoggerService } from "./loggerService";

// محاكاة Sentry (الكود يستورد @sentry/nextjs ديناميكياً)
vi.mock("@sentry/react", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
  captureException: vi.fn(),
}));

describe("LoggerService", () => {
  let logger: LoggerService;

  beforeEach(() => {
    logger = new LoggerService();
    vi.clearAllMocks();
  });

  describe("Logging Levels", () => {
    it("should log at correct levels", () => {
      const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      logger.info("Test info message");
      logger.error("Test error message");

      expect(consoleSpy).toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it("should respect log level configuration", () => {
      logger.setLevel(LogLevel.ERROR);

      const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});
      const consoleErrorSpy = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      logger.info("This should not log");
      logger.error("This should log");

      expect(consoleSpy).not.toHaveBeenCalled();
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe("Log Buffer", () => {
    it("should store logs in buffer", () => {
      logger.info("Test message 1");
      logger.warn("Test message 2");
      logger.error("Test message 3");

      const logs = logger.getLogs();
      expect(logs).toHaveLength(3);
      expect(logs[0].message).toBe("Test message 1");
      expect(logs[1].message).toBe("Test message 2");
      expect(logs[2].message).toBe("Test message 3");
    });

    it("should filter logs by level", () => {
      logger.info("Info message");
      logger.warn("Warning message");
      logger.error("Error message");

      const errorLogs = logger.getLogs(LogLevel.ERROR);
      expect(errorLogs).toHaveLength(1);
      expect(errorLogs[0].message).toBe("Error message");
    });

    it("should limit buffer size", () => {
      // Set max logs to 5 for testing
      (logger as any).maxLogs = 5;

      for (let i = 0; i < 10; i++) {
        logger.info(`Message ${i}`);
      }

      const logs = logger.getLogs();
      expect(logs).toHaveLength(5);
      expect(logs[0].message).toBe("Message 5"); // First 5 should be removed
    });

    it("should clear logs", () => {
      logger.info("Test message");
      expect(logger.getLogs()).toHaveLength(1);

      logger.clearLogs();
      expect(logger.getLogs()).toHaveLength(0);
    });
  });

  describe("Context and Source", () => {
    it("should include context in log entries", () => {
      const context = { userId: 123, action: "login" };
      logger.info("User action", context, "AuthService");

      const logs = logger.getLogs();
      expect(logs[0].context).toEqual(context);
      expect(logs[0].source).toBe("AuthService");
    });
  });

  describe("Production Mode", () => {
    it("should disable console in production", () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const prodLogger = new LoggerService();
      const consoleSpy = vi.spyOn(console, "info").mockImplementation(() => {});

      prodLogger.info("Test message");
      expect(consoleSpy).not.toHaveBeenCalled();

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe("Singleton Instance", () => {
    it("should provide singleton instance", () => {
      expect(log).toBeDefined();
      expect(typeof log.info).toBe("function");
      expect(typeof log.error).toBe("function");
      expect(typeof log.warn).toBe("function");
      expect(typeof log.debug).toBe("function");
    });
  });

  describe("Error Handling", () => {
    it("should handle invalid inputs gracefully", () => {
      expect(() => {
        logger.info(null as any);
        logger.info(undefined as any);
        logger.info(123 as any);
      }).not.toThrow();
    });
  });
});
