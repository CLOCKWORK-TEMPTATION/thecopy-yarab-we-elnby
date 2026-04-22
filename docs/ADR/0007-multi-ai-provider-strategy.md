# ADR-0007: استراتيجية متعددة مزودي AI

## الحالة

مقبول

## السياق

"النسخة" منصة سينمائية تعتمد على AI في صميم عملها: تحليل السكريبتات، توليد الحوارات، تقييم المشاهد، اقتراح اللقطات، ومساعدة المخرجين الإبداعية. الاعتماد على مزود AI واحد يُنشئ نقطة فشل واحدة ويُقيّد الاختيار.

بيانات من `package.json` تُظهر أن الاختيار ليس أكاديميًا: الكود يستورد فعلًا من OpenAI وAnthropic وGoogle GenAI وMistral وGroq، مستخدمًا كلًا منها عبر LangChain أو مباشرةً عبر حزمة `ai` (Vercel AI SDK).

## القرار

اعتمدنا **استراتيجية متعددة المزودين**: OpenAI + Anthropic + Google GenAI + Mistral + Groq، مع **LangChain** كطبقة abstraction موحّدة للخادوم، و**Vercel AI SDK** (`ai`) للتكامل مع تدفق الاستجابة في كلا التطبيقين.

الدليل من الكود:

الخادوم (`apps/backend/package.json`):
- `"@langchain/openai"`, `"@langchain/anthropic"`, `"@langchain/google-genai"`, `"@langchain/core"` لـ chain building.
- `"@ai-sdk/openai"` و`"ai"` (Vercel AI SDK) للـ streaming.
- `"@mistralai/mistralai"` للوصول المباشر لـ Mistral.
- `"@google/genai"` و`"@google/generative-ai"` (نسختان لأغراض مختلفة).

تطبيق الويب (`apps/web/package.json`):
- `"@ai-sdk/anthropic"`, `"@ai-sdk/openai"` لـ Server Actions.
- `"@genkit-ai/google-genai"`, `"genkit"` لـ Firebase Genkit workflows.
- `"groq-sdk"` للنماذج السريعة منخفضة التكلفة.
- `"@mistralai/mistralai"` للنماذج المتخصصة.

## البدائل المدروسة

| البديل | المزايا | العيوب |
|---|---|---|
| **OpenAI فقط** | بساطة الإعداد، توثيق ممتاز، نماذج متعددة | تبعية كاملة لطرف واحد، تغيير الأسعار أو سياسات الاستخدام يؤثر مباشرة |
| **Anthropic فقط** | نماذج ممتازة للمهام الإبداعية | حصص أكثر تقييدًا، لا embedding models خاصة |
| **نموذج مفتوح المصدر (self-hosted)** | لا تكاليف API، خصوصية تامة | تكلفة بنية تحتية عالية، جودة أدنى لمهام الإبداع العربي |
| **مزود واحد مع LangChain** | abstraction جاهز | يُفقد الفائدة الرئيسية من LangChain وهي الاستبدال السريع |

## النتائج

### إيجابية
- **مرونة الاختيار**: يمكن توجيه مهام محددة لنماذج متخصصة؛ Groq للسرعة، Anthropic للإبداع المعقد، Google GenAI لمعالجة السياق الطويل.
- **تجنّب انقطاع الخدمة**: إذا توقف مزود، يمكن التحويل لآخر دون تغيير الشيفرة إذا استُخدمت LangChain كـ abstraction.
- **مقارنة الجودة**: بإمكان المطورين اختبار نفس المهمة على أكثر من نموذج وقياس الجودة.
- **Firebase Genkit في الويب**: يوفر orchestration مُنظّم لـ workflows AI مع tracing مدمج.
- **مراقبة التكاليف**: `gemini-cost-tracker.service` مُخصص لمراقبة تكاليف Google GenAI، مما يُشير إلى وعي بتكاليف متعددة المصادر.

### سلبية
- **تعقيد التبعيات**: ثماني حزم AI أو أكثر في كل من الخادوم وتطبيق الويب تزيد حجم الحزم ووقت التثبيت.
- **تنسيقات استجابة متباينة**: كل مزود له schema خاص للاستجابة؛ LangChain يُوحّدها جزئيًا لكن ليس بالكامل.
- **إدارة مفاتيح متعددة**: يتطلب الاحتفاظ بـ API keys وسياسات تدوير لكل مزود.
- **نسختان من Google GenAI**: `@google/genai` و`@google/generative-ai` موجودتان معًا في عدة packages، مما قد يُسبب تضاربًا مستقبليًا.

## الملفات المتأثرة

- `/apps/backend/src/services/` (خدمات AI المختلفة)
- `/apps/backend/src/services/gemini-cost-tracker.service.ts`
- `/apps/backend/src/controllers/ai.controller.ts`
- `/apps/backend/src/queues/jobs/ai-analysis.job.ts`
- `/apps/web/src/ai/` (genkit workflows)
- `/packages/shared/src/ai/` (أنواع مشتركة)
