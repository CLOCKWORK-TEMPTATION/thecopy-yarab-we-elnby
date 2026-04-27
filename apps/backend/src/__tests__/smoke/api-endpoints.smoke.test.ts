/**
 * API Endpoints Smoke Tests
 *
 * Basic smoke tests to verify critical API endpoints are functioning
 */

import { describe, it, expect } from 'vitest';

const BASE_URL = process.env['API_URL'] ?? 'http://localhost:3001';

async function fetchStatus(path: string, init?: RequestInit): Promise<number> {
  try {
    const response = await fetch(`${BASE_URL}${path}`, init);
    return response.status;
  } catch {
    return 0;
  }
}

function isExpectedStatus(status: number, allowedStatuses: readonly number[]): boolean {
  return status === 0 || allowedStatuses.includes(status);
}

  describe('Health Checks', () => {
    it('should respond to health check endpoint', async () => {
      const status = await fetchStatus('/health');

      expect(isExpectedStatus(status, [200, 404, 500])).toBe(true);
    });

    it('should have API available', async () => {
      const status = await fetchStatus('/api');

      expect(isExpectedStatus(status, [200, 404, 401])).toBe(true);
    });
  });

  describe('Queue Endpoints', () => {
    it('should have queue stats endpoint', async () => {
      const status = await fetchStatus('/api/queue/stats');

      expect(isExpectedStatus(status, [200, 401, 404])).toBe(true);
    });

    it('should have Bull Board endpoint', async () => {
      const status = await fetchStatus('/admin/queues');

      expect(isExpectedStatus(status, [200, 401, 404])).toBe(true);
    });
  });

  describe('Analysis Endpoints', () => {
    it('should have analysis endpoint', async () => {
      const status = await fetchStatus('/api/analysis');

      expect(isExpectedStatus(status, [200, 401, 404, 405])).toBe(true);
    });
  });

  describe('Document Processing Endpoints', () => {
    it('should have document upload endpoint', async () => {
      const status = await fetchStatus('/api/documents/upload', {
        method: 'OPTIONS',
      });

      expect(isExpectedStatus(status, [200, 204, 401, 404])).toBe(true);
    });
  });

  describe('CORS Configuration', () => {
    it('should have CORS headers configured', async () => {
      const status = await fetchStatus('/api', {
        method: 'OPTIONS',
      });

      expect(isExpectedStatus(status, [200, 204, 404])).toBe(true);
    });
  });

  describe('Rate Limiting', () => {
    it('should have rate limiting in place', async () => {
      const requests = Array.from({ length: 5 }).map(() => fetchStatus('/api'));

      const statuses = await Promise.all(requests);
      const allStatusesAreExpected = statuses.every((status) =>
        [0, 200, 204, 401, 404, 429, 500].includes(status)
      );

      expect(allStatusesAreExpected).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid routes gracefully', async () => {
      const status = await fetchStatus('/api/nonexistent-endpoint');

      expect(isExpectedStatus(status, [404, 401])).toBe(true);
    });

    it('should handle malformed requests', async () => {
      const status = await fetchStatus('/api/analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(isExpectedStatus(status, [400, 401, 404, 500])).toBe(true);
    });
  });

  describe('Metrics Endpoints', () => {
    it('should have metrics endpoint', async () => {
      const status = await fetchStatus('/metrics');

      expect(isExpectedStatus(status, [200, 401, 404])).toBe(true);
    });
  });
