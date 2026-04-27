import { describe, it, expect } from 'vitest';

import { AnalysisService } from './analysis.service';

interface AnalysisServiceInternals {
  runStation1: unknown;
  runStation2: unknown;
  runStation3: unknown;
  runStation4: unknown;
  runStation5: unknown;
  runStation6: unknown;
  runStation7: unknown;
  extractCharacters(text: string): unknown[];
  extractRelationships(text: string): Record<string, unknown>[];
}

function getInternals(service: AnalysisService): AnalysisServiceInternals {
  return service as unknown as AnalysisServiceInternals;
}

describe('AnalysisService', () => {
  let analysisService: AnalysisService;

  it('should create AnalysisService instance', () => {
    analysisService = new AnalysisService();
    expect(analysisService).toBeDefined();
  });

  it('should have runFullPipeline method', () => {
    analysisService = new AnalysisService();
    expect(typeof analysisService.runFullPipeline).toBe('function');
  });

  it('should have private station methods', () => {
    analysisService = new AnalysisService();
    const internals = getInternals(analysisService);
    expect(typeof internals.runStation1).toBe('function');
    expect(typeof internals.runStation2).toBe('function');
    expect(typeof internals.runStation3).toBe('function');
    expect(typeof internals.runStation4).toBe('function');
    expect(typeof internals.runStation5).toBe('function');
    expect(typeof internals.runStation6).toBe('function');
    expect(typeof internals.runStation7).toBe('function');
  });

  it('should have extractCharacters method', () => {
    analysisService = new AnalysisService();
    const result = getInternals(analysisService).extractCharacters('شخصية البطل\nشخصية البطلة');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should limit characters to 10', () => {
    analysisService = new AnalysisService();
    const longText = Array(20).fill('شخصية').join('\n');
    const result = getInternals(analysisService).extractCharacters(longText);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('should have extractRelationships method', () => {
    analysisService = new AnalysisService();
    const result = getInternals(analysisService).extractRelationships('علاقة حب');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return relationship with correct structure', () => {
    analysisService = new AnalysisService();
    const result = getInternals(analysisService).extractRelationships('علاقة');
    expect(result[0]).toHaveProperty('character1');
    expect(result[0]).toHaveProperty('character2');
    expect(result[0]).toHaveProperty('relationshipType');
    expect(result[0]).toHaveProperty('strength');
  });
});
