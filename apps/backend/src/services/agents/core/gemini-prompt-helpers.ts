/**
 * Helper functions for constructing Gemini API prompts
 */
import {
  PROMPT_PERSONA_BASE,
  TASK_SPECIFIC_INSTRUCTIONS,
  TASKS_EXPECTING_JSON_RESPONSE,
  COMPLETION_ENHANCEMENT_OPTIONS,
  TASK_CATEGORY_MAP,
  ENHANCED_TASK_DESCRIPTIONS as TASK_DESCRIPTIONS_FOR_PROMPT
} from '../../../config/agentPrompts';
import {
  safeRegexMatchGroup,
} from '../../../types/ai/geminiTypes';
import { TaskCategory, TaskType } from '../../../types/types';

import type { ProcessedFile } from './fileReaderService';
import type { GeminiError } from '../../../types/ai/geminiTypes';
import type { Part } from "@google/generative-ai";

/**
 * @interface ProcessTextsParams
 * @description Defines the parameters for the `processTextsWithGemini` function.
 */
export interface ProcessTextsParams {
  processedFiles: ProcessedFile[];
  taskType: TaskType;
  specialRequirements: string;
  additionalInfo: string;
  completionScope?: string;
  selectedCompletionEnhancements?: string[];
  previousContextText?: string;
}

/**
 * @function attemptToFixJson
 * @description Attempts to fix a broken JSON string
 */
export const attemptToFixJson = (jsonString: string): string => {
    const objectCandidate = sliceBetween(jsonString, '{', '}');
    if (objectCandidate) {
        try {
            JSON.parse(objectCandidate);
            return objectCandidate;
        } catch {
            // Attempt failed
        }
    }
    const arrayCandidate = sliceBetween(jsonString, '[', ']');
    if (arrayCandidate) {
        try {
            JSON.parse(arrayCandidate);
            return arrayCandidate;
        } catch {
            // Attempt failed
        }
    }
    return jsonString;
};

function sliceBetween(input: string, openChar: string, closeChar: string): string | null {
    const start = input.indexOf(openChar);
    const end = input.lastIndexOf(closeChar);
    if (start === -1 || end <= start) {
        return null;
    }
    return input.slice(start, end + 1);
}

function resolveAdvancedModuleRole(taskType: TaskType, taskLabel: string): string {
  const fullTaskDesc = (TASK_DESCRIPTIONS_FOR_PROMPT)[taskType];
  let moduleNameOnly = taskLabel;
  if (fullTaskDesc) {
    const colonIndex = fullTaskDesc.indexOf(':');
    const dashIndex = fullTaskDesc.indexOf('-');
    if (colonIndex !== -1) {
      const endIndex = dashIndex !== -1 ? dashIndex : fullTaskDesc.length;
      moduleNameOnly = fullTaskDesc.substring(colonIndex + 1, endIndex).trim();
    }
  }
  return `بصفتك خبير متخصص في "${moduleNameOnly}", قادر على إجراء تحليلات معمقة وتقديم نتائج منظمة بناءً على المكونات المحددة للوحدة.`;
}

function resolveDefaultRole(taskType: TaskType, taskLabel: string): string {
  if (taskType.toString().includes('analysis') || taskType.toString().includes('analyzer')) {
    return `بصفتك خبير تحليل درامي متخصص في "${taskLabel}".`;
  }
  if (taskType.toString().includes('creative') || taskType.toString().includes('generator') || taskType.toString().includes('builder')) {
    return `بصفتك كاتب سيناريو ومؤلف مبدع متخصص في "${taskLabel}".`;
  }
  return `بصفتك مساعد ذكي متعدد المهام في مجال الدراما والكتابة الإبداعية، متخصص في "${taskLabel}".`;
}

/**
 * @function resolveTaskSpecificRole
 * @description Determines the task-specific role string based on category and task type
 */
function resolveTaskSpecificRole(taskType: TaskType, taskLabel: string): string {
  const category = TASK_CATEGORY_MAP[taskType];

  switch(category) {
    case TaskCategory.CORE:
      if (taskType === TaskType.COMPLETION) {
        return `بصفتك كاتب سيناريو وخبير استكمال نصوص درامية، مع قدرة على دمج تحليلات متقدمة إذا طُلب منك ذلك.`;
      }
      return `بصفتك خبير تحليل درامي ونقدي، متخصص في "${taskLabel}".`;
    case TaskCategory.ANALYSIS:
      return `بصفتك خبير تحليل درامي متخصص في "${taskLabel}".`;
    case 'creative':
      return `بصفتك كاتب سيناريو ومؤلف مبدع متخصص في "${taskLabel}".`;
    case 'predictive':
      return `بصفتك مستشرف وخبير استراتيجي في تطوير الدراما متخصص في "${taskLabel}".`;
    case 'advanced_modules':
      return resolveAdvancedModuleRole(taskType, taskLabel);
    default:
      return resolveDefaultRole(taskType, taskLabel);
  }
}

/**
 * @function addFileParts
 * @description Adds file content parts to the prompt parts array
 */
function addFileParts(parts: Part[], processedFiles: ProcessedFile[]): void {
   
  processedFiles.forEach((file, index) => {
    parts.push({ text: `\n\n--- الملف المقدم ${index + 1}: ${file.name} (نوع MIME: ${file.mimeType}) ---` });

    if (file.mimeType.startsWith('image/') || file.mimeType === 'application/pdf') {
      if (file.isBase64 && file.content && !file.content.startsWith('[Error:') && !file.content.startsWith('[ملاحظة:')) {
        parts.push({ inlineData: { mimeType: file.mimeType, data: file.content } });
        if (file.mimeType === 'application/pdf'){
            parts.push({text: "[ملاحظة: تم إرسال ملف PDF كبيانات. قد يتمكن النموذج من معالجة المحتوى إذا كان PDF يحتوي على طبقة نصية أو إذا كان النموذج يدعم OCR على ملفات PDF المرسلة بهذه الطريقة. إذا كان المحتوى النصي للـ PDF هو الأساس، يفضل تحويله إلى .txt أو .docx.]"});
        }
      } else if (file.content.startsWith('[Error:') || file.content.startsWith('[ملاحظة:')) {
        parts.push({ text: file.content });
      } else {
         parts.push({ text: `[الملف ${file.name} (${file.mimeType}) كان من المتوقع أن يكون base64 ولكن لم تتم معالجته بشكل صحيح أو أن محتواه فارغ.]`});
      }
    } else if (file.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      if (!file.content.startsWith('[Error:') && !file.content.startsWith('[ملاحظة:')) {
        parts.push({ text: `محتوى من ملف DOCX (${file.name}):\n${file.content}` });
      } else {
        parts.push({ text: file.content });
      }
    } else {
      parts.push({ text: file.content });
    }
    parts.push({ text: `--- نهاية الملف ${index + 1}: ${file.name} ---` });
  });
}

/**
 * @function addUserRequirements
 * @description Adds user requirements section to the prompt parts
 */
function addUserRequirements(parts: Part[], params: ProcessTextsParams): void {
  const { taskType, specialRequirements, additionalInfo, completionScope, selectedCompletionEnhancements } = params;

  let userRequirementsSection = "\n\n## مواصفات المستخدم الإضافية:\n";
  let hasUserSpecs = false;

  if (specialRequirements) {
    userRequirementsSection += `المتطلبات الخاصة: ${specialRequirements}\n`;
    hasUserSpecs = true;
  }
  if (additionalInfo) {
    userRequirementsSection += `معلومات إضافية: ${additionalInfo}\n`;
    hasUserSpecs = true;
  }
  if (completionScope) {
    userRequirementsSection += `**نطاق الاستكمال المطلوب:** ${completionScope}\n`;
    hasUserSpecs = true;
  }

  if (taskType === TaskType.COMPLETION && selectedCompletionEnhancements && selectedCompletionEnhancements.length > 0) {
    userRequirementsSection += `\n**تحسينات الاستكمال المطلوبة (يجب دمجها بفعالية في النص المستكمل):**\n`;
    selectedCompletionEnhancements.forEach(enhancementId => {
      const enhancementDetail = COMPLETION_ENHANCEMENT_OPTIONS.find(opt => opt.id === enhancementId);
      const enhancementInstructions = TASK_SPECIFIC_INSTRUCTIONS[enhancementId] ?? `تطبيق مبادئ ${enhancementDetail?.label ?? enhancementId}.`;

      let goalSummary = enhancementDetail?.label ?? enhancementId;
      const goalText = safeRegexMatchGroup(enhancementInstructions, /\*\*الهدف:\*\*\s*([^\r\n]+)/, 1);
      if (goalText) {
        goalSummary = goalText;
      }

      userRequirementsSection += `- **${enhancementDetail?.label ?? enhancementId}:** ${goalSummary}. (راجع التعليمات التفصيلية لهذه المهمة إذا لزم الأمر).\n`;
    });
    hasUserSpecs = true;
  }

  if (!hasUserSpecs) {
    userRequirementsSection += `لم يتم تقديم متطلبات محددة أو نطاق استكمال أو تحسينات من المستخدم بخلاف الملفات ونوع المهمة.\n`;
  }
  parts.push({ text: userRequirementsSection });
}

/**
 * @function constructPromptParts
 * @description Constructs the array of prompt parts for Gemini API
 */
export const constructPromptParts = (params: ProcessTextsParams): Part[] => {
  const { processedFiles, taskType, previousContextText } = params;
  const parts: Part[] = [];

  const taskDescription = (TASK_DESCRIPTIONS_FOR_PROMPT)[taskType] ?? "مهمة عامة";
  const taskLabel = taskDescription.split(':')[0]?.trim() ?? taskDescription;
  const taskSpecificRole = resolveTaskSpecificRole(taskType, taskLabel);

  parts.push({ text: PROMPT_PERSONA_BASE.replace('CritiqueConstruct AI', `CritiqueConstruct AI. ${taskSpecificRole}`) });

  const taskInstructions = TASK_SPECIFIC_INSTRUCTIONS[taskType];
  if (taskInstructions) {
    parts.push({ text: `\n\n## المهمة المحددة: ${taskDescription}\n${taskInstructions}` });
  } else {
    parts.push({ text: `\n\n## المهمة المحددة: ${taskDescription}\n(لا توجد تعليمات مفصلة لهذا النوع من المهام في الوقت الحالي، اعتمد على فهمك العام للمهمة من خلال وصفها العام.)` });
  }

  if (previousContextText) {
    parts.push({ text: "\n\n## سياق الاستكمال السابق:\n" });
    parts.push({ text: "تم تقديم النص التالي كنتيجة لعملية استكمال سابقة. المطلوب هو مواصلة العمل بناءً على هذا السياق بالإضافة إلى الملفات الأصلية (إذا كانت لا تزال ذات صلة ولم يتم تضمينها بالكامل في هذا السياق) وضمن 'نطاق الاستكمال المطلوب' الجديد." });
    parts.push({ text: "\n--- بداية السياق السابق ---\n" });
    parts.push({ text: previousContextText });
    parts.push({ text: "\n--- نهاية السياق السابق ---\n" });
    parts.push({ text: "يرجى الآن معالجة الملفات الحالية (إذا كانت منفصلة عن السياق أعلاه) والاستمرار في الاستكمال." });
  }

  addFileParts(parts, processedFiles);
  addUserRequirements(parts, params);

  const jsonReminderTasks = TASKS_EXPECTING_JSON_RESPONSE.map(t => {
    const desc = (TASK_DESCRIPTIONS_FOR_PROMPT)[t];
    return desc?.split(':')[0]?.trim() ?? t;
  }).join(', ');
  parts.push({ text: `\n\n**تذكير بتعليمات الإخراج الصارمة**: اللغة العربية الفصحى. إذا كانت المهمة تتطلب إخراج JSON (مثل مهام: ${jsonReminderTasks}), يجب أن يكون ردك الأساسي هو كائن JSON صالح يتبع الواجهة المحددة للمهمة، وقد يكون محاطًا بـ \`\`\`json ... \`\`\`.` });

  return parts;
};

/**
 * @function buildErrorMessage
 * @description Extracts a user-friendly error message from a Gemini error
 */
// eslint-disable-next-line complexity
export function buildErrorMessage(error: GeminiError & { status?: number; message?: string; toString?: () => string; response?: { error?: { message?: string } } }): string {
  let errorMessage = error.message || "حدث خطأ غير معروف مع Gemini API.";

  if (error.toString?.().toLowerCase().includes("api_key")) {
    errorMessage = "مفتاح Gemini API مفقود أو غير صالح. يرجى التأكد من تكوين متغير البيئة API_KEY بشكل صحيح.";
  } else if (error.message?.toLowerCase().includes("request entity size is larger than limit")) {
    errorMessage = "حجم الملفات المرسلة أو حجم السياق الكلي يتجاوز الحد المسموح به من Gemini API. يرجى محاولة تقليل حجم الملفات أو عددها، أو تقصير نطاق الاستكمال إذا كنت تستخدم الاستكمال التكراري.";
  } else if (error.message?.toLowerCase().includes("unsupported mime type") || error.message?.toLowerCase().includes("invalid_argument")) {
    errorMessage = "واجهت Gemini API مشكلة في معالجة أحد أنواع الملفات المرفوعة أو محتواها. يرجى التحقق من أن الملفات هي من الأنواع المدعومة (نصوص، صور، PDF، DOCX بعد المعالجة) وأنها غير تالفة.";
  } else if (error.status && (error.status === 400 || error.status.toString() === 'INVALID_ARGUMENT')) {
    errorMessage = `خطأ في الطلب إلى Gemini API (قد يكون بسبب محتوى غير متوقع أو تنسيق خاطئ): ${error.message || 'وسيطات غير صالحة.'}`;
  } else if (error.status && error.status >= 500) {
    errorMessage = `واجه خادم Gemini API مشكلة (خطأ ${error.status}). يرجى المحاولة مرة أخرى لاحقًا. ${error.message || ''}`;
  }

  if (error.response?.error?.message) {
    errorMessage = `خطأ من Gemini API: ${error.response.error.message}`;
  } else if (error.message?.includes("content") && error.message.includes("blocked")) {
    errorMessage = `تم حظر المحتوى بواسطة Gemini API بسبب سياسات الأمان. ${error.message}`;
  }

  return errorMessage;
}
