import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Request, Response } from 'express';

const { mockRunFullPipeline, mockQueueAIAnalysis } = vi.hoisted(() => ({
  mockRunFullPipeline: vi.fn(),
  mockQueueAIAnalysis: vi.fn(),
}));

vi.mock('@/services/analysis.service', () => ({
  AnalysisService: class MockAnalysisService {
    runFullPipeline = mockRunFullPipeline;
  },
}));

vi.mock('@/queues/jobs/ai-analysis.job', () => ({
  queueAIAnalysis: mockQueueAIAnalysis,
}));

vi.mock('@/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { AnalysisController } from './analysis.controller';

describe('AnalysisController', () => {
  let analysisController: AnalysisController;
  let mockRequest: Partial<Request> & { user?: { id: string } };
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    analysisController = new AnalysisController();
    mockRequest = {
      body: {},
      user: { id: 'user-123' },
    };
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('runSevenStationsPipeline', () => {
    it('يعالج النص عبر خدمة التحليل المباشرة', async () => {
      mockRunFullPipeline.mockResolvedValue({
        pipelineMetadata: { averageConfidence: 0.91 },
        stationOutputs: {
          station7: {
            details: {
              finalReport: 'تقرير التحليل الكامل',
            },
          },
        },
      });

      mockRequest.body = { text: 'نص درامي للتحليل' };

      await analysisController.runSevenStationsPipeline(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockRunFullPipeline).toHaveBeenCalledWith(
        expect.objectContaining({
          fullText: 'نص درامي للتحليل',
          projectName: 'تحليل سيناريو',
          language: 'ar',
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          report: 'تقرير التحليل الكامل',
          confidence: 0.91,
          executionTime: expect.any(Number),
          timestamp: expect.any(String),
          stationsCount: 7,
        })
      );
    });

    it('يعيد 400 عندما يغيب النص', async () => {
      mockRequest.body = {};

      await analysisController.runSevenStationsPipeline(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'النص مطلوب ولا يمكن أن يكون فارغاً',
        code: 'INVALID_TEXT',
      });
    });

    it('يعيد 400 عندما يكون النص فارغاً', async () => {
      mockRequest.body = { text: '   ' };

      await analysisController.runSevenStationsPipeline(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });

    it('يحوّل الطلب إلى قائمة الانتظار في النمط غير المتزامن', async () => {
      mockQueueAIAnalysis.mockResolvedValue('job-123');
      mockRequest.body = { text: 'نص طويل', async: true };

      await analysisController.runSevenStationsPipeline(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockQueueAIAnalysis).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          analysisType: 'full',
          options: { text: 'نص طويل' },
        })
      );
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          jobId: 'job-123',
          message: 'تم إضافة التحليل إلى قائمة الانتظار',
        })
      );
    });

    it('يعيد 500 عندما تفشل خدمة التحليل', async () => {
      mockRunFullPipeline.mockRejectedValue(new Error('Pipeline failed'));
      mockRequest.body = { text: 'نص الاختبار' };

      await analysisController.runSevenStationsPipeline(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: 'حدث خطأ أثناء تحليل النص',
        message: 'Pipeline failed',
        code: 'ANALYSIS_FAILED',
      });
    });
  });

  describe('getStationDetails', () => {
    it('يعيد معلومات المحطات السبع', async () => {
      await analysisController.getStationDetails(
        mockRequest as Request,
        mockResponse as Response
      );

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          stations: expect.any(Array),
          totalStations: 7,
          executionOrder: expect.any(String),
          outputFormat: expect.any(String),
        })
      );

      const stations = (mockResponse.json as ReturnType<typeof vi.fn>).mock.calls[0][0].stations;
      expect(stations).toHaveLength(7);
      expect(new Set(stations.map((station: { id: string }) => station.id)).size).toBe(7);
    });
  });
});
