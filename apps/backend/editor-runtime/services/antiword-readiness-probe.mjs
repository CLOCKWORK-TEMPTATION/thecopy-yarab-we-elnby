/**
 * @description مسبار جاهزية antiword: التحقق من توفر antiword والمتطلبات الأساسية
 * @fileoverview يفحص توفر ملف antiword الثنائي و ANTIWORDHOME والإعدادات المطلوبة
 */

import process from "node:process";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { resolveAntiwordRuntime } from "./antiword-runtime.mjs";

/**
 * فحص جاهزية antiword للعمل مع ملفات DOC
 * @returns {Promise<{
 *   docIntakeReady: boolean,
 *   antiwordReady: boolean,
 *   antiwordBinaryAvailable: boolean,
 *   antiwordHomeExists: boolean,
 *   antiwordPath: string | null,
 *   antiwordHome: string | null,
 *   antiwordWarnings: string[],
 *   reason: string | null
 * }>}
 */
export const probeAntiwordReadiness = async () => {
  // الحصول على إعدادات antiword
  const runtime = resolveAntiwordRuntime();
  const warnings = [];

  // التحقق من توفر الملف الثنائي
  let antiwordBinaryAvailable = false;
  try {
    // محاولة تشغيل antiword مع خيار -h (المساعدة)
    execFileSync(runtime.antiwordPath, ["-h"], {
      stdio: "pipe",
      timeout: 5000,
      windowsHide: true,
      env: {
        ...process.env,
        HOME: runtime.antiwordHome,
        ANTIWORDHOME: runtime.antiwordHome,
      },
    });
    antiwordBinaryAvailable = true;
  } catch (error) {
    // فحص نوع الخطأ
    const code = typeof error?.code === "string" ? error.code : "";

    if (code === "ENOENT") {
      // الملف الثنائي غير موجود على المسار
      warnings.push(
        `antiword binary غير موجود على المسار: ${runtime.antiwordPath}`
      );
    } else if (code === "EACCES") {
      // الملف موجود لكنه غير قابل للتنفيذ
      warnings.push(
        `antiword binary موجود لكنه غير قابل للتنفيذ: ${runtime.antiwordPath}`
      );
    } else {
      // خطأ آخر - قد يكون antiword موجود لكن يرجع exit code غير صفري
      // في هذه الحالة نعتبره متاحًا
      if (!error.message?.includes("ENOENT") && !error.message?.includes("EACCES")) {
        antiwordBinaryAvailable = true;
      } else {
        warnings.push(
          `فشل التحقق من antiword: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // التحقق من وجود ANTIWORDHOME
  const antiwordHomeExists = existsSync(runtime.antiwordHome);
  if (!antiwordHomeExists && antiwordBinaryAvailable) {
    warnings.push(
      `ANTIWORDHOME غير موجود أو غير صحيح: ${runtime.antiwordHome}`
    );
  }

  // تحديد السبب إذا كان antiword غير جاهز
  let reason = null;
  if (!antiwordBinaryAvailable) {
    reason = `antiword binary غير متاح على المسار ${runtime.antiwordPath}`;
  } else if (!antiwordHomeExists) {
    reason = `ANTIWORDHOME غير موجود: ${runtime.antiwordHome}`;
  }

  // تحديد ما إذا كان DOC intake جاهز
  const antiwordReady = antiwordBinaryAvailable && antiwordHomeExists;
  const docIntakeReady = antiwordReady;

  return {
    // الحالة الإجمالية
    docIntakeReady,
    antiwordReady,

    // تفاصيل التوفرية
    antiwordBinaryAvailable,
    antiwordHomeExists,

    // المسارات المستخدمة
    antiwordPath: antiwordBinaryAvailable ? runtime.antiwordPath : null,
    antiwordHome: antiwordHomeExists ? runtime.antiwordHome : null,

    // التحذيرات والأسباب
    antiwordWarnings: warnings,
    reason, // السبب الصريح إذا كان غير جاهز
  };
};

/**
 * فحص جاهزية antiword بشكل متزامن (للتوافقية)
 * @returns {{
 *   docIntakeReady: boolean,
 *   antiwordReady: boolean,
 *   antiwordBinaryAvailable: boolean,
 *   antiwordHomeExists: boolean,
 *   antiwordPath: string | null,
 *   antiwordHome: string | null,
 *   antiwordWarnings: string[],
 *   reason: string | null
 * }}
 */
export const probeAntiwordReadinessSync = () => {
  // الحصول على إعدادات antiword
  const runtime = resolveAntiwordRuntime();
  const warnings = [];

  // التحقق من توفر الملف الثنائي
  let antiwordBinaryAvailable = false;
  try {
    // محاولة تشغيل antiword مع خيار -h (المساعدة) بشكل متزامن
    execFileSync(runtime.antiwordPath, ["-h"], {
      stdio: "pipe",
      timeout: 5000,
      windowsHide: true,
      env: {
        ...process.env,
        HOME: runtime.antiwordHome,
        ANTIWORDHOME: runtime.antiwordHome,
      },
    });
    antiwordBinaryAvailable = true;
  } catch (error) {
    // فحص نوع الخطأ
    const code = typeof error?.code === "string" ? error.code : "";

    if (code === "ENOENT") {
      // الملف الثنائي غير موجود على المسار
      warnings.push(
        `antiword binary غير موجود على المسار: ${runtime.antiwordPath}`
      );
    } else if (code === "EACCES") {
      // الملف موجود لكنه غير قابل للتنفيذ
      warnings.push(
        `antiword binary موجود لكنه غير قابل للتنفيذ: ${runtime.antiwordPath}`
      );
    } else {
      // خطأ آخر - قد يكون antiword موجود لكن يرجع exit code غير صفري
      if (!error.message?.includes("ENOENT") && !error.message?.includes("EACCES")) {
        antiwordBinaryAvailable = true;
      } else {
        warnings.push(
          `فشل التحقق من antiword: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    }
  }

  // التحقق من وجود ANTIWORDHOME
  const antiwordHomeExists = existsSync(runtime.antiwordHome);
  if (!antiwordHomeExists && antiwordBinaryAvailable) {
    warnings.push(
      `ANTIWORDHOME غير موجود أو غير صحيح: ${runtime.antiwordHome}`
    );
  }

  // تحديد السبب إذا كان antiword غير جاهز
  let reason = null;
  if (!antiwordBinaryAvailable) {
    reason = `antiword binary غير متاح على المسار ${runtime.antiwordPath}`;
  } else if (!antiwordHomeExists) {
    reason = `ANTIWORDHOME غير موجود: ${runtime.antiwordHome}`;
  }

  // تحديد ما إذا كان DOC intake جاهز
  const antiwordReady = antiwordBinaryAvailable && antiwordHomeExists;
  const docIntakeReady = antiwordReady;

  return {
    // الحالة الإجمالية
    docIntakeReady,
    antiwordReady,

    // تفاصيل التوفرية
    antiwordBinaryAvailable,
    antiwordHomeExists,

    // المسارات المستخدمة
    antiwordPath: antiwordBinaryAvailable ? runtime.antiwordPath : null,
    antiwordHome: antiwordHomeExists ? runtime.antiwordHome : null,

    // التحذيرات والأسباب
    antiwordWarnings: warnings,
    reason, // السبب الصريح إذا كان غير جاهز
  };
};
