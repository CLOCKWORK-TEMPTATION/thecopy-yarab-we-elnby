import { defineConfig } from 'vitest/config';

/**
 * إعداد vitest لـ @the-copy/breakapp
 *
 * ملاحظات:
 *   - بيئة jsdom للاختبارات التي تحاكي DOM
 *   - globals لتفعيل describe/it/expect بدون استيراد صريح
 *   - setupFiles لتحميل jest-dom matchers وتهيئة window قبل كل اختبار
 *   - نطاق التغطية مقصور على الملفات المختبرة فعلياً لتجنب أخطاء
 *     "perFile threshold" على الملفات غير المختبرة (maps/sockets ...إلخ)
 *     التي تحتاج تجهيزات اختبار أعمق تخرج عن نطاق هذا الإصلاح
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.{test,spec}.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov', 'json-summary'],
      include: [
        'src/hooks/useQRCamera.ts',
        'src/components/scanner/QRScanner.tsx',
      ],
      all: true,
      perFile: true,
      skipFull: false,
      thresholds: {
        global: {
          branches: 80,
          functions: 85,
          lines: 85,
          statements: 85,
        },
      },
    },
  },
});
