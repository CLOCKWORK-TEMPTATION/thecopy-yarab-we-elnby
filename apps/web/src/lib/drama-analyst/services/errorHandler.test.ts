import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  ErrorType,
  errorHandler,
  handleError,
  handleNetworkError,
  handleAPIError,
  handleFileError,
  handleValidationError,
} from "./errorHandler";

// Mock the logger service
vi.mock("./loggerService", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe("ErrorHandler — Basic Error Handling", () => {
  beforeEach(() => {
    errorHandler.clearHistory();
    vi.clearAllMocks();
  });

  it("should handle basic errors", () => {
    const error = new Error("Test error");
    const detailedError = errorHandler.handleError(error, {
      component: "TestComponent",
    });

    expect(detailedError.type).toBe(ErrorType.UNKNOWN_ERROR);
    expect(detailedError.message).toBe("Test error");
    expect(detailedError.context.component).toBe("TestComponent");
    expect(detailedError.errorId).toBeDefined();
    expect(detailedError.severity).toBe("medium");
    expect(detailedError.recoverable).toBe(false);
  });

  it("should categorize network errors", () => {
    const error = new Error("Network request failed");
    const detailedError = errorHandler.handleError(error);

    expect(detailedError.type).toBe(ErrorType.NETWORK_ERROR);
    expect(detailedError.recoverable).toBe(true);
  });

  it("should categorize API errors", () => {
    const error = new Error("API call failed");
    const detailedError = errorHandler.handleError(error);

    expect(detailedError.type).toBe(ErrorType.API_ERROR);
    expect(detailedError.recoverable).toBe(true);
  });

  it("should categorize file errors", () => {
    const error = new Error("File not found");
    const detailedError = errorHandler.handleError(error);

    expect(detailedError.type).toBe(ErrorType.FILE_ERROR);
    expect(detailedError.recoverable).toBe(true);
  });

  it("should categorize validation errors", () => {
    const error = new Error("Invalid input validation");
    const detailedError = errorHandler.handleError(error);

    expect(detailedError.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(detailedError.recoverable).toBe(true);
  });
});

describe("ErrorHandler — Error Severity", () => {
  beforeEach(() => {
    errorHandler.clearHistory();
    vi.clearAllMocks();
  });

  it("should handle critical errors", () => {
    const error = new Error("Critical system failure");
    const detailedError = errorHandler.handleError(
      error,
      {},
      ErrorType.RUNTIME_ERROR,
      "critical"
    );

    expect(detailedError.severity).toBe("critical");
    expect(detailedError.recoverable).toBe(false);
  });

  it("should handle high severity errors", () => {
    const error = new Error("High priority error");
    const detailedError = errorHandler.handleError(
      error,
      {},
      ErrorType.API_ERROR,
      "high"
    );

    expect(detailedError.severity).toBe("high");
    expect(detailedError.recoverable).toBe(true);
  });

  it("should handle low severity errors", () => {
    const error = new Error("Minor issue");
    const detailedError = errorHandler.handleError(
      error,
      {},
      ErrorType.VALIDATION_ERROR,
      "low"
    );

    expect(detailedError.severity).toBe("low");
    expect(detailedError.recoverable).toBe(true);
  });
});

describe("ErrorHandler — Error Context", () => {
  beforeEach(() => {
    errorHandler.clearHistory();
    vi.clearAllMocks();
  });

  it("should preserve error context", () => {
    const error = new Error("Test error");
    const context = {
      userId: "user123",
      sessionId: "session456",
      component: "TestComponent",
      action: "testAction",
      metadata: { test: "value" },
    };

    const detailedError = errorHandler.handleError(error, context);

    expect(detailedError.context.userId).toBe("user123");
    expect(detailedError.context.sessionId).toBe("session456");
    expect(detailedError.context.component).toBe("TestComponent");
    expect(detailedError.context.action).toBe("testAction");
    expect(detailedError.context.metadata?.["test"]).toBe("value");
    expect(detailedError.context.timestamp).toBeDefined();
  });

  it("should add default context properties", () => {
    const error = new Error("Test error");
    const detailedError = errorHandler.handleError(error);

    expect(detailedError.context.timestamp).toBeDefined();
    expect(typeof detailedError.context.timestamp).toBe("string");
  });
});

describe("ErrorHandler — Error History", () => {
  beforeEach(() => {
    errorHandler.clearHistory();
    vi.clearAllMocks();
  });

  it("should store errors in history", () => {
    const error1 = new Error("Error 1");
    const error2 = new Error("Error 2");

    errorHandler.handleError(error1);
    errorHandler.handleError(error2);

    const history = errorHandler.getErrorHistory();
    expect(history).toHaveLength(2);
    expect(history[0].message).toBe("Error 2"); // Most recent first
    expect(history[1].message).toBe("Error 1");
  });

  it("should limit history size", () => {
    for (let i = 0; i < 105; i++) {
      errorHandler.handleError(new Error(`Error ${i}`));
    }

    const history = errorHandler.getErrorHistory();
    expect(history).toHaveLength(100);
  });

  it("should filter errors by type", () => {
    errorHandler.handleError(
      new Error("Network error"),
      {},
      ErrorType.NETWORK_ERROR
    );
    errorHandler.handleError(new Error("API error"), {}, ErrorType.API_ERROR);
    errorHandler.handleError(new Error("File error"), {}, ErrorType.FILE_ERROR);

    const networkErrors = errorHandler.getErrorsByType(ErrorType.NETWORK_ERROR);
    expect(networkErrors).toHaveLength(1);
    expect(networkErrors[0].message).toBe("Network error");

    const apiErrors = errorHandler.getErrorsByType(ErrorType.API_ERROR);
    expect(apiErrors).toHaveLength(1);
    expect(apiErrors[0].message).toBe("API error");
  });

  it("should filter errors by severity", () => {
    errorHandler.handleError(
      new Error("Critical error"),
      {},
      ErrorType.RUNTIME_ERROR,
      "critical"
    );
    errorHandler.handleError(
      new Error("High error"),
      {},
      ErrorType.API_ERROR,
      "high"
    );
    errorHandler.handleError(
      new Error("Medium error"),
      {},
      ErrorType.FILE_ERROR,
      "medium"
    );
    errorHandler.handleError(
      new Error("Low error"),
      {},
      ErrorType.VALIDATION_ERROR,
      "low"
    );

    const criticalErrors = errorHandler.getErrorsBySeverity("critical");
    expect(criticalErrors).toHaveLength(1);
    expect(criticalErrors[0].message).toBe("Critical error");

    const highErrors = errorHandler.getErrorsBySeverity("high");
    expect(highErrors).toHaveLength(1);
    expect(highErrors[0].message).toBe("High error");
  });
});

describe("ErrorHandler — Error Statistics", () => {
  beforeEach(() => {
    errorHandler.clearHistory();
    vi.clearAllMocks();
  });

  it("should provide error statistics", () => {
    errorHandler.handleError(
      new Error("Network error"),
      {},
      ErrorType.NETWORK_ERROR,
      "high"
    );
    errorHandler.handleError(
      new Error("API error"),
      {},
      ErrorType.API_ERROR,
      "medium"
    );
    errorHandler.handleError(
      new Error("File error"),
      {},
      ErrorType.FILE_ERROR,
      "low"
    );

    const stats = errorHandler.getErrorStats();

    expect(stats.total).toBe(3);
    expect(stats.byType.NETWORK_ERROR).toBe(1);
    expect(stats.byType.API_ERROR).toBe(1);
    expect(stats.byType.FILE_ERROR).toBe(1);
    expect(stats.bySeverity["high"]).toBe(1);
    expect(stats.bySeverity["medium"]).toBe(1);
    expect(stats.bySeverity["low"]).toBe(1);
    expect(stats.recentErrors).toBe(3);
  });
});

describe("ErrorHandler — Convenience Functions", () => {
  beforeEach(() => {
    errorHandler.clearHistory();
    vi.clearAllMocks();
  });

  it("should handle network errors with convenience function", () => {
    const error = new Error("Network failure");
    const detailedError = handleNetworkError(
      error,
      { component: "NetworkService" },
      "https://api.example.com"
    );

    expect(detailedError.type).toBe(ErrorType.NETWORK_ERROR);
    expect(detailedError.context.component).toBe("NetworkService");
    expect(detailedError.context.url).toBeDefined();
    expect(detailedError.severity).toBe("high");
  });

  it("should handle API errors with convenience function", () => {
    const error = new Error("API failure");
    const detailedError = handleAPIError(
      error,
      { component: "APIService" },
      "/api/analyze"
    );

    expect(detailedError.type).toBe(ErrorType.API_ERROR);
    expect(detailedError.context.component).toBe("APIService");
    expect(detailedError.context.action).toBe("/api/analyze");
    expect(detailedError.severity).toBe("high");
  });

  it("should handle file errors with convenience function", () => {
    const error = new Error("File processing failed");
    const detailedError = handleFileError(
      error,
      { component: "FileService" },
      "test.txt"
    );

    expect(detailedError.type).toBe(ErrorType.FILE_ERROR);
    expect(detailedError.context.component).toBe("FileService");
    expect(detailedError.context.metadata?.["fileName"]).toBe("test.txt");
    expect(detailedError.severity).toBe("medium");
  });

  it("should handle validation errors with convenience function", () => {
    const error = new Error("Validation failed");
    const detailedError = handleValidationError(
      error,
      { component: "ValidationService" },
      "email"
    );

    expect(detailedError.type).toBe(ErrorType.VALIDATION_ERROR);
    expect(detailedError.context.component).toBe("ValidationService");
    expect(detailedError.context.metadata?.["field"]).toBe("email");
    expect(detailedError.severity).toBe("low");
  });

  it("should handle errors with general convenience function", () => {
    const error = new Error("General error");
    const detailedError = handleError(
      error,
      { component: "TestService" },
      ErrorType.RUNTIME_ERROR,
      "critical"
    );

    expect(detailedError.type).toBe(ErrorType.RUNTIME_ERROR);
    expect(detailedError.context.component).toBe("TestService");
    expect(detailedError.severity).toBe("critical");
  });
});

describe("ErrorHandler — Error ID and Recoverability", () => {
  beforeEach(() => {
    errorHandler.clearHistory();
    vi.clearAllMocks();
  });

  it("should generate unique error IDs", () => {
    const error1 = new Error("Error 1");
    const error2 = new Error("Error 2");

    const detailedError1 = errorHandler.handleError(error1);
    const detailedError2 = errorHandler.handleError(error2);

    expect(detailedError1.errorId).toBeDefined();
    expect(detailedError2.errorId).toBeDefined();
    expect(detailedError1.errorId).not.toBe(detailedError2.errorId);
    expect(detailedError1.errorId).toMatch(/^ERR_\d+_[a-z0-9]+$/);
  });

  it("should mark network errors as recoverable", () => {
    const error = new Error("Network error");
    const detailedError = errorHandler.handleError(
      error,
      {},
      ErrorType.NETWORK_ERROR
    );

    expect(detailedError.recoverable).toBe(true);
  });

  it("should mark critical errors as non-recoverable", () => {
    const error = new Error("Critical error");
    const detailedError = errorHandler.handleError(
      error,
      {},
      ErrorType.RUNTIME_ERROR,
      "critical"
    );

    expect(detailedError.recoverable).toBe(false);
  });

  it("should mark validation errors as recoverable", () => {
    const error = new Error("Validation error");
    const detailedError = errorHandler.handleError(
      error,
      {},
      ErrorType.VALIDATION_ERROR
    );

    expect(detailedError.recoverable).toBe(true);
  });
});
