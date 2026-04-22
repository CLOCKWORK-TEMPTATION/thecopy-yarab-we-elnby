import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const characterVoiceInstructions = `
تحليل صوت الشخصية والأسلوب الحواري:

**المهام الأساسية:**
1. تحديد نبرة الشخصية وأسلوب كلامها
2. تحليل الخصائص اللغوية المميزة لكل شخصية
3. تقييم اتساق الصوت عبر المشاهد المختلفة
4. اقتراح تحسينات للحوار ليعكس شخصية الممثل

**العناصر المطلوب تحليلها:**
- المفردات والتعبيرات المستخدمة
- إيقاع الكلام وطول الجمل
- الأسلوب الشعوري والنبرة العامة
- التمييز بين أصوات الشخصيات المختلفة
- التطور في الصوت عبر القصة

**النتائج المطلوبة:**
- ملف شخصي صوتي لكل شخصية
- تقييم جودة التمايز بين الأصوات
- اقتراحات التحسين والتطوير
`;

export const characterVoiceAgentConfig: AIAgentConfig = {
  name: "CharacterVoiceAgent",
  description: "وكيل متخصص في تحليل أصوات الشخصيات وأساليب الحوار",
  category: TaskCategory.ANALYSIS,
  taskType: TaskType.CHARACTER_ANALYSIS,
  instructions: characterVoiceInstructions,
  capabilities: [
    "تحليل نبرة الشخصيات",
    "تقييم اتساق الصوت",
    "تمييز الأصوات المختلفة",
    "تحسين الحوار"
  ]
};
