/**
 * @description اختبار التكامل: فحص جاهزية antiword
 * @fileoverview يتحقق من أن مسبار antiword يعيد نتيجة منظمة مع أسباب صريحة عند الفشل
 */

import { test } from "node:test";
import { ok, strictEqual } from "node:assert";
import {
  probeAntiwordReadiness,
  probeAntiwordReadinessSync,
} from "../services/antiword-readiness-probe.mjs";

test("antiword-readiness: probeAntiwordReadinessSync يعيد كائن منظم", async (t) => {
  // تشغيل الفحص المتزامن
  const result = probeAntiwordReadinessSync();

  // التحقق من أن النتيجة موجودة وأنها كائن
  ok(result, "يجب أن تكون النتيجة موجودة");
  ok(typeof result === "object", "يجب أن تكون النتيجة كائنًا");

  // التحقق من الخصائص الأساسية
  ok(
    typeof result.docIntakeReady === "boolean",
    "docIntakeReady يجب أن يكون boolean",
  );
  ok(
    typeof result.antiwordReady === "boolean",
    "antiwordReady يجب أن يكون boolean",
  );
  ok(
    typeof result.antiwordBinaryAvailable === "boolean",
    "antiwordBinaryAvailable يجب أن يكون boolean",
  );
  ok(
    typeof result.antiwordHomeExists === "boolean",
    "antiwordHomeExists يجب أن يكون boolean",
  );

  // التحقق من المسارات
  ok(
    result.antiwordPath === null || typeof result.antiwordPath === "string",
    "antiwordPath يجب أن يكون null أو string",
  );
  ok(
    result.antiwordHome === null || typeof result.antiwordHome === "string",
    "antiwordHome يجب أن يكون null أو string",
  );

  // التحقق من التحذيرات
  ok(
    Array.isArray(result.antiwordWarnings),
    "antiwordWarnings يجب أن يكون مصفوفة",
  );

  // التحقق من السبب
  ok(
    result.reason === null || typeof result.reason === "string",
    "reason يجب أن يكون null أو string",
  );
});

test("antiword-readiness: docIntakeReady و antiwordReady متسقان", async (t) => {
  // تشغيل الفحص المتزامن
  const result = probeAntiwordReadinessSync();

  // docIntakeReady و antiwordReady يجب أن يكونا بنفس القيمة
  strictEqual(
    result.docIntakeReady,
    result.antiwordReady,
    "docIntakeReady و antiwordReady يجب أن يكونا متطابقين",
  );
});

test("antiword-readiness: عند الفشل، يكون reason صريحًا", async (t) => {
  // تشغيل الفحص المتزامن
  const result = probeAntiwordReadinessSync();

  // إذا لم يكن antiword جاهزًا، يجب أن يكون هناك سبب صريح
  if (!result.antiwordReady) {
    ok(result.reason, "إذا كان antiword غير جاهز، يجب أن يكون reason موجود");
    ok(
      typeof result.reason === "string",
      "السبب يجب أن يكون string وليس فارغًا",
    );
    ok(result.reason.length > 0, "السبب يجب أن لا يكون فارغًا");

    // السبب يجب أن يصف المشكلة بوضوح
    ok(
      result.reason.includes("antiword") ||
        result.reason.includes("ANTIWORDHOME"),
      "السبب يجب أن يشير إلى المشكلة (antiword أو ANTIWORDHOME)",
    );
  }
});

test("antiword-readiness: عند النجاح، reason يجب أن يكون null", async (t) => {
  // تشغيل الفحص المتزامن
  const result = probeAntiwordReadinessSync();

  // إذا كان antiword جاهزًا، يجب أن يكون reason مساويًا null
  if (result.antiwordReady) {
    strictEqual(result.reason, null, "عند النجاح، reason يجب أن يكون null");
  }
});

test("antiword-readiness: المسارات متسقة مع الحالة", async (t) => {
  // تشغيل الفحص المتزامن
  const result = probeAntiwordReadinessSync();

  // إذا كان antiwordBinaryAvailable، يجب أن يكون antiwordPath غير null
  if (result.antiwordBinaryAvailable) {
    ok(
      result.antiwordPath !== null,
      "antiwordPath يجب أن يكون موجود عند توفر antiword",
    );
    ok(
      typeof result.antiwordPath === "string",
      "antiwordPath يجب أن يكون string عند توفر antiword",
    );
  } else {
    strictEqual(
      result.antiwordPath,
      null,
      "antiwordPath يجب أن يكون null عند عدم توفر antiword",
    );
  }

  // إذا كانت antiwordHomeExists، يجب أن يكون antiwordHome غير null
  if (result.antiwordHomeExists) {
    ok(
      result.antiwordHome !== null,
      "antiwordHome يجب أن يكون موجود عند وجود ANTIWORDHOME",
    );
    ok(
      typeof result.antiwordHome === "string",
      "antiwordHome يجب أن يكون string عند وجود ANTIWORDHOME",
    );
  } else {
    // لاحظ أن antiwordHome قد يكون موجود حتى لو لم تكن المجلدات موجودة
    // لأن لدينا قيمة افتراضية
  }
});

test("antiword-readiness: التحذيرات تعكس الحالة", async (t) => {
  // تشغيل الفحص المتزامن
  const result = probeAntiwordReadinessSync();

  // عند عدم توفر antiword، يجب أن يكون هناك تحذير
  if (!result.antiwordBinaryAvailable) {
    ok(
      result.antiwordWarnings.length > 0,
      "عند عدم توفر antiword، يجب أن يكون هناك تحذيرات",
    );
  }

  // عند عدم وجود ANTIWORDHOME، يجب أن يكون هناك تحذير
  if (!result.antiwordHomeExists && result.antiwordBinaryAvailable) {
    ok(
      result.antiwordWarnings.length > 0,
      "عند عدم وجود ANTIWORDHOME، يجب أن يكون هناك تحذيرات",
    );
  }

  // كل التحذيرات يجب أن تكون strings
  for (const warning of result.antiwordWarnings) {
    ok(typeof warning === "string", "كل التحذيرات يجب أن تكون strings");
    ok(warning.length > 0, "التحذيرات يجب أن لا تكون فارغة");
  }
});

test("antiword-readiness: probeAntiwordReadiness متزامن يعمل", async (t) => {
  // تشغيل الفحص المتزامن
  const result = await probeAntiwordReadiness();

  // التحقق من أن النتيجة موجودة وأنها كائن
  ok(result, "يجب أن تكون النتيجة موجودة");
  ok(typeof result === "object", "يجب أن تكون النتيجة كائنًا");

  // التحقق من الخصائص الأساسية
  ok(
    typeof result.docIntakeReady === "boolean",
    "docIntakeReady يجب أن يكون boolean",
  );
  ok(
    typeof result.antiwordReady === "boolean",
    "antiwordReady يجب أن يكون boolean",
  );

  // docIntakeReady و antiwordReady يجب أن يكونا متطابقين
  strictEqual(
    result.docIntakeReady,
    result.antiwordReady,
    "docIntakeReady و antiwordReady يجب أن يكونا متطابقين",
  );
});

test("antiword-readiness: حالات التناسق الكامل", async (t) => {
  // تشغيل الفحص المتزامن
  const result = probeAntiwordReadinessSync();

  // الحالة 1: كل شيء جاهز
  if (result.antiwordBinaryAvailable && result.antiwordHomeExists) {
    strictEqual(
      result.antiwordReady,
      true,
      "عند توفر كل شيء، antiwordReady يجب أن يكون true",
    );
    strictEqual(
      result.docIntakeReady,
      true,
      "عند توفر كل شيء، docIntakeReady يجب أن يكون true",
    );
    strictEqual(
      result.reason,
      null,
      "عند توفر كل شيء، reason يجب أن يكون null",
    );
  }

  // الحالة 2: antiword غير متاح
  if (!result.antiwordBinaryAvailable) {
    strictEqual(
      result.antiwordReady,
      false,
      "عند عدم توفر antiword، antiwordReady يجب أن يكون false",
    );
    strictEqual(
      result.docIntakeReady,
      false,
      "عند عدم توفر antiword، docIntakeReady يجب أن يكون false",
    );
    ok(result.reason, "عند عدم توفر antiword، يجب أن يكون reason موجود");
  }

  // الحالة 3: ANTIWORDHOME غير موجود
  if (result.antiwordBinaryAvailable && !result.antiwordHomeExists) {
    strictEqual(
      result.antiwordReady,
      false,
      "عند عدم وجود ANTIWORDHOME، antiwordReady يجب أن يكون false",
    );
    strictEqual(
      result.docIntakeReady,
      false,
      "عند عدم وجود ANTIWORDHOME، docIntakeReady يجب أن يكون false",
    );
    ok(result.reason, "عند عدم وجود ANTIWORDHOME، يجب أن يكون reason موجود");
  }
});
