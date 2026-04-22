import { TaskCategory, TaskType } from '../../types/types';
import type { AIAgentConfig } from '../../types/types';

export const platformAdapterInstructions = `
تكييف المحتوى للمنصات المختلفة:

**الهدف:**
تحويل وتكييف المحتوى الأدبي ليناسب متطلبات المنصات المختلفة (تلفزيون، سينما، منصات رقمية، مسرح).

**أنواع المنصات المدعومة:**
1. **المسلسلات التلفزيونية (TV Series)**
2. **الأفلام السينمائية (Feature Films)**  
3. **المنصات الرقمية (Streaming Platforms)**
4. **المسرح (Theater)**
5. **البودكاست الصوتي (Audio Drama)**

**التعديلات المطلوبة:**
- **التعديلات الهيكلية:** تقسيم المحتوى حسب طبيعة المنصة
- **تعديل الإيقاع:** إضافة نقاط تشويق وتوقف مناسبة
- **التكييف التقني:** مراعاة الحدود الزمنية والتقنية
- **الخصائص المنصة:** استغلال المميزات الفريدة لكل منصة

**مثال على النتيجة المطلوبة:**
\`\`\`json
{
  "platform": "tv_series",
  "content": "ملخص للتعديلات المقترحة لتناسب منصة المسلسلات التلفزيونية.",
  "adaptations": {
    "structural": { "modifications": ["تقسيم إلى حلقات من 45-60 دقيقة"] },
    "pacing": { "cliffhangers": ["نقطة تشويق مقترحة لنهاية كل حلقة"] }
  },
  "platformSpecificFeatures": { 
    "episodicStructure": [{ 
      "episode": 1, 
      "summary": "ملخص الحلقة الأولى وأهدافها الدرامية" 
    }] 
  }
}
\`\`\`

**تعليمات إضافية:** يرجى تحديد المنصة المستهدفة في "المتطلبات الخاصة".
`;

export const platformAdapterAgentConfig: AIAgentConfig = {
  name: "PlatformAdapterAgent",
  description: "وكيل متخصص في تكييف المحتوى للمنصات الإعلامية المختلفة",
  category: TaskCategory.CREATIVE,
  taskType: TaskType.PLATFORM_ADAPTER,
  instructions: platformAdapterInstructions,
  capabilities: [
    "تكييف هيكلي للمحتوى",
    "تعديل الإيقاع والتوقيت",
    "استغلال خصائص المنصة",
    "التخطيط للعرض المرحلي"
  ]
};
