/**
 * @module extensions/paste-classifier
 *
 * نقطة الدخول الرسمية لمصنّف اللصق ضمن المحرر.
 * هذا الملف هو واجهة رفيعة (façade) فقط؛ المنطق الفعلي مقسّم داخل
 * مجلد `paste-classifier/` إلى وحدات صغيرة قابلة للاختبار:
 *
 * - `paste-classifier/types`             — types عامة (Options، Flow Options، state).
 * - `paste-classifier/constants`         — PIPELINE_FLAGS، regex جودة السطر، خرائط المحرك.
 * - `paste-classifier/errors`            — ProgressivePipelineStageError.
 * - `paste-classifier/utils/*`           — hash، تطبيع نصوص، جودة سطر، draft-builders، source-mapping.
 * - `paste-classifier/schema-seed`       — منطق seeds من المحرك المضمّن (Karank).
 * - `paste-classifier/trace-helpers`     — جسر traceCollector.
 * - `paste-classifier/classification-context` — سياق التصنيف وإشارات المشهد الزمنية.
 * - `paste-classifier/classify-lines`    — منطق التصنيف الخالص للنصوص.
 * - `paste-classifier/classify-text`     — تصنيف نص + agentReview اختياري.
 * - `paste-classifier/agent-review`      — تطبيق agentReview الخارجي.
 * - `paste-classifier/prosemirror-adapter` — تحويل classified إلى عقد ProseMirror.
 * - `paste-classifier/pipeline-state`    — حارس re-entry + dedup.
 * - `paste-classifier/final-review/*`    — routing + payload-builders + apply طبقة المراجعة النهائية.
 * - `paste-classifier/suspicion-review-layer` — طبقة الشك بالنموذج.
 * - `paste-classifier/paste-flow`        — تدفق التصنيف على المحرر بنمط Render-First.
 * - `paste-classifier/extension`         — Tiptap Extension يربط handlePaste بالتدفق.
 *
 * كل النواتج العامة محفوظة كما كانت قبل التقسيم. لا يوجد تغيير في:
 * - أسماء أو توقيعات الدوال.
 * - قواعد التصنيف أو ثقاتها.
 * - عتبات pipeline أو ترتيب passes.
 * - تكامل ProseMirror/Tiptap أو سلوك handlePaste.
 */

// Re-export ثابت اسم حدث الأخطاء — مستهلك في طبقة UI.
export { PASTE_CLASSIFIER_ERROR_EVENT } from "./paste-classifier-config";

// Re-export الأنواع العامة.
export type {
  ApplyPasteClassifierFlowOptions,
  ClassifyLinesContext,
  PasteClassifierOptions,
  SchemaElementInput,
} from "./paste-classifier/types";

// Re-export Feature Flags كقيمة (ملاحظة: تبقى object قابلة للقراءة من المستهلك).
export { PIPELINE_FLAGS } from "./paste-classifier/constants";

// Re-export دوال التصنيف الخالصة.
export { classifyLines } from "./paste-classifier/classify-lines";
export { classifyText } from "./paste-classifier/classify-text";

// Re-export طبقة المراجعة النهائية كـ API خارجي قائم.
export { applyFinalReviewLayer } from "./paste-classifier/final-review/apply";

// Re-export تدفق التصنيف على المحرر.
export { applyPasteClassifierFlowToView } from "./paste-classifier/paste-flow";

// Re-export Tiptap Extension.
export { PasteClassifier } from "./paste-classifier/extension";
