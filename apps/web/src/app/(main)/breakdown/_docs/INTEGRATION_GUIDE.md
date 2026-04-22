# دليل التكامل مع المنصة الأم

## نظرة عامة

تم تصميم تطبيق BreakBreak AI ليعمل كمساعد مستقل أو ليتم تكامله مع منصات إنتاج سينمائية أكبر.

## نقاط النهاية (API Endpoints)

### تحليل السيناريو

```typescript
// Import
import * as geminiService from "./services/geminiService";

// Segment a script into scenes
const response = await geminiService.segmentScript(scriptText);
// Returns: { scenes: [{ header: string, content: string }, ...] }
```

### تحليل المشهد الكامل

```typescript
// Analyze a single scene completely
const breakdown = await geminiService.analyzeScene(sceneContent);
// Returns: SceneBreakdown {
//   cast: CastMember[]
//   costumes: string[]
//   makeup: string[]
//   vehicles: string[]
//   locations: string[]
//   ... (and 6 more categories)
// }
```

### تحليل السيناريوهات الإنتاجية

```typescript
// Generate production scenarios with agent negotiations
const scenarios = await geminiService.analyzeProductionScenarios(sceneContent, {
  scenarioCount: 3,
  prioritizeBudget: false,
  prioritizeCreative: false,
  prioritizeSchedule: false,
});
// Returns: ScenarioAnalysis {
//   scenarios: [{
//     id: string
//     name: string
//     description: string
//     metrics: { budget, schedule, risk, creative }
//     agentInsights: { ... }
//   }, ...]
// }
```

### تحليل وكيل واحد

```typescript
// Run a specific agent's analysis
const analysis = await geminiService.runSingleAgent(
  "costumes", // agent key
  sceneContent
);
// Returns: SingleAgentAnalysis {
//   agentKey: string
//   analysis: string[]
//   suggestions: string[]
//   warnings: string[]
// }
```

## أنواع البيانات الرئيسية

### Scene

```typescript
interface Scene {
  id: number;
  header: string; // Scene heading/slugline
  content: string; // Full scene text
  isAnalyzed: boolean;
  analysis?: SceneBreakdown;
  scenarios?: ScenarioAnalysis;
  versions?: Version[]; // Version history
}
```

### SceneBreakdown

```typescript
interface SceneBreakdown {
  cast: CastMember[];
  costumes: string[];
  makeup: string[];
  graphics: string[];
  vehicles: string[];
  locations: string[];
  extras: string[];
  props: string[];
  stunts: string[];
  animals: string[];
  spfx: string[];
  vfx: string[];
}
```

### CastMember

```typescript
interface CastMember {
  name: string;
  role: string; // Lead, Supporting, Bit Part, etc.
  age: string;
  gender: string;
  description: string; // Visual description
  motivation: string; // Character motivation in scene
}
```

## معالجة الأخطاء

جميع الخدمات تشمل معالجة شاملة للأخطاء:

```typescript
try {
  const result = await geminiService.analyzeScene(sceneContent);
} catch (error) {
  console.error("Analysis failed:", error);
  // Error already logged with context
  // Error message is user-friendly
}
```

### رموز الخطأ الشائعة

| الخطأ                        | السبب                    | الحل                                |
| ---------------------------- | ------------------------ | ----------------------------------- |
| `GEMINI_API_KEY is required` | API key غير معيّن        | تعيين GEMINI_API_KEY في .env.local  |
| `Failed to segment script`   | صيغة السيناريو غير صحيحة | التحقق من تنسيق standard screenplay |
| `Network error`              | مشكلة في الاتصال         | التحقق من الاتصال بالإنترنت         |

## متطلبات البيئة

```dotenv
# Required
GEMINI_API_KEY=your_actual_key

# Optional (for backward compatibility)
API_KEY=your_actual_key
```

## استدعاء من تطبيق خارجي

### مثال: REST API Wrapper

```typescript
// api/breakdown.ts
export async function POST(req: Request) {
  const { scriptText } = await req.json();

  try {
    const scenes = await geminiService.segmentScript(scriptText);
    return Response.json(scenes);
  } catch (error) {
    return Response.json(
      { error: "Script processing failed" },
      { status: 500 }
    );
  }
}
```

### مثال: React Component Integration

```typescript
import * as geminiService from '@/services/geminiService';

export function ScriptAnalyzer() {
  const [script, setScript] = useState('');

  const handleAnalyze = async () => {
    try {
      const scenes = await geminiService.segmentScript(script);
      // Handle results
    } catch (error) {
      // Handle error
    }
  };

  return <div>{/* UI */}</div>;
}
```

## تدفق البيانات

```
User Input (Script)
    ↓
[segmentScript] → Scenes
    ↓
[analyzeScene] (for each scene) → SceneBreakdown
    ↓
[analyzeProductionScenarios] → Production Options
    ↓
[ChatBot] (User Q&A) ↔ AI Assistant
    ↓
Results & Export
```

## التوافقية والإصدارات

- **Node.js**: ≥ 16.0.0
- **Vite**: 6.0.0+
- **React**: 19.0.0+
- **TypeScript**: 5.8.0+
- **Gemini API**: 1.34.0+

## أفضل الممارسات

1. **معالجة الأخطاء**: استخدم دائماً try-catch عند استدعاء الخدمات
2. **التخزين المؤقت**: احفظ النتائج لتجنب استدعاءات API متكررة
3. **المصادقة**: لا تشارك API key في الكود المصدري
4. **الأداء**: استخدم Promise.all للاستدعاءات المتوازية
5. **التسجيل**: استخدم console.error و logError من config.ts

## الدعم والمساعدة

- اطلع على README.md للمزيد من المعلومات
- تحقق من console عند حدوث أي خطأ
- تأكد من صحة API key والاتصال بالإنترنت
