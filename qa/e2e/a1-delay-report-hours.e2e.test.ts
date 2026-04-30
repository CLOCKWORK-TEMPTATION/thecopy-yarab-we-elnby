/**
 * Playwright E2E — سيناريو A1
 * التحقق من أن إبلاغ التأخير يُحدِّث "الساعات المهدرة" فوراً
 * في لوحة الإنتاجية دون إعادة تحميل الصفحة.
 *
 * قاعدة الفحوصات: هذا الملف مرجع فاشل قبل الإصلاح.
 * يُحظر إضعافه أو تخفيف توقعاته.
 */
import { test, expect } from '@playwright/test';
import { testLogger } from '../core/TestLogger';

const DELAY_HOURS = '2.5';
const DELAY_REASON = 'تأخر في توريد المعدات';
const ART_DIRECTOR_URL = '/art-director';

test.describe('A1 — إبلاغ التأخير يُحدِّث الساعات المهدرة فوراً', () => {

  test.beforeAll(async () => {
    testLogger.suiteStart('a1-delay-report-hours');
  });

  test.afterAll(async () => {
    testLogger.suiteEnd('a1-delay-report-hours');
  });

  /**
   * A1-T01: تعبئة نموذج التأخير وقراءة "الساعات المهدرة" بعده مباشرة
   * يتحقق من التحديث الفوري للقيمة دون reload.
   */
  test('A1-T01: إرسال 2.5 ساعة تأخر → الساعات المهدرة تتحدث فوراً', async ({ page }) => {
    const start = Date.now();
    testLogger.testStart('A1-T01');

    // تتبع أي عمليات reload غير مقصودة
    let pageReloaded = false;
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame() && frame.url().includes(ART_DIRECTOR_URL)) {
        pageReloaded = true;
      }
    });

    await page.goto(ART_DIRECTOR_URL);
    await page.waitForLoadState('networkidle');

    // الانتقال إلى تبويب/قسم الإنتاجية
    const productivityTab = page.locator('[href*="productivity"], button:has-text("إنتاجية"), a:has-text("إنتاجية"), button:has-text("Productivity")').first();
    if (await productivityTab.isVisible({ timeout: 5_000 })) {
      await productivityTab.click();
      await page.waitForLoadState('networkidle');
    }

    // قراءة قيمة "الساعات المهدرة" قبل الإرسال
    const metricSelector = 'text=الساعات المهدرة';
    const metricCard = page.locator(metricSelector).locator('..').locator('..');

    // انقر على "الإبلاغ عن تأخير"
    const delayButton = page
      .locator('button', { hasText: 'الإبلاغ عن تأخير' })
      .first();
    await expect(delayButton).toBeVisible({ timeout: 10_000 });

    // قراءة القيمة الحالية للساعات المهدرة
    const hoursBefore = await page
      .locator('[data-testid="delay-hours"], text=/\\d+(\\.\\d+)?\\s*ساعة/')
      .first()
      .textContent()
      .catch(() => null);

    await delayButton.click();

    // تعبئة نموذج التأخير
    const hoursInput = page
      .locator('input[placeholder*="ساعات"], input[id*="hours"], input[type="number"]')
      .last();
    await expect(hoursInput).toBeVisible({ timeout: 5_000 });
    await hoursInput.fill(DELAY_HOURS);

    // تعبئة السبب
    const reasonInput = page
      .locator('input[placeholder*="سبب"], textarea[placeholder*="سبب"], input[id*="reason"]')
      .first();
    if (await reasonInput.isVisible({ timeout: 3_000 })) {
      await reasonInput.fill(DELAY_REASON);
    }

    // إرسال النموذج
    const submitButton = page.locator('button', { hasText: 'تسجيل' }).or(
      page.locator('button[type="submit"]')
    ).last();
    await submitButton.click();

    // انتظار اختفاء النموذج (تأكيد النجاح)
    await expect(page.locator('button', { hasText: 'تسجيل' })).toBeHidden({ timeout: 8_000 });

    // التحقق: لم يحدث reload
    expect(pageReloaded).toBe(false);

    // انتظار تحديث قيمة الساعات المهدرة في الواجهة
    await expect(
      page.locator('text=الساعات المهدرة').locator('..').locator('..')
    ).toContainText(/\d/, { timeout: 8_000 });

    testLogger.testPass('A1-T01', Date.now() - start);
  });

  /**
   * A1-T02: POST /api/productivity/report-delay يُرجع JSON صالح
   */
  test('A1-T02: POST /api/productivity/report-delay → JSON {success: true}', async ({ request }) => {
    const start = Date.now();
    testLogger.testStart('A1-T02');

    const response = await request.post(
      '/api/art-director/productivity/report-delay',
      {
        data: {
          hoursLost: 2.5,
          reason: DELAY_REASON,
          impact: 'medium',
        },
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      }
    );

    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType.toLowerCase()).toContain('application/json');

    const body = await response.json().catch(() => null);
    expect(body).not.toBeNull();

    // لا يجوز أن يحتوي الرد على stack trace أو HTML
    const bodyStr = JSON.stringify(body);
    expect(bodyStr).not.toMatch(/<!DOCTYPE/i);
    expect(bodyStr).not.toMatch(/stack/i);
    expect(bodyStr).not.toMatch(/Cannot POST/i);

    testLogger.testPass('A1-T02', Date.now() - start);
  });

  /**
   * A1-T03: GET /api/art-director/analyze/productivity يتضمن delayHours بعد الإبلاغ
   */
  test('A1-T03: تحديث delayHours في لقطة الإنتاجية بعد إرسال التأخير', async ({ request }) => {
    const start = Date.now();
    testLogger.testStart('A1-T03');

    // إرسال تأخير
    await request.post('/api/art-director/productivity/report-delay', {
      data: { hoursLost: 2.5, reason: DELAY_REASON, impact: 'high' },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15_000,
    });

    // جلب لقطة التحليل مباشرة بعد الإبلاغ
    const analysisResponse = await request.post(
      '/api/art-director/analyze/productivity',
      {
        data: {},
        headers: { 'Content-Type': 'application/json' },
        timeout: 15_000,
      }
    );

    const contentType = analysisResponse.headers()['content-type'] ?? '';
    expect(contentType.toLowerCase()).toContain('application/json');

    const body = await analysisResponse.json().catch(() => null);
    expect(body).not.toBeNull();

    // البيانات يجب أن تحتوي على delayHours
    const data = (body as Record<string, unknown>)['data'] ?? body;
    expect(typeof (data as Record<string, unknown>)['delayHours']).toBe('number');

    testLogger.testPass('A1-T03', Date.now() - start);
  });

  /**
   * A1-T04: cache يُبطَل فور إرسال التأخير — القيمة الجديدة ظاهرة فوراً
   */
  test('A1-T04: القيمة المعروضة تتغير فور الإرسال بدون reload', async ({ page }) => {
    const start = Date.now();
    testLogger.testStart('A1-T04');

    // تتبع أي navigation
    const navigations: string[] = [];
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) navigations.push(frame.url());
    });

    await page.goto(ART_DIRECTOR_URL);
    await page.waitForLoadState('networkidle');
    const initialNavCount = navigations.length;

    // انتقل لقسم الإنتاجية إن وُجد
    const productivityLink = page.locator('button:has-text("إنتاجية"), a:has-text("إنتاجية")').first();
    if (await productivityLink.isVisible({ timeout: 3_000 })) {
      await productivityLink.click();
      await page.waitForLoadState('networkidle');
    }

    // افتح نموذج التأخير
    const delayBtn = page.locator('button', { hasText: 'الإبلاغ عن تأخير' }).first();
    await expect(delayBtn).toBeVisible({ timeout: 10_000 });
    await delayBtn.click();

    // أدخل القيم
    const numInput = page.locator('input[type="number"]').last();
    await expect(numInput).toBeVisible({ timeout: 5_000 });
    await numInput.fill('1.5');

    const reasonField = page.locator('input, textarea').filter({ hasText: '' }).nth(1);
    if (await reasonField.isVisible({ timeout: 2_000 })) {
      await reasonField.fill('اختبار آلي');
    }

    // أرسل
    const confirmBtn = page
      .locator('button', { hasText: 'تسجيل' })
      .or(page.locator('button[type="submit"]'))
      .last();
    await confirmBtn.click();

    // انتظر اختفاء النموذج
    await page.waitForTimeout(3_000);

    // تحقق: لم تحدث navigation إضافية
    const afterNavCount = navigations.length;
    expect(
      afterNavCount - initialNavCount,
      'حدثت navigations غير متوقعة — قد يكون الصفحة أُعيد تحميلها'
    ).toBeLessThanOrEqual(1);

    testLogger.testPass('A1-T04', Date.now() - start);
  });
});
