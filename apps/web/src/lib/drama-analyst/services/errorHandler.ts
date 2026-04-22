import { log } from "./loggerService";

export enum ErrorType {
  NETWORK_ERROR = "NETWORK_ERROR",
  API_ERROR = "API_ERROR",
  FILE_ERROR = "FILE_ERROR",
  VALIDATION_ERROR = "VALIDATION_ERROR",
  CONFIGURATION_ERROR = "CONFIGURATION_ERROR",
  RUNTIME_ERROR = "RUNTIME_ERROR",
  UNKNOWN_ERROR = "UNKNOWN_ERROR",
}

export interface ErrorContext {
  userId?: string;
  sessionId?: string;
  timestamp: string;
  userAgent?: string;
  url?: string;
  component?: string;
  action?: string;
  metadata?: Record<string, any>;
}

export interface DetailedError extends Error {
  type: ErrorType;
  context: ErrorContext;
  originalError?: Error;
  severity: "low" | "medium" | "high" | "critical";
  recoverable: boolean;
  errorId: string;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorHistory: DetailedError[] = [];
  private maxHistorySize = 100;

  private constructor() {}

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  /**
   * Handle and categorize errors with detailed context
   */
  handleError(
    error: Error | unknown,
    context: Partial<ErrorContext> = {},
    type?: ErrorType,
    severity: "low" | "medium" | "high" | "critical" = "medium"
  ): DetailedError {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();

    // Determine error type if not provided
    const errorType = type || this.categorizeError(error);

    // Build full context
    const fullContext: ErrorContext = {
      timestamp,
      ...context,
    };

    if (typeof navigator !== "undefined") {
      fullContext.userAgent = navigator.userAgent;
    }
    if (typeof window !== "undefined") {
      fullContext.url = window.location.href;
    }

    // Create detailed error
    const detailedError: DetailedError = {
      name: error instanceof Error ? error.name : "UnknownError",
      message: error instanceof Error ? error.message : String(error),
      type: errorType,
      context: fullContext,
      severity,
      recoverable: this.isRecoverable(errorType, severity),
      errorId,
    };

    if (error instanceof Error) {
      detailedError.originalError = error;
    }

    // Log the error
    this.logError(detailedError);

    // Store in history
    this.storeError(detailedError);

    // Handle based on severity
    this.handleBySeverity(detailedError);

    return detailedError;
  }

  /**
   * Handle network-related errors
   */
  handleNetworkError(
    error: Error | unknown,
    context: Partial<ErrorContext> = {},
    url?: string
  ): DetailedError {
    const networkContext: Partial<ErrorContext> = {
      ...context,
      component: "NetworkService",
    };
    if (url) {
      networkContext.url = url;
    }
    return this.handleError(
      error,
      networkContext,
      ErrorType.NETWORK_ERROR,
      "high"
    );
  }

  /**
   * Handle API-related errors
   */
  handleAPIError(
    error: Error | unknown,
    context: Partial<ErrorContext> = {},
    endpoint?: string
  ): DetailedError {
    const apiContext: Partial<ErrorContext> = {
      ...context,
      component: "APIService",
    };
    if (endpoint) {
      apiContext.action = endpoint;
    }
    return this.handleError(error, apiContext, ErrorType.API_ERROR, "high");
  }

  /**
   * Handle file-related errors
   */
  handleFileError(
    error: Error,
    context: Partial<ErrorContext> = {},
    fileName?: string
  ): DetailedError {
    return this.handleError(
      error,
      {
        ...context,
        metadata: {
          ...context.metadata,
          fileName,
        },
        component: "FileService",
      },
      ErrorType.FILE_ERROR,
      "medium"
    );
  }

  /**
   * Handle validation errors
   */
  handleValidationError(
    error: Error,
    context: Partial<ErrorContext> = {},
    field?: string
  ): DetailedError {
    return this.handleError(
      error,
      {
        ...context,
        metadata: {
          ...context.metadata,
          field,
        },
        component: "ValidationService",
      },
      ErrorType.VALIDATION_ERROR,
      "low"
    );
  }

  /**
   * Get error history
   */
  getErrorHistory(): DetailedError[] {
    return [...this.errorHistory];
  }

  /**
   * Get errors by type
   */
  getErrorsByType(type: ErrorType): DetailedError[] {
    return this.errorHistory.filter((error) => error.type === type);
  }

  /**
   * Get errors by severity
   */
  getErrorsBySeverity(
    severity: "low" | "medium" | "high" | "critical"
  ): DetailedError[] {
    return this.errorHistory.filter((error) => error.severity === severity);
  }

  /**
   * Clear error history
   */
  clearHistory(): void {
    this.errorHistory = [];
    log.info("Error history cleared", null, "ErrorHandler");
  }

  /**
   * Get error statistics
   */
  getErrorStats(): {
    total: number;
    byType: Record<ErrorType, number>;
    bySeverity: Record<string, number>;
    recentErrors: number;
  } {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const recentErrors = this.errorHistory.filter(
      (error) => new Date(error.context.timestamp) > oneHourAgo
    ).length;

    const byType = Object.values(ErrorType).reduce(
      (acc, type) => {
        acc[type] = this.getErrorsByType(type).length;
        return acc;
      },
      {} as Record<ErrorType, number>
    );

    const bySeverity = ["low", "medium", "high", "critical"].reduce(
      (acc, severity) => {
        acc[severity] = this.getErrorsBySeverity(severity as any).length;
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      total: this.errorHistory.length,
      byType,
      bySeverity,
      recentErrors,
    };
  }

  /**
   * Error categorization rules
   * Maps keywords to error types
   */
  private static readonly ERROR_PATTERNS: Array<{
    type: ErrorType;
    keywords: string[];
  }> = [
    {
      type: ErrorType.NETWORK_ERROR,
      keywords: ["network", "fetch", "connection", "timeout"],
    },
    {
      type: ErrorType.API_ERROR,
      keywords: ["api", "endpoint", "response", "status"],
    },
    {
      type: ErrorType.FILE_ERROR,
      keywords: ["file", "read", "write", "upload"],
    },
    {
      type: ErrorType.VALIDATION_ERROR,
      keywords: ["validation", "invalid", "required", "format"],
    },
    {
      type: ErrorType.CONFIGURATION_ERROR,
      keywords: ["config", "configuration", "setting"],
    },
  ];

  /**
   * Categorize error based on patterns
   * Reduced cyclomatic complexity from 14 to 4
   */
  private categorizeError(error: Error | unknown): ErrorType {
    if (!(error instanceof Error)) {
      return ErrorType.UNKNOWN_ERROR;
    }

    const message = error.message.toLowerCase();
    const name = error.name.toLowerCase();

    // Check each pattern
    for (const pattern of ErrorHandler.ERROR_PATTERNS) {
      const hasKeyword = pattern.keywords.some(
        (keyword) => message.includes(keyword) || name.includes(keyword)
      );

      if (hasKeyword) {
        return pattern.type;
      }
    }

    return ErrorType.UNKNOWN_ERROR;
  }

  private isRecoverable(type: ErrorType, severity: string): boolean {
    if (severity === "critical") return false;
    if (type === ErrorType.NETWORK_ERROR) return true;
    if (type === ErrorType.API_ERROR) return true;
    if (type === ErrorType.FILE_ERROR) return true;
    if (type === ErrorType.VALIDATION_ERROR) return true;

    return false;
  }

  private logError(error: DetailedError): void {
    const logMessage = `[${error.errorId}] ${error.type}: ${error.message}`;
    const logContext = {
      errorId: error.errorId,
      type: error.type,
      severity: error.severity,
      recoverable: error.recoverable,
      context: error.context,
      stack: error.stack,
    };

    switch (error.severity) {
      case "critical":
        log.error(logMessage, logContext, "ErrorHandler");
        break;
      case "high":
        log.error(logMessage, logContext, "ErrorHandler");
        break;
      case "medium":
        log.warn(logMessage, logContext, "ErrorHandler");
        break;
      case "low":
        log.info(logMessage, logContext, "ErrorHandler");
        break;
    }
  }

  private storeError(error: DetailedError): void {
    this.errorHistory.unshift(error);

    // Keep only the most recent errors
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
    }
  }

  private handleBySeverity(error: DetailedError): void {
    switch (error.severity) {
      case "critical":
        // Could trigger emergency procedures, alerts, etc.
        this.handleCriticalError(error);
        break;
      case "high":
        // Could trigger user notifications
        this.handleHighSeverityError(error);
        break;
      case "medium":
        // Could trigger background retry mechanisms
        this.handleMediumSeverityError(error);
        break;
      case "low":
        // Just log and continue
        break;
    }
  }

  private handleCriticalError(error: DetailedError): void {
    // In a real application, this could:
    // - Send alerts to monitoring systems
    // - Trigger emergency fallbacks
    // - Notify administrators
    log.error(
      "Critical error detected - emergency procedures may be needed",
      error,
      "ErrorHandler"
    );
  }

  private handleHighSeverityError(error: DetailedError): void {
    // Could show user notifications for high-severity errors
    log.warn(
      "High severity error - user may need to be notified",
      error,
      "ErrorHandler"
    );
  }

  private handleMediumSeverityError(error: DetailedError): void {
    // Could trigger retry mechanisms or alternative flows
    log.info(
      "Medium severity error - retry mechanisms may be triggered",
      error,
      "ErrorHandler"
    );
  }

  private generateErrorId(): string {
    return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance();

// Export convenience functions
export const handleError = (
  error: Error | unknown,
  context?: Partial<ErrorContext>,
  type?: ErrorType,
  severity?: "low" | "medium" | "high" | "critical"
) => errorHandler.handleError(error, context, type, severity);

export const handleNetworkError = (
  error: Error,
  context?: Partial<ErrorContext>,
  url?: string
) => errorHandler.handleNetworkError(error, context, url);

export const handleAPIError = (
  error: Error,
  context?: Partial<ErrorContext>,
  endpoint?: string
) => errorHandler.handleAPIError(error, context, endpoint);

export const handleFileError = (
  error: Error,
  context?: Partial<ErrorContext>,
  fileName?: string
) => errorHandler.handleFileError(error, context, fileName);

export const handleValidationError = (
  error: Error,
  context?: Partial<ErrorContext>,
  field?: string
) => errorHandler.handleValidationError(error, context, field);
