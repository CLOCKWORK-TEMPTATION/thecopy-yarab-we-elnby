/**
 * @description اختبارات بوابات الإفراج (Release Gates)
 *
 * هذه الاختبارات بمثابة البوابات الحاكمة للإفراج عن النسخة.
 * إذا فشل أي من هذه الشروط، يجب أن يُحظر الإفراج.
 *
 * الاختبارات تغطي:
 * 1. جاهزية محرك الكرنك (karank)
 * 2. تفعيل نماذج الشك والمراجعة النهائية
 * 3. تحميل التركيبة المرجعية
 * 4. ملكية الاستيراد (directors-studio لم تعد تستورد الملفات)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// حساب المسار إلى جذر المستودع
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '../../../..');

// ==================== البوابات الحرجة ====================

describe('Release Gates - البوابات الحاكمة للإفراج', () => {
  // البوابة 1: فحص جاهزية الكرنك
  it('karank probe returns ok', async () => {
    // استيراد مسبار جاهزية الكرنك
    const { probeKarankReadiness } = await import(
      '../services/karank-readiness.mjs'
    );

    // استدعاء المسبار
    const result = await probeKarankReadiness();

    // التأكد من أن النتيجة توجد والـ ok صحيح
    assert(result, 'يجب أن ترجع النتيجة قيمة');
    assert.strictEqual(
      result.ok,
      true,
      'يجب أن يكون probeKarankReadiness().ok === true للإفراج'
    );
  });

  // البوابة 2: التحقق من أن Python جاهز
  it('python.ok is true', async () => {
    const { probeKarankReadiness } = await import(
      '../services/karank-readiness.mjs'
    );

    const result = await probeKarankReadiness();

    assert(result.python, 'يجب أن توجد معلومات Python في النتيجة');
    assert.strictEqual(
      result.python.ok,
      true,
      'يجب أن يكون Python جاهزاً (ok === true)'
    );
  });

  // البوابة 3: التحقق من أن Ping يعمل
  it('ping.ok is true', async () => {
    const { probeKarankReadiness } = await import(
      '../services/karank-readiness.mjs'
    );

    const result = await probeKarankReadiness();

    assert(result.ping, 'يجب أن توجد معلومات Ping في النتيجة');
    assert.strictEqual(
      result.ping.ok,
      true,
      'يجب أن يكون Ping ناجحاً (ok === true)'
    );
  });

  // البوابة 4: التحقق من مسبار استخراج النصوص
  it('textExtractProbe.ok is true', async () => {
    const { probeKarankReadiness } = await import(
      '../services/karank-readiness.mjs'
    );

    const result = await probeKarankReadiness();

    assert(
      result.textExtractProbe,
      'يجب أن توجد معلومات textExtractProbe في النتيجة'
    );
    assert.strictEqual(
      result.textExtractProbe.ok,
      true,
      'يجب أن يكون مسبار استخراج النصوص ناجحاً (ok === true)'
    );
  });

  // البوابة 5: التحقق من مسبار خط الاستيراد
  it('importPipelineProbe.ok is true', async () => {
    const { probeKarankReadiness } = await import(
      '../services/karank-readiness.mjs'
    );

    const result = await probeKarankReadiness();

    assert(
      result.importPipelineProbe,
      'يجب أن توجد معلومات importPipelineProbe في النتيجة'
    );
    assert.strictEqual(
      result.importPipelineProbe.ok,
      true,
      'يجب أن يكون مسبار خط الاستيراد ناجحاً (ok === true)'
    );
  });
});

// ==================== بوابات Antiword (عند الحاجة إلى مسار DOC) ====================

describe('Release Gates - بوابات Antiword', () => {
  it('antiword readiness probe is structured', async () => {
    // استيراد وحدة antiword-runtime
    const {
      DEFAULT_ANTIWORD_PATH,
      DEFAULT_ANTIWORD_HOME,
      resolveAntiwordRuntime,
    } = await import('../services/antiword-runtime.mjs');

    // التحقق من أن الدالة ترجع كائناً منظماً
    const result = resolveAntiwordRuntime();

    assert(result, 'يجب أن ترجع resolveAntiwordRuntime() قيمة');
    assert.strictEqual(
      typeof result.antiwordPath,
      'string',
      'antiwordPath يجب أن يكون نصاً'
    );
    assert.strictEqual(
      typeof result.antiwordHome,
      'string',
      'antiwordHome يجب أن يكون نصاً'
    );
    assert.strictEqual(
      typeof result.runtimeSource,
      'string',
      'runtimeSource يجب أن يكون نصاً'
    );
  });
});

// ==================== بوابات الإثبات التشغيلي ====================

describe('Release Gates - بوابات الإثبات التشغيلي', () => {
  it('operational probe runs and pipeline executes', async () => {
    const { probeOperationalReadiness } = await import(
      '../services/suspicion-review-probe.mjs'
    );

    const result = await probeOperationalReadiness();

    assert(result, 'يجب أن يُرجع المسبار العملياتي نتيجة');
    assert.strictEqual(
      result.karankPipelineRan,
      true,
      'يجب أن يكون خط أنابيب الكرنك قد عمل فعلاً (karankPipelineRan === true)'
    );
  });

  it('suspicion cases count > 0', async () => {
    const { probeOperationalReadiness } = await import(
      '../services/suspicion-review-probe.mjs'
    );

    const result = await probeOperationalReadiness();

    assert(
      typeof result.suspicionCasesCount === 'number',
      'يجب أن يكون عدد حالات الشك رقماً'
    );
    assert(
      result.suspicionCasesCount > 0,
      `يجب أن يكون عدد حالات الشك أكبر من صفر (الفعلي: ${result.suspicionCasesCount})`
    );
  });

  it('final review candidates count > 0', async () => {
    const { probeOperationalReadiness } = await import(
      '../services/suspicion-review-probe.mjs'
    );

    const result = await probeOperationalReadiness();

    assert(
      typeof result.finalReviewCandidatesCount === 'number',
      'يجب أن يكون عدد مرشحي المراجعة النهائية رقماً'
    );
    assert(
      result.finalReviewCandidatesCount > 0,
      `يجب أن يكون عدد مرشحي المراجعة النهائية أكبر من صفر (الفعلي: ${result.finalReviewCandidatesCount})`
    );
  });

  it('suspicion model enabled by default', async () => {
    const envValue = process.env.SUSPICION_MODEL_ENABLED;
    const isEnabled = envValue !== 'false';

    assert.strictEqual(
      isEnabled,
      true,
      'يجب أن يكون نموذج الشك مُفعّلاً بشكل افتراضي (SUSPICION_MODEL_ENABLED !== "false")'
    );
  });

  it('final review enabled by default', async () => {
    const envValue = process.env.FINAL_REVIEW_ENABLED;
    const isEnabled = envValue !== 'false';

    assert.strictEqual(
      isEnabled,
      true,
      'يجب أن تكون المراجعة النهائية مُفعّلة بشكل افتراضي (FINAL_REVIEW_ENABLED !== "false")'
    );
  });

  it('operational probe is settled or has valid failure reason', async () => {
    const { probeOperationalReadiness } = await import(
      '../services/suspicion-review-probe.mjs'
    );

    const result = await probeOperationalReadiness();

    // إذا لم يتسوَّ، يجب أن يكون هناك سبب فشل واضح
    if (!result.settled) {
      assert(
        result.failureStage,
        'إذا لم يتسوَّ المسبار، يجب أن يوجد failureStage'
      );
      assert(
        result.failureCode,
        'إذا لم يتسوَّ المسبار، يجب أن يوجد failureCode'
      );
    }

    // الكرنك يجب أن يعمل دائماً بغض النظر عن التسوية
    assert.strictEqual(
      result.karankPipelineRan,
      true,
      'يجب أن يعمل خط أنابيب الكرنك حتى لو لم تتسوَّ الطبقات الأخرى'
    );
  });
});

// ==================== بوابات التركيبة المرجعية ====================

describe('Release Gates - بوابات التركيبة المرجعية', () => {
  it('reference fixture loads', async () => {
    // استيراد التركيبة المرجعية
    const { REFERENCE_SUSPICION_FIXTURE } = await import(
      '../fixtures/reference-suspicion-fixture.mjs'
    );

    // التحقق من أن التركيبة موجودة وليست فارغة
    assert(
      REFERENCE_SUSPICION_FIXTURE,
      'يجب أن تتحمل التركيبة المرجعية'
    );
    assert.strictEqual(
      typeof REFERENCE_SUSPICION_FIXTURE,
      'string',
      'يجب أن تكون التركيبة نصاً'
    );
    assert(
      REFERENCE_SUSPICION_FIXTURE.length > 0,
      'يجب أن تكون التركيبة غير فارغة'
    );
  });

  it('fixture metadata has expected suspicion cases > 0', async () => {
    // استيراد بيانات التركيبة الوصفية
    const { FIXTURE_METADATA } = await import(
      '../fixtures/reference-suspicion-fixture.mjs'
    );

    // التحقق من وجود البيانات الوصفية
    assert(FIXTURE_METADATA, 'يجب أن توجد بيانات وصفية للتركيبة');
    assert(FIXTURE_METADATA.intendedSuspicionCases, 'يجب أن توجد حالات شك متعمدة');
    assert(
      Array.isArray(FIXTURE_METADATA.intendedSuspicionCases),
      'حالات الشك يجب أن تكون مصفوفة'
    );
    assert(
      FIXTURE_METADATA.intendedSuspicionCases.length > 0,
      'يجب أن تكون هناك حالة شك واحدة على الأقل في البيانات الوصفية'
    );
  });

  it('operational probe suspicion count matches fixture expectations', async () => {
    const { probeOperationalReadiness, EXPECTED_SUSPICION_CASES } = await import(
      '../services/suspicion-review-probe.mjs'
    );

    const result = await probeOperationalReadiness();

    assert(
      result.suspicionCasesCount >= EXPECTED_SUSPICION_CASES.minimum,
      `عدد حالات الشك (${result.suspicionCasesCount}) يجب أن يكون >= الحد الأدنى المتوقع (${EXPECTED_SUSPICION_CASES.minimum})`
    );
  });
});

// ==================== بوابات ملكية الاستيراد ====================

describe('Release Gates - بوابات ملكية الاستيراد (directors-studio)', () => {
  it('directors-studio has no file input', async () => {
    // قراءة ملف ScriptUploadZone
    const filePath = resolve(
      REPO_ROOT,
      'apps/web/src/app/(main)/directors-studio/components/ScriptUploadZone.tsx'
    );

    let content = '';
    try {
      content = await readFile(filePath, 'utf-8');
    } catch (error) {
      assert.fail(
        `فشل قراءة ملف ScriptUploadZone: ${error.message}`
      );
    }

    // التحقق من عدم وجود input مع type="file"
    const hasFileInput = content.includes('type="file"');
    assert.strictEqual(
      hasFileInput,
      false,
      'يجب ألا يحتوي ScriptUploadZone على <input type="file"> (الاستيراد معطّل في directors-studio)'
    );

    // التحقق من عدم وجود سمة accept للملفات
    const hasAcceptAttribute = content.includes('accept=');
    assert.strictEqual(
      hasAcceptAttribute,
      false,
      'يجب ألا يحتوي ScriptUploadZone على سمة accept= (الاستيراد معطّل)'
    );
  });

  it('directors-studio fileExtractor is disabled', async () => {
    // قراءة ملف fileExtractor
    const filePath = resolve(
      REPO_ROOT,
      'apps/web/src/app/(main)/directors-studio/helpers/fileExtractor.ts'
    );

    let content = '';
    try {
      content = await readFile(filePath, 'utf-8');
    } catch (error) {
      assert.fail(
        `فشل قراءة ملف fileExtractor: ${error.message}`
      );
    }

    // التحقق من أن الاستيراد معطّل
    // يجب أن تحتوي على رسالة تعطيل واضحة
    const hasDisabledMessage = content.includes('معطّ');
    assert.strictEqual(
      hasDisabledMessage,
      true,
      'يجب أن يحتوي fileExtractor على إشارة واضحة إلى التعطيل'
    );

    // التحقق من عدم وجود استيراد mammoth
    const hasMammothImport = content.includes('mammoth');
    assert.strictEqual(
      hasMammothImport,
      false,
      'يجب ألا يحتوي fileExtractor على استيراد mammoth'
    );

    // التحقق من عدم وجود استيراد pdfjs-dist
    const hasPdfjsImport = content.includes('pdfjs-dist');
    assert.strictEqual(
      hasPdfjsImport,
      false,
      'يجب ألا يحتوي fileExtractor على استيراد pdfjs-dist'
    );
  });
});
