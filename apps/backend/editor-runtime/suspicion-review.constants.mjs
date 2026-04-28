export const API_VERSION = "1.0";
export const API_MODE = "contextual-suspicion";
export const DEFAULT_TIMEOUT_MS = 180_000;
export const DEFAULT_MODEL_ID = "claude-opus-4-7";
export const TEMPERATURE = 0.0;
export const MAX_TEXT_LENGTH = 8_000;
export const MAX_REASONS = 32;
export const MAX_CONTEXT_LINES = 6;
export const MAX_OUTPUT_TOKENS = 16_000;
export const SUSPICION_REVIEW_CHANNEL = "suspicion-review";

export const ALLOWED_LINE_TYPES = new Set([
  "action",
  "dialogue",
  "character",
  "scene_header_top_line",
  "scene_header_1",
  "scene_header_2",
  "scene_header_3",
  "transition",
  "parenthetical",
  "basmala",
]);

export const ALLOWED_INPUT_BANDS = new Set([
  "local-review",
  "agent-candidate",
  "agent-forced",
]);

export const ALLOWED_OUTPUT_BANDS = new Set([
  "local-review",
  "agent-candidate",
  "agent-forced",
]);

export const ALLOWED_DISCOVERED_BANDS = new Set([
  "agent-candidate",
  "agent-forced",
]);

export const SYSTEM_PROMPT = `أنت طبقة شك سياقية في محرر سيناريو عربي.

مهمتك ليست التصحيح النهائي.
مهمتك هي مراجعة حالات الشك الحالية اعتمادًا على السطر نفسه وسياقه فقط.

أرجع JSON فقط بالشكل التالي:
{
  "reviewedLines": [
    {
      "itemId": "string",
      "verdict": "confirm | dismiss | escalate",
      "adjustedScore": 0,
      "routingBand": "local-review | agent-candidate | agent-forced",
      "confidence": 0,
      "reason": "سبب عربي قصير",
      "primarySuggestedType": "action"
    }
  ],
  "discoveredLines": [
    {
      "lineIndex": 0,
      "text": "النص كما ظهر في السياق",
      "assignedType": "action",
      "suspicionScore": 0,
      "routingBand": "agent-candidate | agent-forced",
      "confidence": 0,
      "reason": "سبب عربي قصير",
      "primarySuggestedType": "dialogue"
    }
  ]
}

القواعد:
- يجب أن تعيد بند reviewedLines واحدًا لكل itemId وارد في الإدخال.
- الإدخال قد يحتوي routingBand بقيمة local-review وهذا يعني حالة شك منخفضة وليست حالة مرفوضة.
- verdict = dismiss عندما ترى أن الحالة لا تستحق التصعيد.
- verdict = confirm عندما يبقى نفس مستوى التصعيد.
- verdict = escalate عندما يجب رفع الحالة.
- عند verdict = escalate لا تستخدم routingBand = local-review.
- discoveredLines مسموح فقط لأسطر ظهرت داخل contextLines المرسلة، وليس من خارجها.
- lineIndex و text في discoveredLines يجب أن يطابقا ما ورد في السياق حرفيًا.
- لا تُعد كتابة المستند، ولا تُرجع أوامر تصحيح نهائي.
- confidence بين 0 و 1.
- adjustedScore و suspicionScore بين 0 و 100.
- استخدم فقط أنواع السطور ونطاقات التصعيد المسموحة.`;
