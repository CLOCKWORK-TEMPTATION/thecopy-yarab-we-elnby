import type { StandardAgentInput } from "../shared/standardAgentPattern";

import { formatCharacter, summarizeScene } from "./formatUtils";
import {
  translateConflictLevel,
  translateEmotionalTone,
  translateSceneType,
} from "./translationHelpers";
import {
  asJsonRecord,
  asString,
  asStringArray,
  asUnknownArray,
} from "./types";

function buildOriginalTextSection(text: string): string {
  return text ? `السياق الأصلي:\n${text}\n\n` : "";
}

function buildSpecsSection(
  sceneType: string,
  tone: string,
  conflict: string
): string {
  let section = `مواصفات المشهد:\n`;
  section += `- نوع المشهد: ${translateSceneType(sceneType)}\n`;
  section += `- النبرة العاطفية: ${translateEmotionalTone(tone)}\n`;
  section += `- مستوى الصراع: ${translateConflictLevel(conflict)}\n\n`;
  return section;
}

function buildCharactersSection(characters: unknown[]): string {
  if (characters.length === 0) {
    return "";
  }
  let section = `الشخصيات في المشهد:\n`;
  characters.forEach((character, index) => {
    section += `${index + 1}. ${formatCharacter(character)}\n`;
  });
  return `${section}\n`;
}

function buildSettingSection(setting: string): string {
  return setting ? `مكان وزمان المشهد:\n${setting}\n\n` : "";
}

function buildObjectivesSection(objectives: string[]): string {
  if (objectives.length === 0) {
    return "";
  }
  let section = `أهداف المشهد:\n`;
  objectives.forEach((objective, index) => {
    section += `${index + 1}. ${objective}\n`;
  });
  return `${section}\n`;
}

function buildPreviousScenesSection(scenes: unknown[]): string {
  if (scenes.length === 0) {
    return "";
  }
  let section = `ملخص المشاهد السابقة:\n`;
  scenes.slice(-2).forEach((scene, index) => {
    section += `[مشهد ${index + 1}]: ${summarizeScene(scene)}\n`;
  });
  return `${section}\n`;
}

const GENERATION_INSTRUCTIONS = `التعليمات:

1. **وصف المشهد** (2-3 جمل): ابدأ بوصف موجز للمكان والأجواء
2. **الحركة والحوار**: اكتب المشهد بشكل متكامل مع الحوارات والحركات
3. **التوتر الدرامي**: احرص على بناء التوتر وتطوير الصراع
4. **التفاصيل الحسية**: أضف تفاصيل بصرية وسمعية وحسية
5. **النهاية**: اختتم المشهد بشكل يدفع القصة للأمام

اكتب المشهد بأسلوب سينمائي واضح، مع التوازن بين الوصف والحوار والحركة.
لا تستخدم JSON أو رموز البرمجة. اكتب نصاً درامياً صافياً.`;

export function buildScenePrompt(input: StandardAgentInput): string {
  const { input: taskInput, context } = input;
  const contextObj = asJsonRecord(context);

  const sceneType = asString(contextObj.sceneType, "dramatic");
  const emotionalTone = asString(contextObj.emotionalTone, "neutral");
  const conflictLevel = asString(contextObj.conflictLevel, "medium");
  const originalText = asString(contextObj.originalText);
  const characters = asUnknownArray(contextObj.characters);
  const setting = asString(contextObj.setting);
  const objectives = asStringArray(contextObj.objectives);
  const previousScenes = asUnknownArray(contextObj.previousScenes);

  let prompt = `مهمة توليد المشهد الدرامي\n\n`;
  prompt += buildOriginalTextSection(originalText);
  prompt += buildSpecsSection(sceneType, emotionalTone, conflictLevel);
  prompt += buildCharactersSection(characters);
  prompt += buildSettingSection(setting);
  prompt += buildObjectivesSection(objectives);
  prompt += buildPreviousScenesSection(previousScenes);
  prompt += `المهمة المطلوبة:\n${taskInput}\n\n`;
  prompt += GENERATION_INSTRUCTIONS;

  return prompt;
}
