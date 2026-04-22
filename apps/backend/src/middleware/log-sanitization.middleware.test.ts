import { describe, it, expect } from 'vitest';
import {
  sanitizeString,
  sanitizeObject,
  PII_PATTERNS,
} from './log-sanitization.middleware';

describe('Log Sanitization Middleware', () => {
  describe('sanitizeString', () => {
    it('should redact email addresses', () => {
      const input = 'User email is test@example.com';
      const result = sanitizeString(input);
      expect(result).toBe('User email is [EMAIL_REDACTED]');
      expect(result).not.toContain('test@example.com');
    });

    it('should redact multiple email addresses', () => {
      const input = 'Contact test@example.com or admin@company.org';
      const result = sanitizeString(input);
      expect(result).not.toContain('test@example.com');
      expect(result).not.toContain('admin@company.org');
      expect(result).toContain('[EMAIL_REDACTED]');
    });

    it('should redact passwords in key-value pairs', () => {
      const input = '"password":"mySecretPass123"';
      const result = sanitizeString(input);
      expect(result).not.toContain('mySecretPass123');
      expect(result).toContain('[REDACTED]');
    });

    it('should redact passwords with different formats', () => {
      const testCases = [
        'password: mypass',
        'password=secret123',
        '"password":"test"',
        'pwd: hunter2',
        'secret: topsecret',
      ];

      testCases.forEach((input) => {
        const result = sanitizeString(input);
        expect(result).toContain('[REDACTED]');
        expect(result).not.toMatch(/(?:mypass|secret123|test|hunter2|topsecret)/);
      });
    });

    it('should redact JWT tokens', () => {
      const input = 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c';
      const result = sanitizeString(input);
      expect(result).toContain('[JWT_REDACTED]');
      expect(result).not.toContain('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9');
    });

    it('should redact API keys', () => {
      const input = 'api_key: sk-1234567890abcdef';
      const result = sanitizeString(input);
      expect(result).toContain('[API_KEY_REDACTED]');
      expect(result).not.toContain('sk-1234567890abcdef');
    });

    it('should redact credit card numbers', () => {
      const testCases = [
        '4532-1488-0343-6467',
        '4532 1488 0343 6467',
        '4532148803436467',
      ];

      testCases.forEach((input) => {
        const result = sanitizeString(input);
        expect(result).toContain('[CARD_REDACTED]');
        expect(result).not.toContain(input.replace(/[\s-]/g, ''));
      });
    });

    it('should redact US SSN', () => {
      const input = 'SSN: 123-45-6789';
      const result = sanitizeString(input);
      expect(result).toContain('[SSN_REDACTED]');
      expect(result).not.toContain('123-45-6789');
    });

    it('should redact phone numbers', () => {
      const testCases = [
        '+1-555-123-4567',
        '(555) 123-4567',
        '555.123.4567',
        '5551234567',
      ];

      testCases.forEach((input) => {
        const result = sanitizeString(input);
        expect(result).toContain('[PHONE_REDACTED]');
      });
    });

    it('should redact authorization headers', () => {
      const input = 'authorization: Bearer abc123xyz';
      const result = sanitizeString(input);
      expect(result).toContain('[AUTH_REDACTED]');
      expect(result).not.toContain('abc123xyz');
    });

    it('should handle multiple PII types in one string', () => {
      const input = 'User test@example.com with password=secret123 and phone 555-1234';
      const result = sanitizeString(input);
      expect(result).not.toContain('test@example.com');
      expect(result).not.toContain('secret123');
      expect(result).toContain('[EMAIL_REDACTED]');
      expect(result).toContain('[REDACTED]');
      expect(result).toContain('[PHONE_REDACTED]');
    });

    it('should not modify strings without PII', () => {
      const input = 'This is a normal log message without sensitive data';
      const result = sanitizeString(input);
      expect(result).toBe(input);
    });
  });

  describe('sanitizeObject', () => {
    it('should sanitize nested object with email', () => {
      const input = {
        user: {
          name: 'John Doe',
          email: 'john@example.com',
          age: 30,
        },
      };
      const result = sanitizeObject(input);
      expect(result.user.name).toBe('John Doe');
      expect(result.user.email).toBe('[EMAIL_REDACTED]');
      expect(result.user.age).toBe(30);
    });

    it('should redact entire password fields', () => {
      const input = {
        username: 'testuser',
        password: 'supersecret123',
        confirmPassword: 'supersecret123',
      };
      const result = sanitizeObject(input);
      expect(result.username).toBe('testuser');
      expect(result.password).toBe('[REDACTED]');
      expect(result.confirmPassword).toBe('[REDACTED]');
    });

    it('should redact sensitive field names', () => {
      const input = {
        apiKey: 'sk-123456',
        accessToken: 'token-abc',
        refreshToken: 'token-xyz',
        secret: 'my-secret',
        normalField: 'normal-value',
      };
      const result = sanitizeObject(input);
      expect(result.apiKey).toBe('[REDACTED]');
      expect(result.accessToken).toBe('[REDACTED]');
      expect(result.refreshToken).toBe('[REDACTED]');
      expect(result.secret).toBe('[REDACTED]');
      expect(result.normalField).toBe('normal-value');
    });

    it('should sanitize arrays of objects', () => {
      const input = {
        users: [
          { name: 'User 1', email: 'user1@example.com' },
          { name: 'User 2', email: 'user2@example.com' },
        ],
      };
      const result = sanitizeObject(input);
      expect(result.users[0].name).toBe('User 1');
      expect(result.users[0].email).toBe('[EMAIL_REDACTED]');
      expect(result.users[1].name).toBe('User 2');
      expect(result.users[1].email).toBe('[EMAIL_REDACTED]');
    });

    it('should handle deeply nested objects', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              email: 'deep@example.com',
              password: 'secret',
            },
          },
        },
      };
      const result = sanitizeObject(input);
      expect(result.level1.level2.level3.email).toBe('[EMAIL_REDACTED]');
      expect(result.level1.level2.level3.password).toBe('[REDACTED]');
    });

    it('should handle null and undefined values', () => {
      const input = {
        nullValue: null,
        undefinedValue: undefined,
        email: 'test@example.com',
      };
      const result = sanitizeObject(input);
      expect(result.nullValue).toBe(null);
      expect(result.undefinedValue).toBe(undefined);
      expect(result.email).toBe('[EMAIL_REDACTED]');
    });

    it('should sanitize mixed types in arrays', () => {
      const input = {
        data: [
          'string with test@example.com',
          123,
          { email: 'nested@example.com' },
          null,
        ],
      };
      const result = sanitizeObject(input);
      expect(result.data[0]).toContain('[EMAIL_REDACTED]');
      expect(result.data[1]).toBe(123);
      expect(result.data[2].email).toBe('[EMAIL_REDACTED]');
      expect(result.data[3]).toBe(null);
    });
  });

  describe('PII_PATTERNS', () => {
    it('should have all necessary PII patterns defined', () => {
      const patternDescriptions = PII_PATTERNS.map((p) => p.description);

      expect(patternDescriptions).toContain('Email addresses');
      expect(patternDescriptions).toContain('Password fields');
      expect(patternDescriptions).toContain('JWT tokens');
      expect(patternDescriptions).toContain('API keys');
      expect(patternDescriptions).toContain('Credit card numbers');
      expect(patternDescriptions).toContain('Social Security Numbers');
      expect(patternDescriptions).toContain('Phone numbers');
      expect(patternDescriptions).toContain('Authorization headers');
      expect(patternDescriptions).toContain('Session IDs');
    });

    it('should all patterns have valid RegExp', () => {
      PII_PATTERNS.forEach((pattern) => {
        expect(pattern.pattern).toBeInstanceOf(RegExp);
        expect(pattern.replacement).toBeDefined();
        expect(pattern.description).toBeDefined();
      });
    });
  });

  describe('Real-world scenarios', () => {
    it('should sanitize typical login request log', () => {
      const input = {
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'user@example.com',
          password: 'MyPassword123!',
        },
        headers: {
          authorization: 'Bearer token123',
        },
      };
      const result = sanitizeObject(input);

      expect(result.method).toBe('POST');
      expect(result.url).toBe('/api/auth/login');
      expect(result.body.email).toBe('[EMAIL_REDACTED]');
      expect(result.body.password).toBe('[REDACTED]');
      expect(result.headers.authorization).toBe('[REDACTED]');
    });

    it('should sanitize error logs with user info', () => {
      const input = {
        error: 'Authentication failed',
        user: {
          email: 'test@example.com',
          id: '12345',
        },
        timestamp: '2024-01-01T00:00:00Z',
      };
      const result = sanitizeObject(input);

      expect(result.error).toBe('Authentication failed');
      expect(result.user.email).toBe('[EMAIL_REDACTED]');
      expect(result.user.id).toBe('12345');
      expect(result.timestamp).toBe('2024-01-01T00:00:00Z');
    });

    it('should sanitize Gemini API request with token', () => {
      const input = 'Making request to Gemini API with api_key: AIzaSyD-xxxxxxxxxxxxx';
      const result = sanitizeString(input);

      expect(result).toContain('[API_KEY_REDACTED]');
      expect(result).not.toContain('AIzaSyD-xxxxxxxxxxxxx');
    });
  });
});
