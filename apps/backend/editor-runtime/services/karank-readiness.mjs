/**
 * @description فحص الجاهزية الحقيقية للكرنك ومسار الاستيراد الطرفي
 */

import { createHash } from "node:crypto";
import * as karankBridge from "../karank-bridge.mjs";
import { runReferenceImportPipeline } from "./import-pipeline.mjs";

// ── نص المرجع للفحص الحي لمحرك الكرنك ──
// يغطي نماذج element-grammar §1/§3/§5/§6/§7/§8/§9 الحاكمة لمحرك التصنيف
// بعد مواءمة جولة 085 (KG1–KG5) مع العقد المهاري الحالي
// (arabic-screenplay-classifier):
//   - §1 BASMALA: وحدانية البسملة وموقعها الأول فقط
//   - §3 SCENE_HEADER_1/2/3 بترتيب صارم مع كلمة زمن موسَّعة (ظهر/عصر/غروب)
//     داخل TIME_WORDS
//   - §5 ACTION: سرد حركي عادي
//   - §6 CHARACTER: نمطان — بسيط بقولون، ومع إرشاد أدائي مضمَّن (بهمس)
//   - §7 PARENTHETICAL: معزول بأقواس عربية كاملة （…） داخل سياق الحوار
//   - §8 DIALOGUE: سطر حوار يلي PARENTHETICAL تابع لنفس المتكلم
//   - §9 TRANSITION: الصيغة الموسَّعة "تلاشي إلى السواد" من
//     TRANSITION_WORDS المحدثة
export const KARANK_HEALTH_REFERENCE_TEXT = [
  "بسم الله الرحمن الرحيم",
  "مشهد1",
  "ظهر - داخلي",
  "شقة سيد نفيسة - الصالة",
  "تجلس سلمى وتنظر نحو الباب.",
  "سلمى :",
  "（بحزم）",
  "يجب أن نبدأ الآن.",
  "سلمى (بهمس) :",
  "لا تتأخر علينا.",
  "تلاشي إلى السواد",
].join("\n");

const toNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
};

const assessVisibleTextValidity = (rawText, sourceText) => {
  const normalizedRawText = toNonEmptyString(rawText);
  const normalizedSourceText = toNonEmptyString(sourceText);

  if (!normalizedRawText) {
    return "invalid-empty";
  }

  if (!normalizedSourceText) {
    return "valid";
  }

  const ratio =
    normalizedRawText.length / Math.max(normalizedSourceText.length, 1);

  if (ratio < 0.35) {
    return "invalid-degraded";
  }

  return "valid";
};

const summarizeSchemaElements = (schemaElements) => {
  if (!Array.isArray(schemaElements)) {
    return {
      ok: false,
      schemaElementCount: 0,
      firstElementType: null,
    };
  }

  const validElements = schemaElements.filter(
    (entry) =>
      entry &&
      typeof entry === "object" &&
      typeof entry.element === "string" &&
      typeof entry.value === "string" &&
      entry.element.trim() &&
      entry.value.trim()
  );

  return {
    ok: validElements.length > 0,
    schemaElementCount: validElements.length,
    firstElementType:
      validElements.length > 0 ? validElements[0].element : null,
  };
};

const evaluateProbeResult = (engineResult, sourceText) => {
  const rawText =
    engineResult?.rawText ||
    engineResult?.raw_text ||
    engineResult?.text ||
    engineResult?.rawExtractedText ||
    "";
  const schemaElements =
    engineResult?.schemaElements || engineResult?.schema_elements || [];
  const schemaSummary = summarizeSchemaElements(schemaElements);
  const visibleTextValidity = assessVisibleTextValidity(rawText, sourceText);

  return {
    ok: schemaSummary.ok && visibleTextValidity === "valid",
    rawTextLength: toNonEmptyString(rawText).length,
    schemaElementCount: schemaSummary.schemaElementCount,
    firstElementType: schemaSummary.firstElementType,
    visibleTextValidity,
  };
};

const formatError = (error) =>
  error instanceof Error ? error.message : String(error);

export const probeKarankReadiness = async () => {
  const checkedAt = new Date().toISOString();
  const minimumPythonVersion = karankBridge.getPythonMinimumVersion();
  const referenceTextFingerprint = createHash("sha1")
    .update(KARANK_HEALTH_REFERENCE_TEXT)
    .digest("hex");

  /** @type {any} */
  const python = {
    ok: false,
    minimumVersion: `${minimumPythonVersion.major}.${minimumPythonVersion.minor}+`,
  };

  try {
    Object.assign(python, { ok: true }, karankBridge.getPythonRuntimeInfo());
  } catch (error) {
    python.error = formatError(error);
  }

  const engineFiles = karankBridge.getEngineFilesInfo();
  const engine = {
    ok: engineFiles.exists,
    path: engineFiles.path,
    exists: engineFiles.exists,
    error: engineFiles.exists ? null : "ملفات محرك الكرنك غير موجودة.",
  };

  /** @type {any} */
  const ping = { ok: false };
  try {
    const pingResult = await karankBridge.ping();
    Object.assign(ping, {
      ok: true,
      status: pingResult?.status ?? "ok",
      bridge: pingResult?.bridge ?? null,
      version: pingResult?.version ?? null,
    });
  } catch (error) {
    ping.error = formatError(error);
  }

  /** @type {any} */
  const textExtractProbe = {
    ok: false,
    referenceTextFingerprint,
    referenceTextLength: KARANK_HEALTH_REFERENCE_TEXT.length,
  };
  try {
    const parseTextResult = await karankBridge.parseText(KARANK_HEALTH_REFERENCE_TEXT);
    Object.assign(
      textExtractProbe,
      evaluateProbeResult(parseTextResult, KARANK_HEALTH_REFERENCE_TEXT)
    );
  } catch (error) {
    textExtractProbe.error = formatError(error);
  }

  /** @type {any} */
  const importPipelineProbe = {
    ok: false,
    contractPath: "file-extract -> text-extract",
    referenceTextFingerprint,
  };
  try {
    const importResult = await runReferenceImportPipeline(
      KARANK_HEALTH_REFERENCE_TEXT
    );
    Object.assign(
      importPipelineProbe,
      evaluateProbeResult(importResult, KARANK_HEALTH_REFERENCE_TEXT),
      {
        method: importResult?.method ?? null,
        progressiveStage:
          importResult?.method === "karank-engine-bridge"
            ? "karank-visible"
            : "first-visible",
      }
    );
  } catch (error) {
    importPipelineProbe.error = formatError(error);
  }

  const ok =
    python.ok &&
    engine.ok &&
    ping.ok &&
    textExtractProbe.ok &&
    importPipelineProbe.ok;

  return {
    ok,
    checkedAt,
    bridgeState: karankBridge.getState(),
    minimumPythonVersion,
    python,
    engine,
    ping,
    textExtractProbe,
    importPipelineProbe,
  };
};
