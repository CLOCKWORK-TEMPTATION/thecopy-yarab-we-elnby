# 🧠 Brain Storm AI - AI Agents System

## الغرض من هذا المجلد

هذا المجلد يحتوي على **نظام الوكلاء الذكية المتكامل** (AI Agents System) - مجموعة من الوكلاء المتخصصة لتحليل وتقييم وتوليد محتوى السيناريو.

## ✅ الحالة: جاهز للإنتاج

### التحققات:

- [x] الواجهة الأمامية مكتملة
- [x] API endpoints تعمل
- [x] نظام الوكلاء متكامل (28 وكيل)
- [x] التكامل مع المنصة الرئيسية
- [x] البطاقة في واجهة Launcher
- [x] التوثيق متوفر
- [x] الاختبارات موجودة

### كيفية التشغيل:

1. أضف API key في `.env.local`
   ```bash
   NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
   GOOGLE_GENAI_API_KEY=your_api_key_here
   ```
2. ابدأ الخادم: `pnpm dev` (من مجلد frontend)
3. افتح: `http://localhost:5000/brain-storm-ai`

### الميزات الكاملة:

✅ 28 وكيل ذكاء اصطناعي متخصص  
✅ 5 مراحل تطوير متتابعة  
✅ نظام نقاش متعدد الوكلاء  
✅ رفع ملفات (PDF, DOCX, TXT)  
✅ واجهة عربية كاملة  
✅ تتبع حالة الوكلاء في الوقت الفعلي

### الملفات المرجعية:

- 📖 **دليل المستخدم**: [USER_GUIDE.md](./USER_GUIDE.md)
- 📡 **توثيق API**: [API_DOCS.md](./API_DOCS.md)
- ⚙️ **متغيرات البيئة**: [.env.example](./.env.example)

---

## الحالة السابقة

✅ **PRODUCTION READY - جاهز للإنتاج**

هذا النظام:

- ✅ **مكتمل ومبرمج بالكامل** - جميع الوكلاء تعمل
- ✅ **متكامل مع Gemini API** - جاهز للاستخدام
- ✅ **متصل بالمنصة** - موجود في navigation و UI launcher
- ✅ **له كارت في الواجهة** - موقع #8 في `/ui` interface
- ✅ **API جاهز** - endpoint `/api/brainstorm` يعمل
- ✅ **Multi-agent debate system** - نظام النقاش المتعدد الوكلاء
- ✅ **File upload support** - دعم رفع ملفات PDF, DOCX, TXT
- ✅ **5-phase workflow** - سير عمل من 5 مراحل

## 🚀 كيفية الاستخدام

### الطريقة الأولى: من الواجهة الرئيسية

1. افتح الصفحة الرئيسية `/`
2. انقر على "فتح قائمة الأدوات" في المركز
3. اختر كارت "العصف الذهني" (موقع #8)

### الطريقة الثانية: مباشرة

1. اذهب إلى `/brain-storm-ai`
2. أدخل فكرتك الإبداعية أو ارفع ملف
3. اضغط "بدء جلسة"
4. تابع المراحل الخمس

### الطريقة الثالثة: من Navigation

- اختر "الورشة" من القائمة الجانبية

## البنية

```
brain-storm-ai/
├── agents/
│   ├── core/              # الوكلاء الأساسية والبنية التحتية
│   │   ├── integratedAgent.ts       # Base class لكل الوكلاء
│   │   ├── geminiService.ts         # Gemini API wrapper
│   │   └── fileReaderService.ts     # قراءة ملفات (PDF, DOCX)
│   │
│   ├── analysis/          # وكلاء التحليل (18 agent)
│   │   ├── analysisAgent.ts                    # تحليل شامل
│   │   ├── characterDeepAnalyzerAgent.ts       # تحليل عميق للشخصيات
│   │   ├── characterNetworkAgent.ts            # شبكة علاقات الشخصيات
│   │   ├── dialogueAdvancedAnalyzerAgent.ts    # تحليل متقدم للحوار
│   │   ├── thematicMiningAgent.ts              # استخراج الثيمات
│   │   ├── visualCinematicAnalyzerAgent.ts     # تحليل بصري سينمائي
│   │   └── ...
│   │
│   ├── generation/        # وكلاء التوليد (5 agents)
│   │   ├── completionAgent.ts                  # إكمال النصوص
│   │   ├── creativeAgent.ts                    # توليد إبداعي
│   │   ├── sceneGeneratorAgent.ts              # توليد مشاهد
│   │   ├── worldBuilderAgent.ts                # بناء عالم القصة
│   │   └── recommendationsGeneratorAgent.ts    # توصيات تطوير
│   │
│   ├── evaluation/        # وكلاء التقييم (2 agents)
│   │   ├── audienceResonanceAgent.ts           # تقييم صدى الجمهور
│   │   └── tensionOptimizerAgent.ts            # تحسين التوتر الدرامي
│   │
│   ├── transformation/    # وكلاء التحويل (3 agents)
│   │   ├── adaptiveRewritingAgent.ts           # إعادة كتابة تكيفية
│   │   ├── platformAdapterAgent.ts             # تكييف للمنصات
│   │   └── styleFingerprintAgent.ts            # البصمة الأسلوبية
│   │
│   └── instructions/      # System prompts (28+ files)
│       └── [agent_name]_instructions.ts        # تعليمات مفصلة لكل وكيل
│
├── services/              # خدمات مساعدة
│   ├── AnalysisService.ts              # خدمة التحليل
│   ├── agent-instructions.ts           # تحميل instructions
│   └── instructions-loader.ts          # Loader للـ prompts
│
├── lib/                   # مكتبات ومساعدات
│   ├── geminiTypes.ts                  # Type definitions لـ Gemini
│   └── __mocks__/                      # Mock data للاختبارات
│
└── config/                # الإعدادات
    ├── agents.ts                       # Model configs (temperature, tokens)
    ├── prompts.ts                      # System prompts مشتركة
    ├── environment.ts                  # متغيرات البيئة
    └── index.ts                        # Re-exports

```

## الوكلاء المتاحة

### 📊 Analysis Agents (18)

1. **Analysis Agent** - تحليل شامل للسيناريو
2. **Character Deep Analyzer** - تحليل عميق للشخصيات ودوافعها
3. **Character Network** - تحليل شبكة العلاقات
4. **Character Voice** - تحليل أسلوب كلام كل شخصية
5. **Dialogue Advanced Analyzer** - تحليل متقدم للحوار
6. **Dialogue Forensics** - تحليل forensics للحوار
7. **Conflict Dynamics** - تحليل ديناميكيات الصراع
8. **Cultural Historical Analyzer** - تحليل ثقافي وتاريخي
9. **Literary Quality Analyzer** - تقييم الجودة الأدبية
10. **Plot Predictor** - توقع مسار الحبكة
11. **Producibility Analyzer** - تحليل قابلية الإنتاج
12. **Rhythm Mapping** - تحليل إيقاع السرد
13. **Target Audience Analyzer** - تحديد الجمهور المستهدف
14. **Thematic Mining** - استخراج الثيمات الرئيسية
15. **Themes Messages Analyzer** - تحليل الرسائل والثيمات
16. **Visual Cinematic Analyzer** - تحليل اللغة البصرية السينمائية
17. **Style Fingerprint** - البصمة الأسلوبية للكاتب
18. **Recommendations Generator** - توليد توصيات تحسين

### 🎨 Generation Agents (5)

1. **Completion Agent** - إكمال حوار أو مشهد ناقص
2. **Creative Agent** - توليد أفكار إبداعية
3. **Scene Generator** - كتابة مشاهد كاملة جديدة
4. **World Builder** - تطوير تفاصيل عالم القصة
5. **Recommendations Generator** - توليد توصيات تطويرية

### ⚖️ Evaluation Agents (2)

1. **Audience Resonance** - تقييم تأثير السيناريو على الجمهور
2. **Tension Optimizer** - تحسين مستوى التشويق والتوتر

### 🔄 Transformation Agents (3)

1. **Adaptive Rewriting** - إعادة كتابة بأسلوب مختلف
2. **Platform Adapter** - تكييف لمنصات مختلفة (Netflix, MBC, etc.)
3. **Style Fingerprint** - تحليل وتقليد البصمة الأسلوبية

## 🔑 المتطلبات

### API Key (مطلوب)

```bash
# أضف في .env.local
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

للحصول على API key:

1. اذهب إلى [Google AI Studio](https://makersuite.google.com/app/apikey)
2. أنشئ API key جديد
3. انسخه وأضفه في ملف `.env.local`

### Dependencies (موجودة)

جميع المكتبات المطلوبة موجودة في `package.json`:

- `@google/generative-ai` - Gemini API
- `lucide-react` - Icons
- `shadcn/ui` - UI components

## كيفية التوصيل بالمحرر

لتفعيل هذا النظام:

### 1. تعديل `editor/config/agentConfigs.ts`

```typescript
import { analysisAgentConfig } from "../../brain-storm-ai/agents/analysis/analysisAgent";
import { creativeAgentConfig } from "../../brain-storm-ai/agents/generation/creativeAgent";
// ... import باقي الوكلاء

export const AGENT_CONFIGS: ReadonlyArray<AIAgentConfig> = Object.freeze([
  analysisAgentConfig,
  creativeAgentConfig,
  // ... باقي الوكلاء
]);
```

### 2. تحديث `AdvancedAgentsPopup.tsx`

الـ popup جاهز - فقط محتاج الـ configs تكون مملوءة.

### 3. إضافة API Key

في `environment.ts` أو `.env.local`:

```
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

## المميزات التقنية

- ✅ **TypeScript** - strongly typed
- ✅ **Modular Architecture** - كل agent منفصل
- ✅ **Gemini API Integration** - متكامل مع Google Gemini
- ✅ **File Processing** - معالجة PDF, DOCX, TXT
- ✅ **Multi-modal Support** - نصوص وملفات
- ✅ **Configurable** - temperature, tokens, prompts قابلة للتعديل
- ✅ **Testable** - بنية تسمح بـ unit testing

## الاستخدام المستقبلي

هذا النظام ممكن يُستخدم في:

1. **تطبيق منفصل** - Brain Storm AI كـ standalone app
2. **توصيل بالمحرر** - تفعيل الوكلاء في المحرر الحالي
3. **API Service** - تحويله لـ REST API
4. **CLI Tool** - أداة سطر أوامر للتحليل

---

**آخر تحديث:** 2026-01-09  
**الحالة:** جاهز للاستخدام - يحتاج فقط توصيل بالمحرر
