/**
 * إعدادات Playwright الموحدة للاختبارات E2E التأسيسية للبنية المشتركة.
 *
 * المسارات هنا نسبية إلى موقع هذا الملف نفسه (qa/e2e/) — لا يجوز
 * استخدام مسارات تبدأ من جذر المستودع.
 *
 * المنفذ الرسمي للواجهة هو 5000 (راجع output/session-state.md).
 */
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // testDir نسبي إلى موقع الكونفج. الاختبارات في نفس المجلد.
  testDir: '.',
  testMatch: /.*e2e\.test\.ts$/,
  fullyParallel: false,
  retries: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },

  reporter: [
    ['html', { outputFolder: '../../test-results/playwright-report' }],
    ['json', { outputFile: '../../test-results/playwright-report/results.json' }],
    ['junit', { outputFile: '../../test-results/playwright-report/results.xml' }],
    ['list'],
  ],

  outputDir: '../../test-results/playwright-artifacts',

  use: {
    baseURL: process.env['PLAYWRIGHT_BASE_URL'] || 'http://127.0.0.1:5000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    headless: process.env['PLAYWRIGHT_HEADLESS'] !== 'false',
    slowMo: parseInt(process.env['PLAYWRIGHT_SLOW_MO'] || '0'),
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // إعداد عام للاختبارات (مسار نسبي إلى الكونفج)
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
});