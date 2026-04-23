/**
 * Log Sanitization Middleware
 *
 * This middleware sanitizes logs to prevent PII (Personally Identifiable Information)
 * from being logged. It redacts sensitive data like passwords, emails, tokens, etc.
 */

export interface SanitizationPatterns {
  pattern: RegExp;
  replacement: string;
  description: string;
}

const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'passwd',
  'pwd',
  'secret',
  'token',
  'apiKey',
  'api_key',
  'accessToken',
  'access_token',
  'refreshToken',
  'refresh_token',
  'authorization',
  'cookie',
  'session',
  'sessionId',
  'creditCard',
  'credit_card',
  'cardNumber',
  'card_number',
  'ssn',
  'socialSecurity',
  'social_security',
];

const UNSAFE_LOG_KEYS = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

function normalizeLogKey(key: string): string {
  const normalized = key.replace(/[^\w.$-]/g, '_').slice(0, 120) || 'field';
  return UNSAFE_LOG_KEYS.has(normalized) ? `blocked_${normalized}` : normalized;
}

function shouldRedactKey(key: string): boolean {
  const lowerKey = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((sensitive) =>
    lowerKey.includes(sensitive.toLowerCase())
  );
}

/**
 * PII patterns to detect and sanitize
 */
export const PII_PATTERNS: SanitizationPatterns[] = [
  // Passwords - any field with 'password', 'passwd', 'pwd' in the key
  {
    pattern: /(["']?(?:password|passwd|pwd|secret)["']?\s*[:=]\s*["']?)([^"',}\s]+)(["']?)/gi,
    replacement: '$1[REDACTED]$3',
    description: 'Password fields',
  },

  // Email addresses
  {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
    description: 'Email addresses',
  },

  // JWT Tokens (Bearer tokens)
  {
    pattern: /(Bearer\s+)[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/gi,
    replacement: '$1[JWT_REDACTED]',
    description: 'JWT tokens',
  },

  // API Keys (common patterns)
  {
    pattern: /(["']?(?:api[_-]?key|apikey|access[_-]?token|auth[_-]?token)["']?\s*[:=]\s*["']?)([A-Za-z0-9_\-]+)(["']?)/gi,
    replacement: '$1[API_KEY_REDACTED]$3',
    description: 'API keys',
  },

  // Credit Card Numbers (basic pattern - 13-19 digits)
  {
    pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4,7}\b/g,
    replacement: '[CARD_REDACTED]',
    description: 'Credit card numbers',
  },

  // SSN (Social Security Numbers) - US format
  {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
    description: 'Social Security Numbers',
  },

  // Phone numbers (various formats)
  {
    pattern: /(?:\b(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{3}[-.\s]?\d{4}\b)/g,
    replacement: '[PHONE_REDACTED]',
    description: 'Phone numbers',
  },

  // Authorization headers
  {
    pattern: /(authorization["']?\s*[:=]\s*["']?)(?!(?:Bearer\s+(?:\[JWT_REDACTED\]|[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+)))([^"',}\r\n]+)(["']?)/gi,
    replacement: '$1[AUTH_REDACTED]$3',
    description: 'Authorization headers',
  },

  // Session IDs and cookies
  {
    pattern: /(["']?(?:session|sessionid|sid|cookie)["']?\s*[:=]\s*["']?)([^"',}\s]{20,})(["']?)/gi,
    replacement: '$1[SESSION_REDACTED]$3',
    description: 'Session IDs',
  },

  // IP Addresses (optional - sometimes IPs are needed for debugging)
  // Uncomment if you want to redact IP addresses
  // {
  //   pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  //   replacement: '[IP_REDACTED]',
  //   description: 'IP addresses',
  // },
];

/**
 * Sanitizes a string by redacting PII based on predefined patterns
 * @param input - The string to sanitize
 * @returns Sanitized string with PII redacted
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  for (const { pattern, replacement, description } of PII_PATTERNS) {
    if (description === 'Authorization headers') {
      sanitized = sanitized.replace(
        pattern,
        (_match, prefix: string, value: string, suffix = '') =>
          value.includes('[JWT_REDACTED]')
            ? `${prefix}${value}${suffix}`
            : `${prefix}[AUTH_REDACTED]${suffix}`
      );
      continue;
    }

    sanitized = sanitized.replace(pattern, replacement);
  }

  return sanitized;
}

/**
 * Recursively sanitizes an object by redacting PII from all string values
 * @param obj - The object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle strings
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }

  // Handle objects
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [
        normalizeLogKey(key),
        shouldRedactKey(key) ? '[REDACTED]' : sanitizeObject(value),
      ])
    );
  }

  // Return primitive values as-is
  return obj;
}

/**
 * Creates a Winston format for sanitizing logs
 * @returns Winston format function
 */
export const sanitizeLogFormat = {
  transform: (info: Record<string, unknown>) => {
    return Object.fromEntries(
      Object.entries(info).map(([key, value]) => {
        const safeKey = normalizeLogKey(key);

        if (key === 'message' && typeof value === 'string') {
          return [safeKey, sanitizeString(value)];
        }

        if (key === 'level' || key === 'timestamp' || key === 'service') {
          return [safeKey, value];
        }

        return [safeKey, sanitizeObject(value)];
      })
    );
  },
};

/**
 * Express middleware to sanitize request logs
 */
export const sanitizeRequestLogs = (req: Record<string, unknown>, _res: unknown, next: () => void) => {
  // Create a sanitized version of the request for logging
  const sanitizedRequest = {
    method: req['method'],
    url: sanitizeString(req['url'] as string),
    headers: sanitizeObject({ ...(req['headers'] as Record<string, unknown>) }),
    query: sanitizeObject({ ...(req['query'] as Record<string, unknown>) }),
    // Don't log body by default - it often contains sensitive data
    // If you need to log body, ensure it's sanitized:
    // body: sanitizeObject({ ...req.body }),
  };

  // Attach sanitized request to req for later use in logging
  req['sanitizedLog'] = sanitizedRequest;

  next();
};

/**
 * Sanitize historical log files
 * @param logContent - Content of the log file
 * @returns Sanitized log content
 */
export function sanitizeHistoricalLogs(logContent: string): string {
  return sanitizeString(logContent);
}
