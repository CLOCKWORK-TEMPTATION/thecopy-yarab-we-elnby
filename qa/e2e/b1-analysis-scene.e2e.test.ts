/**
 * Playwright E2E — سيناريو B1
 * التحقق من أن خدمة التفكيك (analysis) تُرجع JSON صالحاً دائماً
 * وليس صفحة HTML أو رسالة خطأ خام من Express/Next.
 *
 * قاعدة الفحوصات: هذا الملف يُضاف كمرجع فاشل قبل الإصلاح.
 * يُحظر إضعافه أو تخفيف توقعاته.
 */
import { test, expect } from '@playwright/test';
import { testLogger } from '../core/TestLogger';

const SCENE_TEXT = 'INT. TEST - DAY\nThis is a test scene';

test.describe('B1 — خدمة التفكيك: JSON دائماً لا HTML', () => {

  test.beforeAll(async () => {
    testLogger.suiteStart('b1-analysis-scene');
  });

  test.afterAll(async () => {
    testLogger.suiteEnd('b1-analysis-scene');
  });

  /**
   * B1-T01: تشغيل التحليل يُرجع JSON — لا HTML
   * يُتحقق من أن الـ network response لنقطة النهاية /api/public/analysis/seven-stations/start
   * تحمل Content-Type: application/json وليست صفحة HTML.
   */
  test('B1-T01: ابدأ التحليل → استجابة JSON لا HTML', async ({ page }) => {
    const start = Date.now();
    testLogger.testStart('B1-T01');

    const apiResponses: { url: string; contentType: string; status: number }[] = [];

    // التقاط كل استجابة شبكة تخص نقطة نهاية التحليل
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('/api/public/analysis') || url.includes('/analyze')) {
        const contentType = response.headers()['content-type'] ?? '';
        apiResponses.push({ url, contentType, status: response.status() });
      }
    });

    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');

    // البحث عن حقل الإدخال وتعبئته
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });
    await textarea.fill(SCENE_TEXT);

    // انقر على زر "ابدأ التحليل"
    const startButton = page.locator('button', { hasText: 'ابدأ التحليل' }).first();
    await expect(startButton).toBeEnabled({ timeout: 5_000 });
    await startButton.click();

    // انتظر ظهور أي استجابة من نقطة النهاية (مهلة 30 ثانية)
    await page.waitForTimeout(5_000);

    // التحقق: يجب ألا تكون هناك استجابة HTML من نقطة النهاية
    const htmlResponses = apiResponses.filter(
      (r) =>
        r.contentType.toLowerCase().includes('text/html') &&
        !r.contentType.toLowerCase().includes('application/json')
    );

    expect(
      htmlResponses,
      `وُجدت استجابات HTML من نقطة نهاية API: ${JSON.stringify(htmlResponses)}`
    ).toHaveLength(0);

    // التحقق: يجب ألا تظهر في DOM أي رسالة خطأ HTML خام
    const domText = await page.evaluate(() => document.body.innerText);
    expect(domText).not.toMatch(/<!DOCTYPE/i);
    expect(domText).not.toMatch(/Cannot (GET|POST)/i);
    expect(domText).not.toMatch(/SyntaxError/i);
    expect(domText).not.toMatch(/JSON\.parse/i);
    expect(domText).not.toMatch(/stack trace/i);
    expect(domText).not.toMatch(/Error:/);

    testLogger.testPass('B1-T01', Date.now() - start);
  });

  /**
   * B1-T02: نقطة نهاية start تُرجع JSON مع Content-Type صحيح
   * يستدعي النقطة مباشرة ويتحقق من الرأس.
   */
  test('B1-T02: POST /api/public/analysis/seven-stations/start → Content-Type: application/json', async ({ request }) => {
    const start = Date.now();
    testLogger.testStart('B1-T02');

    const response = await request.post(
      '/api/public/analysis/seven-stations/start',
      {
        data: { text: SCENE_TEXT },
        headers: { 'Content-Type': 'application/json' },
        timeout: 30_000,
      }
    );

    const contentType = response.headers()['content-type'] ?? '';

    // يجب أن يكون Content-Type JSON
    expect(
      contentType.toLowerCase(),
      `Content-Type المُرجَع: "${contentType}" — يُتوقع application/json`
    ).toContain('application/json');

    // يجب ألا يكون الرد HTML
    expect(contentType.toLowerCase()).not.toContain('text/html');

    // يجب أن يكون الـ body قابل للـ parse كـ JSON
    const body = await response.json().catch(() => null);
    expect(body, 'الرد غير قابل للـ parse كـ JSON').not.toBeNull();

    testLogger.testPass('B1-T02', Date.now() - start);
  });

  /**
   * B1-T03: استجابة 4xx تُرجع JSON بصيغة {error, code, traceId}
   * نرسل نصاً فارغاً ونتحقق من شكل الخطأ.
   */
  test('B1-T03: POST بنص فارغ → JSON {error, code} لا HTML', async ({ request }) => {
    const start = Date.now();
    testLogger.testStart('B1-T03');

    const response = await request.post(
      '/api/public/analysis/seven-stations/start',
      {
        data: { text: '' },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      }
    );

    // يجب أن يكون الرمز 400 أو 422
    expect([400, 422]).toContain(response.status());

    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType.toLowerCase()).toContain('application/json');

    const body = await response.json().catch(() => null);
    expect(body).not.toBeNull();
    expect(typeof body).toBe('object');

    // يجب أن يحتوي على حقل error
    expect(body).toHaveProperty('error');
    expect(typeof (body as Record<string, unknown>)['error']).toBe('string');

    // يجب ألا يحتوي على stack trace
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/stack/i);
    expect(bodyStr).not.toMatch(/<!DOCTYPE/i);

    testLogger.testPass('B1-T03', Date.now() - start);
  });

  /**
   * B1-T04: صفحة التحليل تُحمَّل بدون أخطاء console حرجة
   */
  test('B1-T04: صفحة /analysis تُحمَّل بدون أخطاء console حرجة', async ({ page }) => {
    const start = Date.now();
    testLogger.testStart('B1-T04');

    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/analysis');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2_000);

    // تصفية أخطاء معروفة غير مؤثرة
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes('favicon') &&
        !e.includes('404') &&
        !e.includes('net::ERR_ABORTED')
    );

    expect(
      criticalErrors,
      `أخطاء console: ${criticalErrors.join('\n')}`
    ).toHaveLength(0);

    testLogger.testPass('B1-T04', Date.now() - start);
  });
});
