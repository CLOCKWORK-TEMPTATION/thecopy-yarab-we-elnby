/**
 * Metrics Controller
 *
 * Provides comprehensive metrics API endpoints
 * Includes APM (Application Performance Monitoring) dashboard
 */

import { Request, Response } from 'express';
import { metricsAggregator } from '@/services/metrics-aggregator.service';
import { resourceMonitor } from '@/services/resource-monitor.service';
import { cacheMetricsService } from '@/services/cache-metrics.service';
import { logger } from '@/utils/logger';
import {
  getSnapshotData,
  parseDateRange,
  defaultDateRange,
  buildDashboardSummary,
  buildHealthData,
  buildApmAlerts,
  buildApmConfig,
  generateCacheReport,
  generateMetricsReport,
  getPerformanceDashboard,
  resetPerformanceMetrics,
} from './metrics.helpers.js';

export class MetricsController {
  /** GET /api/metrics/snapshot */
  async getSnapshot(_req: Request, res: Response): Promise<void> {
    try {
      const snapshot = await metricsAggregator.takeSnapshot();
      res.json({ success: true, data: snapshot });
    } catch (error) {
      logger.error('Failed to get metrics snapshot:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على لقطة المقاييس' });
    }
  }

  /** GET /api/metrics/latest */
  async getLatest(_req: Request, res: Response): Promise<void> {
    try {
      const data = await getSnapshotData();
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Failed to get latest metrics:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على آخر المقاييس' });
    }
  }

  /** GET /api/metrics/range?start=...&end=... */
  async getRange(req: Request, res: Response): Promise<void> {
    try {
      const parsed = parseDateRange(req.query['start'], req.query['end']);

      if ('error' in parsed) {
        const msg = parsed.error === 'missing' ? 'يجب توفير start و end' : 'تنسيق التاريخ غير صالح';
        res["status"](400).json({ success: false, error: msg });
        return;
      }

      const snapshots = metricsAggregator.getSnapshotsInRange(parsed.startTime, parsed.endTime);
      res.json({ success: true, data: snapshots, count: snapshots.length });
    } catch (error) {
      logger.error('Failed to get metrics range:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على نطاق المقاييس' });
    }
  }

  /** GET /api/metrics/database */
  async getDatabaseMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const data = await getSnapshotData('database');
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Failed to get database metrics:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على مقاييس قاعدة البيانات' });
    }
  }

  /** GET /api/metrics/redis */
  async getRedisMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const data = await getSnapshotData('redis');
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Failed to get Redis metrics:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على مقاييس Redis' });
    }
  }

  /** GET /api/metrics/queue */
  async getQueueMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const data = await getSnapshotData('queue');
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Failed to get queue metrics:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على مقاييس الطوابير' });
    }
  }

  /** GET /api/metrics/api */
  async getApiMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const data = await getSnapshotData('api');
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Failed to get API metrics:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على مقاييس API' });
    }
  }

  /** GET /api/metrics/resources */
  async getResourceMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const resources = await resourceMonitor.getResourceStatus();
      res.json({ success: true, data: resources });
    } catch (error) {
      logger.error('Failed to get resource metrics:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على مقاييس الموارد' });
    }
  }

  /** GET /api/metrics/gemini */
  async getGeminiMetrics(_req: Request, res: Response): Promise<void> {
    try {
      const data = await getSnapshotData('gemini');
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Failed to get Gemini metrics:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على مقاييس Gemini' });
    }
  }

  /** GET /api/metrics/report?start=...&end=... */
  async generateReport(req: Request, res: Response): Promise<void> {
    try {
      const parsed = parseDateRange(req.query['start'], req.query['end']);
      const range = 'error' in parsed ? defaultDateRange() : parsed;

      if ('error' in parsed && parsed.error === 'invalid') {
        res["status"](400).json({ success: false, error: 'تنسيق التاريخ غير صالح' });
        return;
      }

      const report = await generateMetricsReport(range.startTime, range.endTime);
      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('Failed to generate performance report:', error);
      res["status"](500).json({ success: false, error: 'فشل في إنشاء تقرير الأداء' });
    }
  }

  /** GET /api/metrics/health */
  async getHealth(_req: Request, res: Response): Promise<void> {
    try {
      const data = await buildHealthData();
      res.json({ success: true, data });
    } catch (error) {
      logger.error('Failed to get health status:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على حالة النظام' });
    }
  }

  /** GET /api/metrics/dashboard */
  async getDashboardSummary(_req: Request, res: Response): Promise<void> {
    try {
      const summary = await buildDashboardSummary();
      res.json({ success: true, data: summary });
    } catch (error) {
      logger.error('Failed to get dashboard summary:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على ملخص لوحة التحكم' });
    }
  }

  /** GET /api/metrics/cache/snapshot */
  async getCacheSnapshot(_req: Request, res: Response): Promise<void> {
    try {
      const snapshot = await cacheMetricsService.takeSnapshot();
      res.json({ success: true, data: snapshot });
    } catch (error) {
      logger.error('Failed to get cache snapshot:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على لقطة مقاييس الكاش' });
    }
  }

  /** GET /api/metrics/cache/realtime */
  async getCacheRealtime(_req: Request, res: Response): Promise<void> {
    try {
      const stats = cacheMetricsService.getRealTimeStats();
      res.json({ success: true, data: stats });
    } catch (error) {
      logger.error('Failed to get real-time cache stats:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على إحصائيات الكاش الفورية' });
    }
  }

  /** GET /api/metrics/cache/health */
  async getCacheHealth(_req: Request, res: Response): Promise<void> {
    try {
      const health = await cacheMetricsService.getHealthStatus();
      res.json({ success: true, data: health });
    } catch (error) {
      logger.error('Failed to get cache health:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على حالة الكاش الصحية' });
    }
  }

  /** GET /api/metrics/cache/report?start=...&end=... */
  async getCacheReport(req: Request, res: Response): Promise<void> {
    try {
      const parsed = parseDateRange(req.query['start'], req.query['end']);
      const range = 'error' in parsed ? defaultDateRange() : parsed;

      if ('error' in parsed && parsed.error === 'invalid') {
        res["status"](400).json({ success: false, error: 'تنسيق التاريخ غير صالح' });
        return;
      }

      const report = await generateCacheReport(range.startTime, range.endTime);
      res.json({ success: true, data: report });
    } catch (error) {
      logger.error('Failed to generate cache report:', error);
      res["status"](500).json({ success: false, error: 'فشل في إنشاء تقرير أداء الكاش' });
    }
  }

  /** GET /api/metrics/apm/dashboard */
  async getApmDashboard(_req: Request, res: Response): Promise<void> {
    try {
      const dashboard = getPerformanceDashboard();
      res.json({ success: true, data: dashboard });
    } catch (error) {
      logger.error('Failed to get APM dashboard:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على لوحة مراقبة الأداء' });
    }
  }

  /** GET /api/metrics/apm/config */
  async getApmConfig(_req: Request, res: Response): Promise<void> {
    try {
      res.json({ success: true, data: buildApmConfig() });
    } catch (error) {
      logger.error('Failed to get APM config:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على إعدادات APM' });
    }
  }

  /** POST /api/metrics/apm/reset */
  async resetApmMetrics(_req: Request, res: Response): Promise<void> {
    try {
      resetPerformanceMetrics();
      res.json({ success: true, message: 'تم إعادة تعيين مقاييس الأداء' });
    } catch (error) {
      logger.error('Failed to reset APM metrics:', error);
      res["status"](500).json({ success: false, error: 'فشل في إعادة تعيين مقاييس الأداء' });
    }
  }

  /** GET /api/metrics/apm/alerts */
  async getApmAlerts(_req: Request, res: Response): Promise<void> {
    try {
      const alerts = buildApmAlerts();
      res.json({ success: true, data: alerts });
    } catch (error) {
      logger.error('Failed to get APM alerts:', error);
      res["status"](500).json({ success: false, error: 'فشل في الحصول على تنبيهات الأداء' });
    }
  }
}

export const metricsController = new MetricsController();
