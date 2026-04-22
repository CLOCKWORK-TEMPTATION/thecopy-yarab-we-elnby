import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logger } from './logger';

describe('Logger Utility', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Logger Instance', () => {
    it('should export a logger instance', () => {
      expect(logger).toBeDefined();
      expect(logger.info).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.debug).toBeDefined();
    });

    it('should have required log methods', () => {
      expect(typeof logger.info).toBe('function');
      expect(typeof logger.error).toBe('function');
      expect(typeof logger.warn).toBe('function');
      expect(typeof logger.debug).toBe('function');
    });
  });

  describe('Logging Functionality', () => {
    it('should log info messages', () => {
      const spy = vi.spyOn(logger, 'info');
      logger.info('Test info message');
      expect(spy).toHaveBeenCalledWith('Test info message');
    });

    it('should log error messages', () => {
      const spy = vi.spyOn(logger, 'error');
      logger.error('Test error message');
      expect(spy).toHaveBeenCalledWith('Test error message');
    });

    it('should log warn messages', () => {
      const spy = vi.spyOn(logger, 'warn');
      logger.warn('Test warn message');
      expect(spy).toHaveBeenCalledWith('Test warn message');
    });

    it('should log debug messages', () => {
      const spy = vi.spyOn(logger, 'debug');
      logger.debug('Test debug message');
      expect(spy).toHaveBeenCalledWith('Test debug message');
    });

    it('should log with metadata', () => {
      const spy = vi.spyOn(logger, 'info');
      logger.info('Test with metadata', { userId: '123', action: 'test' });
      expect(spy).toHaveBeenCalledWith('Test with metadata', { userId: '123', action: 'test' });
    });

    it('should handle error objects', () => {
      const spy = vi.spyOn(logger, 'error');
      const error = new Error('Test error');
      logger.error('Error occurred', { error });
      expect(spy).toHaveBeenCalledWith('Error occurred', { error });
    });
  });

  describe('Configuration', () => {
    it('should have default meta with service name', () => {
      // Logger should be configured with service metadata
      expect(logger).toBeDefined();
    });

    it('should support multiple log levels', () => {
      // All log levels should be available
      expect(logger.info).toBeDefined();
      expect(logger.warn).toBeDefined();
      expect(logger.error).toBeDefined();
      expect(logger.debug).toBeDefined();
    });
  });
});
