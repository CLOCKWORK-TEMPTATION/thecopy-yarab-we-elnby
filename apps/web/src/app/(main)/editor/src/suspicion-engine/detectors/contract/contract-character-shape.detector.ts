import type { DetectorFn } from "@editor/suspicion-engine/detectors/detector-interface";
import type { GateBreakEvidence } from "@editor/suspicion-engine/types";
import { createSignal } from "@editor/suspicion-engine/helpers";

/**
 * @module contract/contract-character-shape.detector
 * @description
 * كاشف عقد شكل الشخصية — يُترجم البند الحاكم في عقد
 * `arabic-screenplay-classifier` إلى إشارة اشتباه فعّالة:
 *
 *   "أي اسم داخل سطر وصفي (مثل: «تخرج نهال سماحة…») يبقى ACTION،
 *    ولا يُستخرج منه CHARACTER."
 *
 * القواعد التي يرصدها هذا الكاشف على سطر مُصنَّف `character`:
 *
 *  1. بداية وظيفية مركّبة (وما، فلا، ولم، ولن، وهل، وإن، وإذا، ولو، ومع، وعلى…)
 *     — هذه أدوات سياقية لا يبدأ بها اسم شخصية مطلقًا، وهي السبب الجذري
 *     للعطب المرجعي الذي أصلحه ممر `character.ts` الأمامي.
 *
 *  2. بداية فعل حدثي صريح (يدخل، تخرج، يجلس، ينظر، يتجه، يمشي، يركض…)
 *     — أي جملة تبدأ بفعل حدثي هي وصف، لا اسم شخصية.
 *
 *  3. طول مفرط للسطر — اسم الشخصية نادراً ما يتجاوز 40 محرفًا أو 4 توكنات
 *     بعد تجريد النقطتين الختاميتين. أي سطر أطول من ذلك مصنَّف `character`
 *     هو في الغالب جملة وصفية خُدعت البوابة بنقطتيها الختاميتين.
 *
 *  4. علامات ترقيم وسط السطر (؟، !، .) قبل النقطتين الختاميتين
 *     — اسم الشخصية كتلة واحدة، لا يحوي نهاية جملة داخله.
 *
 * العقد الرسمي يشترط أن ينتج كل خرق إشارة `gate-break` تحمل قاعدة
 * مكسورة منطوقة، نمطًا متوقعًا، ونمطًا فعليًا — مع اقتراح نوع بديل هو
 * `action` في جميع الحالات (لأن الشكل يدل على أن السطر كان أصلًا وصفًا).
 */

// ── عتبات هيكلية ──
const CHARACTER_MAX_LENGTH = 40;
const CHARACTER_MAX_TOKENS = 4;

// ── البدايات الوظيفية المركّبة المحرّمة على اسم الشخصية ──
// مطابق لنظيرتها في `extensions/character.ts` لضمان ثبات العقد عبر الطبقتين.
const COMPOUND_FUNCTIONAL_START_RE =
  /^[وف](?:ما|لا|لم|لن|هل|إن|ان|أن|إذا|اذا|لو|من|في|فى|على|إلى|الى|عن|مع)\b/u;

// ── أفعال الحدث الافتتاحية الشائعة ──
// وجود أي منها في مقدمة السطر دليل على أنّ السطر وصفي لا اسم شخصية.
const ACTION_VERB_START_RE =
  /^(?:يدخل|تدخل|يخرج|تخرج|يجلس|تجلس|يقف|تقف|ينظر|تنظر|يتجه|تتجه|يمشي|تمشي|يركض|تركض|يفتح|تفتح|يُغلق|تُغلق|يغلق|تغلق|يرفع|ترفع|يضع|تضع|يأخذ|تأخذ|يمسك|تمسك|نسمع|نرى|نشاهد)\b/u;

// ── علامات نهاية جملة مسموح بها فقط في آخر الاسم لا وسطه ──
const MID_SENTENCE_PUNCT_RE = /[؟!.]/u;

const COLON_SUFFIX_RE = /[:：]\s*$/u;

/** يجرّد النقطتين الختاميتين (عربية أو لاتينية) لتحليل جسم الاسم. */
function stripTrailingColon(text: string): string {
  return text.replace(COLON_SUFFIX_RE, "").trimEnd();
}

/** يعدّ التوكنات بعد تطبيع المسافات. */
function countTokens(text: string): number {
  const normalized = text.trim();
  if (normalized.length === 0) return 0;
  return normalized.split(/\s+/u).length;
}

export const detectContractCharacterShape: DetectorFn = (
  trace,
  line,
  _context
) => {
  // الكاشف محصور حصريًا بالأسطر المصنفة `character`.
  if (line.type !== "character") return [];

  const body = stripTrailingColon(line.text).trim();
  if (body.length === 0) return [];

  const signals = [];
  const { lineIndex } = trace;

  // ── قاعدة 1: بداية وظيفية مركّبة ──
  if (COMPOUND_FUNCTIONAL_START_RE.test(body)) {
    const evidence: GateBreakEvidence = {
      signalType: "gate-break",
      brokenGateRule: "character-starts-with-compound-functional",
      expectedPattern: "اسم شخصية عربي لا يبدأ بأدوات سياقية مركّبة",
      actualPattern: `يبدأ ببادئة وظيفية مركّبة — "${body.slice(0, 10)}"`,
      gateType: "character",
    };

    signals.push(
      createSignal<GateBreakEvidence>({
        lineIndex,
        family: "gate-break",
        signalType: "gate-break",
        // درجة مرتفعة — هذه البادئات لا تظهر أبدًا في اسم شخصية حقيقي
        score: 0.9,
        reasonCode: "CONTRACT_CHARACTER_COMPOUND_FUNCTIONAL_START",
        message: `سطر شخصية يبدأ ببادئة وظيفية مركّبة — مرجّح أنه جزء من حوار: "${line.text}"`,
        suggestedType: "action",
        evidence,
        debug: {
          bodyPrefix: body.slice(0, 16),
          bodyLength: body.length,
          tokenCount: countTokens(body),
        },
      })
    );
  }

  // ── قاعدة 2: بداية فعل حدثي صريح ──
  if (ACTION_VERB_START_RE.test(body)) {
    const evidence: GateBreakEvidence = {
      signalType: "gate-break",
      brokenGateRule: "character-starts-with-action-verb",
      expectedPattern: "اسم شخصية لا يبدأ بفعل حدثي",
      actualPattern: `يبدأ بفعل حدثي — "${body.slice(0, 12)}"`,
      gateType: "character",
    };

    signals.push(
      createSignal<GateBreakEvidence>({
        lineIndex,
        family: "gate-break",
        signalType: "gate-break",
        score: 0.85,
        reasonCode: "CONTRACT_CHARACTER_ACTION_VERB_START",
        message: `سطر شخصية يبدأ بفعل حدثي — وصف حركي مُختلط باسم: "${line.text}"`,
        suggestedType: "action",
        evidence,
        debug: {
          bodyPrefix: body.slice(0, 16),
          bodyLength: body.length,
        },
      })
    );
  }

  // ── قاعدة 3: طول مفرط أو عدد توكنات زائد ──
  const tokenCount = countTokens(body);
  if (body.length > CHARACTER_MAX_LENGTH || tokenCount > CHARACTER_MAX_TOKENS) {
    const evidence: GateBreakEvidence = {
      signalType: "gate-break",
      brokenGateRule: "character-body-too-long",
      expectedPattern: `اسم شخصية ≤ ${CHARACTER_MAX_LENGTH} محرفًا وعدد توكنات ≤ ${CHARACTER_MAX_TOKENS}`,
      actualPattern: `طول = ${body.length}، عدد توكنات = ${tokenCount}`,
      gateType: "character",
    };

    // الشدة تصاعدية بحسب حجم التجاوز
    const lengthOvershoot = Math.max(0, body.length - CHARACTER_MAX_LENGTH);
    const tokenOvershoot = Math.max(0, tokenCount - CHARACTER_MAX_TOKENS);
    const baseScore = 0.6;
    const overshootBoost = Math.min(
      0.3,
      lengthOvershoot * 0.005 + tokenOvershoot * 0.08
    );
    const score = Math.min(0.95, baseScore + overshootBoost);

    signals.push(
      createSignal<GateBreakEvidence>({
        lineIndex,
        family: "gate-break",
        signalType: "gate-break",
        score,
        reasonCode: "CONTRACT_CHARACTER_BODY_TOO_LONG",
        message: `جسم اسم الشخصية طويل بشكل غير طبيعي (${body.length} محرف، ${tokenCount} توكن) — يرجّح أنه جملة وصفية`,
        suggestedType: "action",
        evidence,
        debug: {
          bodyLength: body.length,
          tokenCount,
          lengthOvershoot,
          tokenOvershoot,
        },
      })
    );
  }

  // ── قاعدة 4: علامات ترقيم نهاية جملة وسط جسم الاسم ──
  if (MID_SENTENCE_PUNCT_RE.test(body)) {
    const evidence: GateBreakEvidence = {
      signalType: "gate-break",
      brokenGateRule: "character-contains-mid-sentence-punctuation",
      expectedPattern: "اسم شخصية بلا علامات ترقيم جملة داخل جسمه",
      actualPattern: `يحوي علامات ترقيم — "${body.slice(0, 24)}"`,
      gateType: "character",
    };

    signals.push(
      createSignal<GateBreakEvidence>({
        lineIndex,
        family: "gate-break",
        signalType: "gate-break",
        score: 0.8,
        reasonCode: "CONTRACT_CHARACTER_MID_SENTENCE_PUNCT",
        message: `سطر شخصية يحوي علامات ترقيم جملة (؟!.) — مرجّح أنه نهاية حوار مدموج: "${line.text}"`,
        suggestedType: "action",
        evidence,
        debug: {
          bodyPrefix: body.slice(0, 20),
          bodyLength: body.length,
        },
      })
    );
  }

  return signals;
};
