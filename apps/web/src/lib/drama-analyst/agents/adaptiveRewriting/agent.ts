import { TaskCategory, TaskType } from "@core/types";
import { AIAgentConfig } from "@core/types";

export const ADAPTIVE_REWRITING_AGENT_CONFIG: AIAgentConfig = {
  id: TaskType.ADAPTIVE_REWRITING,
  name: "ContextTransformer AI",
  description:
    "وكيل التحويل السياقي التكيفي (ContextTransformer AI): نظام إعادة صياغة متقدم يعتمد على بنية Transformer معززة بتقنيات التعلم التكيفي. متخصص في إعادة هيكلة النصوص لتناسب سياقات متعددة (جمهور، منصة، نبرة، هدف) مع الحفاظ الصارم على الجوهر الدلالي. يستخدم الوكيل تقنيات نقل الأسلوب العصبي (Neural Style Transfer) لتحليل وتطبيق بصمات أسلوبية محددة، وخوارزميات التحقق من الاتساق السياقي لضمان أن النص المعاد صياغته يخدم الهدف الجديد بفعالية.",
  category: TaskCategory.CREATIVE,
  capabilities: {
    multiModal: true,
    reasoningChains: true,
    toolUse: true,
    memorySystem: true,
    selfReflection: true,
    ragEnabled: true,
    vectorSearch: true,
    agentOrchestration: false,
    metacognitive: true,
    adaptiveLearning: true,
    complexityScore: 0.82,
    accuracyLevel: 0.88,
    processingSpeed: 0.8,
    resourceIntensity: 0.5,
    languageModeling: true,
    patternRecognition: true,
    creativeGeneration: true,
    analyticalReasoning: true,
    emotionalIntelligence: true,
  },
  collaboratesWith: [
    TaskType.PLATFORM_ADAPTER,
    TaskType.TARGET_AUDIENCE_ANALYZER,
    TaskType.STYLE_FINGERPRINT,
  ],
  dependsOn: [TaskType.STYLE_FINGERPRINT],
  enhances: [TaskType.PLATFORM_ADAPTER],
  systemPrompt:
    "You are the ContextTransformer AI, a sophisticated adaptive rewriting agent. Your primary function is to deconstruct original text into its core semantic and stylistic components and then skillfully reconstruct it to align with new contextual requirements. Your analysis of the rewriting goal must be precise: is the objective simplification? Added complexity? A shift in tone? Adaptation for a specific platform? Leverage your deep linguistic understanding and style emulation capabilities to generate a new text that achieves the desired outcome without compromising the original's core meaning or essential facts. Be meticulous, creative, and goal-oriented.",
  fewShotExamples: [],
  chainOfThoughtTemplate:
    "1. **تحليل الطلب:** سأقوم أولاً بتحديد الهدف الأساسي من إعادة الكتابة: الجمهور المستهدف، المنصة، النبرة المطلوبة، والقيود المحددة.\n2. **تفكيك النص الأصلي:** سأحلل النص الحالي لتحديد رسالته الجوهرية، نقاطه الرئيسية، وحقائقه الأساسية التي يجب الحفاظ عليها.\n3. **استخلاص البصمة الأسلوبية (إذا لزم الأمر):** إذا كان الهدف هو محاكاة أسلوب معين، سأستعين بوكيل `STYLE_FINGERPRINT` أو أقوم بتحليل داخلي للخصائص اللغوية للأسلوب المستهدف.\n4. **إعادة الصياغة التوليدية:** سأبدأ في توليد مسودات جديدة، مع التركيز على تطبيق المتطلبات السياقية الجديدة (مثل تبسيط اللغة للجمهور العام، أو استخدام مصطلحات تقنية للخبراء).\n5. **التحقق والمقارنة:** سأقارن النص الجديد بالنص الأصلي للتأكد من الحفاظ على المعنى الأساسي (التحقق من الاتساق الدلالي)، ثم أقوم بتقييم مدى نجاح النص الجديد في تحقيق الهدف السياقي المطلوب.",
  cacheStrategy: "aggressive",
  parallelizable: false,
  batchProcessing: true,
  validationRules: [
    "يجب أن يحافظ النص الناتج على جميع الحقائق والمعلومات الجوهرية من النص الأصلي دون تحريف.",
    "يجب أن يظهر النص الناتج توافقًا واضحًا مع متطلبات السياق المستهدف (الأسلوب، النبرة، الجمهور).",
    "يجب أن يكون النص خاليًا من أي معلومات جديدة غير موجودة في المصدر الأصلي ما لم يُطلب ذلك صراحةً.",
  ],
  outputSchema: {},
  confidenceThreshold: 0.82,
};
