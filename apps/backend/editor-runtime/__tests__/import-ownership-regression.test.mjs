/**
 * @description اختبارات عدم الانحدار لملكية الاستيراد
 *
 * هذه الاختبارات تمنع عودة ملكية الاستيراد إلى directors-studio.
 * تضمن أن المحرر /editor هو المالك الوحيد لاستيراد الملفات.
 *
 * الحالات المراقبة:
 * 1. عدم وجود عناصر file input في ScriptUploadZone
 * 2. عدم وجود أزرار رفع ملفات
 * 3. عدم وجود استيرادات mammoth أو pdfjs-dist
 * 4. التحقق من رسالة التعطيل في ScriptUploadZone
 * 5. عدم استيراد NoProjectSection للـ ScriptUploadZone
 */

import { describe, it } from "node:test";
import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// حساب المسار إلى جذر المستودع
const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "../../../..");

// ==================== اختبارات عدم الانحدار ====================

describe("Non-regression Tests - ملكية الاستيراد", () => {
  // الاختبار 1: عدم وجود file input في ScriptUploadZone
  it("no file input in directors-studio ScriptUploadZone", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/components/ScriptUploadZone.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة ScriptUploadZone.tsx: ${error.message}`);
    }

    // كشف عناصر input من نوع file
    const hasFileInput = /<input[^>]*type\s*=\s*["']file["'][^>]*>/i.test(
      content,
    );

    assert.strictEqual(
      hasFileInput,
      false,
      'يجب ألا يحتوي ScriptUploadZone على <input type="file"> (الاستيراد معطّل)',
    );
  });

  // الاختبار 2: عدم وجود زر رفع ملفات (accept attribute)
  it("no upload button in directors-studio", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/components/ScriptUploadZone.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة ScriptUploadZone.tsx: ${error.message}`);
    }

    // كشف سمة accept
    const hasAcceptAttribute = /accept\s*=\s*["'][^"']*["']/i.test(content);

    assert.strictEqual(
      hasAcceptAttribute,
      false,
      "يجب ألا يحتوي ScriptUploadZone على accept= attribute",
    );
  });

  // الاختبار 3: عدم وجود استيراد mammoth
  it("no mammoth import in directors-studio", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/helpers/fileExtractor.ts",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة fileExtractor.ts: ${error.message}`);
    }

    // كشف استيراد mammoth
    const hasMammothImport =
      /import\s+.*from\s+['"]mammoth['"]/.test(content) ||
      /require\s*\(\s*['"]mammoth['"]\s*\)/.test(content);

    assert.strictEqual(
      hasMammothImport,
      false,
      "يجب ألا يحتوي fileExtractor على استيراد mammoth",
    );
  });

  // الاختبار 4: عدم وجود استيراد pdfjs-dist
  it("no pdfjs-dist import in directors-studio", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/helpers/fileExtractor.ts",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة fileExtractor.ts: ${error.message}`);
    }

    // كشف استيراد pdfjs-dist
    const hasPdfjsImport =
      /import\s+.*from\s+['"]pdfjs-dist['"]/.test(content) ||
      /require\s*\(\s*['"]pdfjs-dist['"]\s*\)/.test(content);

    assert.strictEqual(
      hasPdfjsImport,
      false,
      "يجب ألا يحتوي fileExtractor على استيراد pdfjs-dist",
    );
  });

  // الاختبار 5: عدم وجود تنفيذ فعلي لـ extractTextFromFile
  it("no extractTextFromFile actual implementation", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/helpers/fileExtractor.ts",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة fileExtractor.ts: ${error.message}`);
    }

    // التحقق من أن الدالة ترمي خطأ بدلاً من التنفيذ الفعلي
    const hasThrowError = /throw\s+new\s+FileExtractionError/.test(content);
    const hasDisabledCheck =
      /EXTRACTION_DISABLED|معطّ|disabled|deactivated/i.test(content);

    assert.strictEqual(
      hasThrowError || hasDisabledCheck,
      true,
      "يجب أن تحتوي extractTextFromFile على throw أو تعطيل واضح",
    );
  });

  // الاختبار 6: ScriptUploadZone يعرض رسالة تعطيل عربية
  it("ScriptUploadZone shows deactivation message", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/components/ScriptUploadZone.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة ScriptUploadZone.tsx: ${error.message}`);
    }

    // التحقق من وجود رسالة تعطيل عربية
    // يجب أن تحتوي على كلمات مثل "معطّل" أو "الاستيراد" أو "مُعطَّل"
    const hasArabicDeactivationMessage =
      /الاستيراد.*معطّ|معطّ.*الاستيراد/i.test(content);

    assert.strictEqual(
      hasArabicDeactivationMessage,
      true,
      "يجب أن يعرض ScriptUploadZone رسالة تعطيل عربية واضحة",
    );
  });

  // الاختبار 7: NoProjectSection لا يستورد ScriptUploadZone
  it("NoProjectSection does not import ScriptUploadZone", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/components/NoProjectSection.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة NoProjectSection.tsx: ${error.message}`);
    }

    // التحقق من عدم استيراد ScriptUploadZone
    const hasScriptUploadZoneImport =
      /import\s+.*ScriptUploadZone.*from/.test(content) ||
      /from\s+['"][^"']*ScriptUploadZone['"]/i.test(content);

    assert.strictEqual(
      hasScriptUploadZoneImport,
      false,
      "يجب ألا تستورد NoProjectSection مكون ScriptUploadZone (لأنها معطّلة)",
    );
  });
});

// ==================== اختبارات إضافية للتحقق من الملكية ====================

describe("Ownership Verification - تحقق الملكية", () => {
  it("fileExtractor error message references /editor", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/helpers/fileExtractor.ts",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة fileExtractor.ts: ${error.message}`);
    }

    // التحقق من أن رسالة الخطأ تحتوي على إشارة إلى المحرر
    const referencesEditor = /\/editor|editor/.test(content);

    assert.strictEqual(
      referencesEditor,
      true,
      "يجب أن تحتوي رسائل الخطأ على إشارة واضحة إلى المحرر /editor كمالك للاستيراد",
    );
  });

  it("ScriptUploadZone redirect button points to /editor", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/components/ScriptUploadZone.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة ScriptUploadZone.tsx: ${error.message}`);
    }

    // التحقق من وجود زر إعادة توجيه إلى المحرر
    const redirectsToEditor =
      /'\/editor'|"\/editor"|router\.push\(['"]*\/editor/.test(content);

    assert.strictEqual(
      redirectsToEditor,
      true,
      "يجب أن تحتوي ScriptUploadZone على زر توجيه إلى /editor",
    );
  });
});

// ==================== اختبارات تعطيل صفحة تحرير السيناريو ====================

describe("Script Page Deactivation - تعطيل صفحة تحرير السيناريو", () => {
  it("no Textarea in directors-studio script page", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/script/page.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة script/page.tsx: ${error.message}`);
    }

    const hasTextarea = /Textarea|<textarea/i.test(content);
    assert.strictEqual(
      hasTextarea,
      false,
      "يجب ألا تحتوي صفحة السيناريو على Textarea (التحرير معطّل)",
    );
  });

  it("no Save button in directors-studio script page", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/script/page.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة script/page.tsx: ${error.message}`);
    }

    const hasSaveButton = /حفظ|save|onSave|handleSave/i.test(content);
    assert.strictEqual(
      hasSaveButton,
      false,
      "يجب ألا تحتوي صفحة السيناريو على زر حفظ (الحفظ معطّل)",
    );
  });

  it("no Download button in directors-studio script page", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/script/page.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة script/page.tsx: ${error.message}`);
    }

    const hasDownloadButton =
      /تحميل|تنزيل|download|onDownload|handleDownload/i.test(content);
    assert.strictEqual(
      hasDownloadButton,
      false,
      "يجب ألا تحتوي صفحة السيناريو على زر تحميل (التحميل معطّل)",
    );
  });

  it("no Analyze action in directors-studio script page", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/script/page.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة script/page.tsx: ${error.message}`);
    }

    const hasAnalyzeAction =
      /تحليل|analyze|cineai\/analyze|onAnalyze|handleAnalyze/i.test(content);
    assert.strictEqual(
      hasAnalyzeAction,
      false,
      "يجب ألا تحتوي صفحة السيناريو على وظيفة تحليل (التحليل معطّل)",
    );
  });

  it("no POST to /api/cineai/analyze from directors-studio script page", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/script/page.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة script/page.tsx: ${error.message}`);
    }

    const hasCineaiEndpoint =
      /api\/cineai|cineai\/analyze|fetch.*analyze/i.test(content);
    assert.strictEqual(
      hasCineaiEndpoint,
      false,
      "يجب ألا تحتوي صفحة السيناريو على استدعاء لـ /api/cineai/analyze",
    );
  });

  it("script page shows deactivation message", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/script/page.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة script/page.tsx: ${error.message}`);
    }

    const hasDeactivationMessage = /تحرير السيناريو معطّل|معطّل/i.test(content);
    assert.strictEqual(
      hasDeactivationMessage,
      true,
      "يجب أن تعرض صفحة السيناريو رسالة تعطيل واضحة",
    );
  });

  it("script page has redirect to /editor", async () => {
    const filePath = resolve(
      REPO_ROOT,
      "apps/web/src/app/(main)/directors-studio/script/page.tsx",
    );

    let content = "";
    try {
      content = await readFile(filePath, "utf-8");
    } catch (error) {
      assert.fail(`فشل قراءة script/page.tsx: ${error.message}`);
    }

    const hasEditorRedirect = /\/editor/.test(content);
    assert.strictEqual(
      hasEditorRedirect,
      true,
      "يجب أن تحتوي صفحة السيناريو على إعادة توجيه إلى /editor",
    );
  });
});
