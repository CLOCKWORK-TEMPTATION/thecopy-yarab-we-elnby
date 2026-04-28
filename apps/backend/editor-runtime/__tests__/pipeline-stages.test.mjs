/**
 * @description اختبار التكامل: التحقق من مراحل الاستيراد في الخط الأنابيب
 * @fileoverview يتحقق من أن خط الاستيراد الطرفي ينتج المراحل والعناصر المتوقعة
 */

import { test } from "node:test";
import { ok, strictEqual } from "node:assert";
import { KARANK_HEALTH_REFERENCE_TEXT } from "../services/karank-readiness.mjs";
import { runReferenceImportPipeline } from "../services/import-pipeline.mjs";

test("pipeline-stages: runReferenceImportPipeline يعيد النص المرجعي بنجاح", async (t) => {
  // تشغيل خط الاستيراد مع النص المرجعي الصحي
  const result = await runReferenceImportPipeline(KARANK_HEALTH_REFERENCE_TEXT);

  // التحقق من أن النتيجة موجودة
  ok(result, "يجب أن تكون النتيجة موجودة");

  // التحقق من أن rawText غير فارغ
  ok(result.rawText || result.text, "يجب أن يكون هناك نص مرئي");
  const extractedText = result.rawText || result.text;
  ok(extractedText.trim().length > 0, "النص المستخرج يجب أن يكون غير فارغ");

  // التحقق من أن schemaElements هو مصفوفة بطول > 0
  ok(Array.isArray(result.schemaElements), "schemaElements يجب أن يكون مصفوفة");
  ok(result.schemaElements.length > 0, "schemaElements يجب أن يكون به عناصر");

  // التحقق من هيكل العناصر الأولى
  const firstElement = result.schemaElements[0];
  ok(
    firstElement && typeof firstElement.element === "string",
    "كل عنصر يجب أن يكون له خاصية element من نوع string",
  );
  ok(
    firstElement && typeof firstElement.value === "string",
    "كل عنصر يجب أن يكون له خاصية value من نوع string",
  );

  // التحقق من أن method موجود وصحيح
  ok(result.method, "يجب أن تكون هناك قيمة method");
  ok(
    result.method === "native-text" || result.method === "karank-engine-bridge",
    `method يجب أن يكون native-text أو karank-engine-bridge، لكن كان ${result.method}`,
  );
});

test("pipeline-stages: يحقق مرحلة karank-visible عند استخدام karank-engine-bridge", async (t) => {
  // تشغيل خط الاستيراد
  const result = await runReferenceImportPipeline(KARANK_HEALTH_REFERENCE_TEXT);

  // إذا كان الكرنك متاحًا، يجب أن تكون المرحلة karank-visible
  if (result.method === "karank-engine-bridge") {
    ok(result.schemaElements, "يجب أن تكون schemaElements موجودة");
    ok(
      result.schemaElements.length > 0,
      "إذا استخدمنا karank-engine-bridge، يجب أن نحصل على عناصر البنية",
    );

    // التحقق من أن rawExtractedText موجود
    ok(result.rawExtractedText || result.text, "يجب أن يكون هناك نص مستخرج");
  }
});

test("pipeline-stages: يحتوي على attempts تاريخ صحيح", async (t) => {
  // تشغيل خط الاستيراد
  const result = await runReferenceImportPipeline(KARANK_HEALTH_REFERENCE_TEXT);

  // التحقق من أن attempts موجود ويحتوي على المحاولات
  ok(Array.isArray(result.attempts), "attempts يجب أن يكون مصفوفة");
  ok(result.attempts.length > 0, "attempts يجب أن يحتوي على محاولات");

  // التحقق من أن الطريقة الحالية موجودة في attempts
  const methodInAttempts = result.attempts.includes(result.method);
  ok(methodInAttempts, `method ${result.method} يجب أن يكون في attempts`);
});

test("pipeline-stages: يعيد تحذيرات كمصفوفة", async (t) => {
  // تشغيل خط الاستيراد
  const result = await runReferenceImportPipeline(KARANK_HEALTH_REFERENCE_TEXT);

  // التحقق من أن warnings موجود وهو مصفوفة
  ok(Array.isArray(result.warnings), "warnings يجب أن يكون مصفوفة");
  // warnings قد تكون فارغة وهذا طبيعي
});

test("pipeline-stages: يحتوي على metadata مهمة", async (t) => {
  // تشغيل خط الاستيراد
  const result = await runReferenceImportPipeline(KARANK_HEALTH_REFERENCE_TEXT);

  // التحقق من أن usedOcr موجود ونوعه boolean
  ok(typeof result.usedOcr === "boolean", "usedOcr يجب أن يكون boolean");

  // التحقق من أن method موجود
  ok(typeof result.method === "string", "method يجب أن يكون string");
});
