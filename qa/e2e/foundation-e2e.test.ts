/**
 * اختبارات E2E تأسيسية للبنية المشتركة
 * تختبر الاتصال بالتطبيق وأساسيات المتصفح
 */
import { test, expect } from '@playwright/test';
import { testConfig } from '../config/TestConfigManager';
import { testLogger } from '../core/TestLogger';
import { testArtifacts } from '../core/TestArtifactsManager';

test.describe('البنية الاختبارية المشتركة - اختبارات E2E التأسيسية', () => {

  test.beforeAll(async () => {
    testLogger.suiteStart('foundation-e2e');
  });

  test.afterAll(async () => {
    testLogger.suiteEnd('foundation-e2e');
  });

  test('يجب أن يفتح التطبيق في المتصفح', async ({ page }) => {
    const startTime = Date.now();

    try {
      testLogger.testStart('app-opens-in-browser');

      // الانتقال للصفحة الرئيسية
      await page.goto('/');

      // انتظار تحميل الصفحة
      await page.waitForLoadState('networkidle');

      // التحقق من وجود عنصر أساسي (افتراضي)
      const title = await page.title();
      expect(title).toBeTruthy();

      // التحقق من عدم وجود أخطاء في console
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      // انتظار قليل لالتقاط أي أخطاء
      await page.waitForTimeout(2000);

      expect(errors.length).toBe(0);

      // حفظ screenshot كدليل على النجاح
      const screenshot = await page.screenshot();
      await testArtifacts.saveScreenshot(screenshot, 'app-loaded.png', {
        testName: 'app-opens-in-browser',
        testSuite: 'foundation-e2e',
        timestamp: new Date(),
        metadata: { title, url: page.url() }
      });

      const duration = Date.now() - startTime;
      testLogger.testPass('app-opens-in-browser', duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      testLogger.testFail('app-opens-in-browser', error as Error, duration);
      throw error;
    }
  });

  test('يجب أن يعمل المتصفح مع JavaScript', async ({ page }) => {
    const startTime = Date.now();

    try {
      testLogger.testStart('browser-javascript-enabled');

      // الانتقال لصفحة اختبار
      await page.goto('/');

      // تنفيذ JavaScript بسيط
      const result = await page.evaluate(() => {
        return {
          userAgent: navigator.userAgent,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled
        };
      });

      expect(result.userAgent).toContain('Chrome');
      expect(result.language).toBeTruthy();
      expect(result.platform).toBeTruthy();
      expect(result.cookieEnabled).toBe(true);

      // التحقق من إمكانية التفاعل
      const canInteract = await page.evaluate(() => {
        const testElement = document.createElement('div');
        testElement.id = 'test-interaction';
        testElement.textContent = 'Test';
        document.body.appendChild(testElement);
        return document.getElementById('test-interaction') !== null;
      });

      expect(canInteract).toBe(true);

      const duration = Date.now() - startTime;
      testLogger.testPass('browser-javascript-enabled', duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      testLogger.testFail('browser-javascript-enabled', error as Error, duration);
      throw error;
    }
  });

  test('يجب أن يدعم المتصفح localStorage و sessionStorage', async ({ page }) => {
    const startTime = Date.now();

    try {
      testLogger.testStart('browser-storage-support');

      // الانتقال لصفحة اختبار
      await page.goto('/');

      // اختبار localStorage
      await page.evaluate(() => {
        localStorage.setItem('test-key', 'test-value');
        sessionStorage.setItem('session-key', 'session-value');
      });

      const localValue = await page.evaluate(() => localStorage.getItem('test-key'));
      const sessionValue = await page.evaluate(() => sessionStorage.getItem('session-key'));

      expect(localValue).toBe('test-value');
      expect(sessionValue).toBe('session-value');

      // تنظيف
      await page.evaluate(() => {
        localStorage.removeItem('test-key');
        sessionStorage.removeItem('session-key');
      });

      const duration = Date.now() - startTime;
      testLogger.testPass('browser-storage-support', duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      testLogger.testFail('browser-storage-support', error as Error, duration);
      throw error;
    }
  });

  test('يجب أن يدعم المتصفح network requests', async ({ page }) => {
    const startTime = Date.now();

    try {
      testLogger.testStart('browser-network-requests');

      // مراقبة الطلبات
      const requests: string[] = [];
      const responses: number[] = [];

      page.on('request', (request) => {
        requests.push(request.url());
      });

      page.on('response', (response) => {
        responses.push(response.status());
      });

      // الانتقال لصفحة
      await page.goto('/');

      // انتظار تحميل الموارد
      await page.waitForLoadState('networkidle');

      // التحقق من وجود طلبات
      expect(requests.length).toBeGreaterThan(0);

      // التحقق من وجود استجابات ناجحة
      const successResponses = responses.filter(status => status >= 200 && status < 300);
      expect(successResponses.length).toBeGreaterThan(0);

      // حفظ trace للشبكة
      const traceContent = JSON.stringify({
        requests: requests.slice(0, 10), // أول 10 طلبات فقط
        responseCodes: responses,
        totalRequests: requests.length
      }, null, 2);

      await testArtifacts.saveTrace(traceContent, 'network-trace.json', {
        testName: 'browser-network-requests',
        testSuite: 'foundation-e2e',
        timestamp: new Date(),
        metadata: { requestCount: requests.length, successCount: successResponses.length }
      });

      const duration = Date.now() - startTime;
      testLogger.testPass('browser-network-requests', duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      testLogger.testFail('browser-network-requests', error as Error, duration);
      throw error;
    }
  });

  test('يجب أن يعمل التسجيل والـ artifacts في E2E', async ({ page }) => {
    const startTime = Date.now();

    try {
      testLogger.testStart('e2e-logging-artifacts');

      // الانتقال لصفحة
      await page.goto('/');

      // تسجيل بعض المعلومات
      const pageInfo = {
        url: page.url(),
        title: await page.title(),
        viewport: await page.viewportSize(),
        timestamp: new Date().toISOString()
      };

      testLogger.info('معلومات الصفحة', {
        testName: 'e2e-logging-artifacts',
        metadata: pageInfo
      });

      // حفظ JSON
      await testArtifacts.saveJson(pageInfo, 'page-info.json', {
        testName: 'e2e-logging-artifacts',
        testSuite: 'foundation-e2e',
        timestamp: new Date()
      });

      // حفظ screenshot
      const screenshot = await page.screenshot({ fullPage: true });
      await testArtifacts.saveScreenshot(screenshot, 'page-full.png', {
        testName: 'e2e-logging-artifacts',
        testSuite: 'foundation-e2e',
        timestamp: new Date()
      });

      const duration = Date.now() - startTime;
      testLogger.testPass('e2e-logging-artifacts', duration);

    } catch (error) {
      const duration = Date.now() - startTime;
      testLogger.testFail('e2e-logging-artifacts', error as Error, duration);
      throw error;
    }
  });
});