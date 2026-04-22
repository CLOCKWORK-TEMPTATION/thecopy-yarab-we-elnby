# 📡 Brain Storm AI - توثيق API

## نظرة عامة

توثيق شامل لـ API endpoint الخاص بمنصة العصف الذهني الذكي. يوفر هذا الـ endpoint واجهة للتفاعل مع نظام الوكلاء المتعددة للتطوير الإبداعي.

---

## 🔗 Endpoint الرئيسي

### POST `/api/brainstorm`

يقوم بتشغيل نظام النقاش المتعدد بين الوكلاء لتحليل وتطوير الأفكار الإبداعية.

**URL**: `/api/brainstorm`
**Method**: `POST`
**Content-Type**: `application/json`

---

## 📥 Request Body

### الحقول المطلوبة:

| الحقل      | النوع      | الوصف                               | مطلوب  |
| ---------- | ---------- | ----------------------------------- | ------ |
| `task`     | `string`   | المهمة أو السؤال المطلوب من الوكلاء | ✅ نعم |
| `agentIds` | `string[]` | قائمة بمعرفات الوكلاء المشاركين     | ✅ نعم |
| `context`  | `object`   | معلومات سياقية إضافية               | ❌ لا  |

### بنية Context:

```typescript
{
  brief?: string;          // ملخص الفكرة الأصلية
  phase?: number;          // رقم المرحلة الحالية (1-5)
  sessionId?: string;      // معرف الجلسة
  previousResults?: any;   // نتائج سابقة من مراحل سابقة
  userPreferences?: {      // تفضيلات المستخدم
    style?: string;
    tone?: string;
    targetAudience?: string;
  };
}
```

### مثال على Request:

```json
{
  "task": "تحليل الفكرة: عائلة سعودية تواجه تحديات التحول الرقمي",
  "agentIds": [
    "analysis-agent",
    "character-deep-analyzer",
    "dialogue-advanced-analyzer",
    "thematic-mining",
    "style-fingerprint",
    "recommendations-generator"
  ],
  "context": {
    "brief": "سيناريو درامي اجتماعي يدور حول عائلة سعودية...",
    "phase": 1,
    "sessionId": "session-1234567890",
    "userPreferences": {
      "tone": "جاد",
      "targetAudience": "عائلي"
    }
  }
}
```

---

## 📤 Response

### حالة النجاح (200 OK):

```typescript
{
  success: true;
  result: {
    proposals: Array<{
      agentId: string;           // معرف الوكيل
      proposal: string;          // الاقتراح/التحليل
      confidence: number;        // مستوى الثقة (0-1)
      reasoning: string;         // التبرير
      uncertaintyMetrics?: {     // مقاييس عدم اليقين
        type: string;
        confidence: number;
        evidenceStrength: number;
        alternativeViewpoints: string[];
      };
    }>;
    finalDecision?: string;      // القرار النهائي من الحكم
    judgeReasoning?: string;     // تبرير الحكم
    consensusLevel: number;      // مستوى التوافق (0-1)
    debateMetadata: {
      totalRounds: number;
      participatingAgents: number;
      averageConfidence: number;
      processingTime: number;    // بالميلي ثانية
    };
  };
}
```

### مثال على Response ناجح:

```json
{
  "success": true,
  "result": {
    "proposals": [
      {
        "agentId": "analysis-agent",
        "proposal": "السيناريو يعرض صراعاً جيلياً حول التكنولوجيا...",
        "confidence": 0.85,
        "reasoning": "التحليل مبني على دراسة البنية الدرامية والشخصيات",
        "uncertaintyMetrics": {
          "type": "epistemic",
          "confidence": 0.85,
          "evidenceStrength": 0.9,
          "alternativeViewpoints": []
        }
      },
      {
        "agentId": "character-deep-analyzer",
        "proposal": "الأب يمثل الجيل التقليدي بدوافع نفسية معقدة...",
        "confidence": 0.78,
        "reasoning": "تحليل عميق للشخصية الرئيسية وأبعادها النفسية",
        "uncertaintyMetrics": {
          "type": "epistemic",
          "confidence": 0.78,
          "evidenceStrength": 0.75,
          "alternativeViewpoints": ["قد يكون الصراع اقتصادي أكثر"]
        }
      }
    ],
    "finalDecision": "السيناريو قوي ويحتاج لتطوير أعمق للشخصيات الثانوية",
    "judgeReasoning": "بناءً على تحليل الوكلاء، الفكرة واضحة لكن تحتاج إثراء",
    "consensusLevel": 0.82,
    "debateMetadata": {
      "totalRounds": 3,
      "participatingAgents": 6,
      "averageConfidence": 0.81,
      "processingTime": 4523
    }
  }
}
```

---

## ❌ حالات الخطأ

### 400 Bad Request - طلب غير صحيح

```json
{
  "success": false,
  "error": "يرجى تقديم المهمة ومعرفات الوكلاء",
  "code": "MISSING_REQUIRED_FIELDS"
}
```

**الأسباب المحتملة**:

- حقل `task` فارغ أو غير موجود
- حقل `agentIds` فارغ أو ليس مصفوفة
- معرف وكيل غير صحيح

---

### 401 Unauthorized - غير مصرح

```json
{
  "success": false,
  "error": "لم يتم العثور على API key - يرجى إضافتها في ملف .env.local",
  "code": "MISSING_API_KEY"
}
```

**الحل**: تأكد من إضافة `NEXT_PUBLIC_GEMINI_API_KEY` في ملف `.env.local`

---

### 429 Too Many Requests - تجاوز الحد

```json
{
  "success": false,
  "error": "تم تجاوز الحد المسموح من الطلبات. يرجى المحاولة لاحقاً",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 60
}
```

**الحل**: انتظر `retryAfter` ثانية قبل المحاولة مرة أخرى

---

### 500 Internal Server Error - خطأ في الخادم

```json
{
  "success": false,
  "error": "فشل في معالجة الطلب",
  "code": "INTERNAL_ERROR",
  "details": "حدث خطأ أثناء تشغيل الوكلاء"
}
```

---

### 503 Service Unavailable - خدمة غير متاحة

```json
{
  "success": false,
  "error": "فشل الاتصال بخادم AI - تحقق من الاتصال بالإنترنت",
  "code": "AI_SERVICE_UNAVAILABLE"
}
```

**الأسباب المحتملة**:

- مشكلة في الاتصال بـ Google Gemini API
- API key غير صالح أو منتهي الصلاحية
- تجاوز حصة الاستخدام

---

### 504 Gateway Timeout - تجاوز الوقت

```json
{
  "success": false,
  "error": "تم تجاوز الحد الزمني - حاول بنص أقصر",
  "code": "TIMEOUT",
  "maxTimeout": 300000
}
```

**الحل**:

- قلل من طول النص المدخل
- قلل عدد الوكلاء المشاركين
- جرب المرحلة مرة أخرى

---

## 🔐 المصادقة والأمان

### API Key

يتطلب الـ endpoint وجود Google Gemini API key صالح. يجب إضافته في متغيرات البيئة:

```bash
NEXT_PUBLIC_GEMINI_API_KEY=your_api_key_here
```

### Rate Limiting

- **الحد الافتراضي**: 10 طلبات في الدقيقة
- **الجلسات المتزامنة**: 3 جلسات كحد أقصى للمستخدم الواحد

يمكن تعديل هذه القيم في `.env.local`:

```bash
RATE_LIMIT_PER_MINUTE=10
MAX_CONCURRENT_SESSIONS=3
```

### CORS

الـ API متاح فقط لنفس المنشأ (same-origin) ولا يدعم CORS للطلبات الخارجية.

---

## 📊 الوكلاء المتاحة

### قائمة معرفات الوكلاء:

#### وكلاء التحليل:

- `analysis-agent`
- `character-deep-analyzer`
- `character-network`
- `character-voice`
- `dialogue-advanced-analyzer`
- `dialogue-forensics`
- `conflict-dynamics`
- `cultural-historical-analyzer`
- `literary-quality-analyzer`
- `plot-predictor`
- `producibility-analyzer`
- `rhythm-mapping`
- `target-audience-analyzer`
- `thematic-mining`
- `themes-messages-analyzer`
- `visual-cinematic-analyzer`
- `style-fingerprint`
- `recommendations-generator`

#### وكلاء التوليد:

- `completion-agent`
- `creative-agent`
- `scene-generator`
- `world-builder`
- `recommendations-generator`

#### وكلاء التقييم:

- `audience-resonance`
- `tension-optimizer`

#### وكلاء التحويل:

- `adaptive-rewriting`
- `platform-adapter`
- `style-fingerprint`

---

## 🧪 أمثلة الاستخدام

### مثال 1: المرحلة الأولى (التحليل الأولي)

```javascript
const response = await fetch("/api/brainstorm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    task: "التحليل الأولي للبريف: عائلة سعودية تواجه تحديات التحول الرقمي",
    agentIds: [
      "analysis-agent",
      "character-deep-analyzer",
      "dialogue-advanced-analyzer",
      "thematic-mining",
      "style-fingerprint",
      "recommendations-generator",
    ],
    context: {
      brief: "سيناريو درامي اجتماعي...",
      phase: 1,
      sessionId: "session-1234567890",
    },
  }),
});

const data = await response.json();
console.log(data.result.proposals);
```

---

### مثال 2: المرحلة الثانية (التوسع الإبداعي)

```javascript
const response = await fetch("/api/brainstorm", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    task: "التوسع الإبداعي: تطوير أفكار جديدة للمشاهد",
    agentIds: [
      "creative-agent",
      "scene-generator",
      "world-builder",
      "conflict-dynamics",
      "rhythm-mapping",
      "literary-quality-analyzer",
      "target-audience-analyzer",
    ],
    context: {
      brief: "سيناريو درامي اجتماعي...",
      phase: 2,
      sessionId: "session-1234567890",
      previousResults: {
        /* نتائج المرحلة 1 */
      },
    },
  }),
});
```

---

### مثال 3: استخدام TypeScript

```typescript
interface BrainstormRequest {
  task: string;
  agentIds: string[];
  context?: {
    brief?: string;
    phase?: number;
    sessionId?: string;
    previousResults?: any;
  };
}

interface BrainstormResponse {
  success: boolean;
  result?: {
    proposals: Array<{
      agentId: string;
      proposal: string;
      confidence: number;
      reasoning: string;
    }>;
    finalDecision?: string;
    judgeReasoning?: string;
    consensusLevel: number;
  };
  error?: string;
  code?: string;
}

async function analyzeBrief(brief: string): Promise<BrainstormResponse> {
  const request: BrainstormRequest = {
    task: `تحليل الفكرة: ${brief}`,
    agentIds: ["analysis-agent", "character-deep-analyzer"],
    context: { brief, phase: 1, sessionId: `session-${Date.now()}` },
  };

  const response = await fetch("/api/brainstorm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  return await response.json();
}
```

---

## 🚀 Performance والتحسين

### نصائح للأداء الأمثل:

1. **قلل عدد الوكلاء**: استخدم فقط الوكلاء المناسبين للمرحلة الحالية
2. **استخدم التخزين المؤقت**: فعّل `ENABLE_CACHING=true`
3. **راقب الوقت**: تتبع `processingTime` في الـ metadata
4. **تعامل مع الأخطاء**: استخدم retry logic مع exponential backoff

### مثال على Retry Logic:

```javascript
async function brainstormWithRetry(request, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch("/api/brainstorm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });

      if (response.ok) {
        return await response.json();
      }

      if (response.status === 429) {
        // Rate limited - انتظر وأعد المحاولة
        await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }

      throw new Error(`API error: ${response.status}`);
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

---

## 📝 Changelog

### v1.0.0 (يناير 2026)

- ✅ إطلاق أول نسخة من API
- ✅ دعم 28 وكيل ذكاء اصطناعي
- ✅ نظام النقاش المتعدد
- ✅ دعم 5 مراحل تطوير

---

## 🔮 المستقبل

### ميزات مخططة:

- 🔄 WebSocket support للتحديثات الفورية
- 💾 حفظ واسترجاع الجلسات
- 📊 تحليلات وإحصائيات متقدمة
- 🌐 دعم لغات إضافية
- 🎯 وكلاء متخصصة إضافية

---

**آخر تحديث**: يناير 2026
**الإصدار**: 1.0.0
**الحالة**: ✅ مستقر
