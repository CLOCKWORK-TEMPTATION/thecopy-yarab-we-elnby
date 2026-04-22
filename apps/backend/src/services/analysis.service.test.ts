import { describe, it, expect } from 'vitest';
import { AnalysisService } from './analysis.service';

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
    expect(typeof (analysisService as any).runStation1).toBe('function');
    expect(typeof (analysisService as any).runStation2).toBe('function');
    expect(typeof (analysisService as any).runStation3).toBe('function');
    expect(typeof (analysisService as any).runStation4).toBe('function');
    expect(typeof (analysisService as any).runStation5).toBe('function');
    expect(typeof (analysisService as any).runStation6).toBe('function');
    expect(typeof (analysisService as any).runStation7).toBe('function');
  });

  it('should have extractCharacters method', () => {
    analysisService = new AnalysisService();
    const result = (analysisService as any).extractCharacters('شخصية البطل\nشخصية البطلة');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should limit characters to 10', () => {
    analysisService = new AnalysisService();
    const longText = Array(20).fill('شخصية').join('\n');
    const result = (analysisService as any).extractCharacters(longText);
    expect(result.length).toBeLessThanOrEqual(10);
  });

  it('should have extractRelationships method', () => {
    analysisService = new AnalysisService();
    const result = (analysisService as any).extractRelationships('علاقة حب');
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return relationship with correct structure', () => {
    analysisService = new AnalysisService();
    const result = (analysisService as any).extractRelationships('علاقة');
    expect(result[0]).toHaveProperty('character1');
    expect(result[0]).toHaveProperty('character2');
    expect(result[0]).toHaveProperty('relationshipType');
    expect(result[0]).toHaveProperty('strength');
  });
});
