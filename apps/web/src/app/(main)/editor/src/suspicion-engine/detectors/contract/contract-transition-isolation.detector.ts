import { createSignal } from "@editor/suspicion-engine/helpers";

import type { DetectorFn } from "@editor/suspicion-engine/detectors/detector-interface";
import type { GateBreakEvidence } from "@editor/suspicion-engine/types";

/**
 * @module contract/contract-transition-isolation.detector
 * @description
 * كاشف عقد عزلة الانتقال — يُترجم البند الحاكم في عقد
 * `arabic-screenplay-classifier`:
 *
 *   "TRANSITION = أي سطر يساوي (أو يحتوي فقط على) كلمة انتقال مثل «قطع».
 *    كل ظهور = سطر مستقل."
 *
 * يرصد الكاشف سطرًا مصنفًا `transition` لكنه لا يطابق الصيغة المعزولة:
 *
 *  1. السطر يحوي نصًا وصفيًا إضافيًا بعد كلمة الانتقال
 *     (مثل: "قطع إلى الغرفة" — هذا ليس انتقالًا بنيويًا بل جملة وصفية).
 *
 *  2. السطر أطول من الحد الطبيعي لسطر انتقال (> 20 محرفًا).
 *
 *  3. السطر لا يبدأ بكلمة انتقال معروفة.
 *
 * قائمة كلمات الانتقال متزامنة مع `RECONSTRUCTION_TRANSITION` و`TRANSITION_WORDS` في
 * `apps/backend/editor-runtime/karank_engine/engine/constants.py` (element-grammar §9).
 * أي توسعة هناك يجب أن تنعكس هنا لمنع تسرّب false positives أو ضياع مخالفات ذيل-وصفي.
 *
 * ── ملاحظة مزامنة (جولة 087) ──
 * يضم هذا الكاشف ثلاثة مفردات إضافية خارج TRANSITION_WORDS في Python
 * كتسامح خلفي (backwards compatibility) لنصوص قديمة:
 *   - `ذوبان` — مرادف عربي نادر لـ Dissolve
 *   - `اختفاء تدريجي` — صيغة موسَّعة
 *   - `SMASH CUT` — شائع في نصوص إنجليزية
 * هذا التسامح لا يُفعَّل إلا إذا كان `line.type === "transition"`، وهي حالة
 * vacuous ما دام الكرنك يفلتر TRANSITION بمجموعة Python المغلقة.
 * لا تُسقط هذه المفردات دون مزامنة Python أولًا.
 */

// ── ألوان التلاشي المعتمدة في element-grammar §9 ──
const TRANSITION_COLOR = "(?:السواد|الأسود|البياض|الأبيض|النور)";

// ── نواة كلمة الانتقال (متزامنة مع Python constants.py) ──
// عربي: قطع/تلاشي بمتغيّراتها بالألوان/اختفاء/مزج/فيد/ذوبان (مُبقى للخلفية).
// إنجليزي: Fade/Cut/Dissolve/SMASH CUT (مُبقى للخلفية).
const TRANSITION_KEYWORD_CORE =
  "(?:" +
  "قطع(?:\\s+إلى:?)?" +
  `|تلاشي(?:\\s+(?:إلى(?:\\s+${TRANSITION_COLOR})?:?|للسواد|من\\s+السواد(?:\\s+إلى:?)?))?` +
  "|اختفاء(?:\\s+تدريجي)?" +
  "|مزج" +
  "|ذوبان" +
  "|فيد(?:\\s+(?:إن|أوت))?" +
  "|Fade(?:\\s+(?:in|out|IN|OUT))?" +
  "|FADE\\s+(?:IN|OUT)" +
  "|Cut(?:\\s+to:?)?" +
  "|CUT\\s+TO:?" +
  "|Dissolve(?:\\s+to:?)?" +
  "|SMASH\\s+CUT" +
  ")";

// ── كلمات الانتقال الرسمية (يجب أن يبدأ السطر بها) ──
// ملاحظة حدود الكلمة: لا نستخدم `\b` لأن JS regex يعتبر الأحرف العربية
// non-word، فيفشل boundary matching على أمثلة مثل "قطع". نستخدم
// lookahead صريح: نهاية السطر، مسافة، أو علامة ترقيم.
const TRANSITION_WORD_END = "(?=$|\\s|[:.،,؛])";
const TRANSITION_KEYWORDS_RE = new RegExp(
  `^${TRANSITION_KEYWORD_CORE}${TRANSITION_WORD_END}`,
  "iu"
);

// ── الحد الأقصى الطبيعي لسطر انتقال (بالأحرف) ──
const TRANSITION_MAX_LENGTH = 20;

// ── نمط بقية النص بعد كلمة الانتقال ──
// إذا كان السطر "قطع إلى الشقة" فـ body بعد تجريد كلمة الانتقال طويلة.
const TRANSITION_BODY_EXTRACT_RE = new RegExp(
  `^${TRANSITION_KEYWORD_CORE}\\s*[:.،,\\s]*\\s*(.*)$`,
  "iu"
);

export const detectContractTransitionIsolation: DetectorFn = (
  trace,
  line,
  _context
) => {
  if (line.type !== "transition") return [];

  const text = line.text.trim();
  if (text.length === 0) return [];

  const signals = [];
  const { lineIndex } = trace;

  // ── قاعدة 1: السطر لا يبدأ بكلمة انتقال معروفة ──
  if (!TRANSITION_KEYWORDS_RE.test(text)) {
    const evidence: GateBreakEvidence = {
      signalType: "gate-break",
      brokenGateRule: "transition-missing-keyword",
      expectedPattern: "سطر انتقال يبدأ بكلمة: قطع/مزج/ذوبان/CUT TO/FADE...",
      actualPattern: `"${text.slice(0, 24)}"`,
      gateType: "transition",
    };

    signals.push(
      createSignal<GateBreakEvidence>({
        lineIndex,
        family: "gate-break",
        signalType: "gate-break",
        score: 0.8,
        reasonCode: "CONTRACT_TRANSITION_MISSING_KEYWORD",
        message: `سطر انتقال لا يبدأ بكلمة انتقال معروفة: "${text}"`,
        suggestedType: "action",
        evidence,
        debug: {
          textPrefix: text.slice(0, 30),
          textLength: text.length,
        },
      })
    );

    // لا حاجة لفحص قواعد الجسم إذا لم تكن كلمة الانتقال موجودة أصلًا.
    return signals;
  }

  // ── قاعدة 2: السطر يحوي جسمًا إضافيًا بعد كلمة الانتقال ──
  const bodyMatch = TRANSITION_BODY_EXTRACT_RE.exec(text);
  const body = bodyMatch?.[1]?.trim() ?? "";

  // جسم إضافي قصير مثل "TO" يُعد جزءًا من كلمة الانتقال نفسها.
  // نعتبر الجسم "موضوعيًا" إذا تجاوز 3 محارف.
  if (body.length > 3) {
    const evidence: GateBreakEvidence = {
      signalType: "gate-break",
      brokenGateRule: "transition-has-extra-body",
      expectedPattern: "سطر انتقال معزول يحوي كلمة الانتقال فقط",
      actualPattern: `يحوي جسمًا إضافيًا: "${body.slice(0, 24)}"`,
      gateType: "transition",
    };

    signals.push(
      createSignal<GateBreakEvidence>({
        lineIndex,
        family: "gate-break",
        signalType: "gate-break",
        score: 0.65,
        reasonCode: "CONTRACT_TRANSITION_HAS_EXTRA_BODY",
        message: `سطر انتقال يحوي نصًا إضافيًا بعد كلمة الانتقال — مرجّح أنه جملة وصفية: "${text}"`,
        suggestedType: "action",
        evidence,
        debug: {
          bodyText: body.slice(0, 40),
          bodyLength: body.length,
          textLength: text.length,
        },
      })
    );
  }

  // ── قاعدة 3: السطر أطول من الحد الطبيعي ──
  if (text.length > TRANSITION_MAX_LENGTH) {
    const evidence: GateBreakEvidence = {
      signalType: "gate-break",
      brokenGateRule: "transition-too-long",
      expectedPattern: `سطر انتقال ≤ ${TRANSITION_MAX_LENGTH} محرفًا`,
      actualPattern: `طول = ${text.length}`,
      gateType: "transition",
    };

    signals.push(
      createSignal<GateBreakEvidence>({
        lineIndex,
        family: "gate-break",
        signalType: "gate-break",
        score: 0.55,
        reasonCode: "CONTRACT_TRANSITION_TOO_LONG",
        message: `سطر انتقال أطول من الحد الطبيعي (${text.length} محرف): "${text}"`,
        suggestedType: "action",
        evidence,
        debug: {
          textLength: text.length,
          maxExpected: TRANSITION_MAX_LENGTH,
        },
      })
    );
  }

  return signals;
};
