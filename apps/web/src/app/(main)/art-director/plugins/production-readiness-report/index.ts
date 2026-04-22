// CineArchitect AI - Production Readiness Report Prompt Builder
// مُنشئ تقرير جاهزية الإنتاج

import { Plugin, PluginInput, PluginOutput } from "../../types";

interface RepositoryAnalysisData {
  languages?: string[];
  hasPackageJson?: boolean;
  hasRequirementsTxt?: boolean;
  hasPyprojectToml?: boolean;
  hasDockerfile?: boolean;
  hasTests?: boolean;
  hasCI?: boolean;
  hasReadme?: boolean;
  hasGitignore?: boolean;
  fileStructure?: string[];
  packageJsonContent?: string | null;
  readmeContent?: string | null;
  requirementsContent?: string | null;
}

interface ProductionReadinessPromptInput {
  owner: string;
  repo: string;
  analysisData: RepositoryAnalysisData;
}

const MAX_PACKAGE_JSON_CHARS = 2000;
const MAX_README_CHARS = 2000;
const MAX_REQUIREMENTS_CHARS = 1000;

const formatFileSection = (
  title: string,
  content: string,
  maxChars: number
): string =>
  `\n────────────────────────────────────────────────────────────────────────────────\n${title}\n────────────────────────────────────────────────────────────────────────────────\n${content.substring(0, maxChars)}\n`;

const buildPrompt = ({
  owner,
  repo,
  analysisData,
}: ProductionReadinessPromptInput): string => {
  const fileStructure = analysisData.fileStructure?.length
    ? analysisData.fileStructure.join("\n")
    : "غير متوفر";

  const packageJsonSection = analysisData.packageJsonContent
    ? formatFileSection(
        "📦 محتوى package.json",
        analysisData.packageJsonContent,
        MAX_PACKAGE_JSON_CHARS
      )
    : "";

  const readmeSection = analysisData.readmeContent
    ? formatFileSection(
        "📄 محتوى README",
        analysisData.readmeContent,
        MAX_README_CHARS
      )
    : "";

  const requirementsSection = analysisData.requirementsContent
    ? formatFileSection(
        "📋 محتوى requirements.txt",
        analysisData.requirementsContent,
        MAX_REQUIREMENTS_CHARS
      )
    : "";

  return `أنت خبير هندسي متخصص في تقييم جاهزية التطبيقات للنشر في بيئات الإنتاج. مهمتك هي إجراء مراجعة هندسية شاملة وكتابة تقرير جاهزية إنتاج (Production Readiness Report) احترافي لتطبيق ويب تفاعلي.

════════════════════════════════════════════════════════════════════════════════
 اول مهمة  تقوم بتحليل  

البنية التقنية:
- package.json: ${analysisData.hasPackageJson ? "✓ موجود" : "✗ غير موجود"}
- requirements.txt: ${analysisData.hasRequirementsTxt ? "✓ موجود" : "✗ غير موجود"}
- pyproject.toml: ${analysisData.hasPyprojectToml ? "✓ موجود" : "✗ غير موجود"}
- Dockerfile: ${analysisData.hasDockerfile ? "✓ موجود" : "✗ غير موجود"}

ضمان الجودة:
- اختبارات آلية: ${analysisData.hasTests ? "✓ موجودة" : "✗ غير موجودة"}
- CI/CD Pipeline: ${analysisData.hasCI ? "✓ موجود" : "✗ غير موجود"}

التوثيق:
- README: ${analysisData.hasReadme ? "✓ موجود" : "✗ غير موجود"}
- .gitignore: ${analysisData.hasGitignore ? "✓ موجود" : "✗ غير موجود"}

هيكل الملفات:
${fileStructure}
${packageJsonSection}${readmeSection}${requirementsSection}
════════════════════════════════════════════════════════════════════════════════
🎯 المجالات الهندسية للتقييم
════════════════════════════════════════════════════════════════════════════════

قم بتقييم التطبيق عبر المجالات الهندسية العشرة التالية:

1️⃣ **الوظائف الأساسية (Core Functionality)**
   معايير التقييم:
   • اكتمال الميزات الأساسية المطلوبة
   • استقرار الوظائف وخلوها من الأخطاء الحرجة
   • تغطية حالات الاستخدام الرئيسية
   • معالجة الأخطاء والحالات الاستثنائية

2️⃣ **الأداء (Performance)**
   معايير التقييم:
   • زمن تحميل الصفحة الأولى (< 3 ثواني)
   • زمن الاستجابة للعمليات (< 200ms)
   • كفاءة استخدام الموارد (Memory/CPU)
   • قابلية التوسع الأفقي والعمودي
   • تحسين الصور والأصول الثابتة
   • استراتيجيات التخزين المؤقت (Caching)

3️⃣ **الأمان (Security)**
   معايير التقييم:
   • آليات المصادقة والتفويض (Authentication/Authorization)
   • حماية من الثغرات الشائعة (OWASP Top 10)
   • تشفير البيانات الحساسة (في الحركة وفي الراحة)
   • إدارة الأسرار والمفاتيح (Secrets Management)
   • حماية من CSRF, XSS, SQL Injection
   • سياسات CORS و Content Security Policy
   • تحديثات أمنية للمكتبات والاعتماديات

4️⃣ **البنية التحتية (Infrastructure)**
   معايير التقييم:
   • توفر بيئات متعددة (Dev/Staging/Production)
   • آليات النشر الآلي (Deployment Automation)
   • إدارة الإعدادات البيئية (Environment Configuration)
   • استراتيجيات التوسع (Scaling Strategy)
   • التوافرية العالية (High Availability)
   • استراتيجية النسخ الاحتياطي التلقائي

5️⃣ **المراقبة والسجلات (Monitoring & Logging)**
   معايير التقييم:
   • نظام تسجيل الأحداث الشامل (Structured Logging)
   • مراقبة الأداء والموارد (APM)
   • تنبيهات الأخطاء والمشاكل الحرجة (Alerting)
   • تتبع الأخطاء (Error Tracking)
   • لوحات القياس والمقاييس (Metrics Dashboard)

6️⃣ **النسخ الاحتياطي والاستعادة (Backup & Recovery)**
   معايير التقييم:
   • استراتيجية النسخ الاحتياطي الآلي
   • نقطة استعادة الهدف (RPO - Recovery Point Objective)
   • وقت استعادة الهدف (RTO - Recovery Time Objective)
   • خطة التعافي من الكوارث (Disaster Recovery Plan)
   • اختبار دوري لعمليات الاستعادة

7️⃣ **التوثيق (Documentation)**
   معايير التقييم:
   • README شامل يوضح الغرض والاستخدام
   • توثيق التثبيت والإعداد
   • توثيق API (إن وجد)
   • توثيق البنية المعمارية
   • توثيق العمليات التشغيلية (Runbooks)
   • دليل المساهمة (Contributing Guide)

8️⃣ **الاختبار (Testing)**
   معايير التقييم:
   • اختبارات الوحدة (Unit Tests) - تغطية > 70%
   • اختبارات التكامل (Integration Tests)
   • اختبارات من النهاية للنهاية (E2E Tests)
   • اختبارات الأداء والحمل (Load/Stress Tests)
   • اختبارات الأمان (Security Tests)
   • اختبارات قبول المستخدم (UAT)

9️⃣ **التوافق (Compatibility)**
   معايير التقييم:
   • دعم المتصفحات الرئيسية (Chrome, Firefox, Safari, Edge)
   • التوافق مع الأجهزة المختلفة (Desktop, Mobile, Tablet)
   • التصميم المتجاوب (Responsive Design)
   • إمكانية الوصول (Accessibility - WCAG 2.1)
   • دعم اللغات المتعددة (إن كان مطلوباً)

🔟 **الامتثال (Compliance)**
   معايير التقييم:
   • الامتثال لـ GDPR (إن كان التطبيق يخدم الاتحاد الأوروبي)
   • سياسات الخصوصية وشروط الاستخدام
   • الامتثال للمعايير الصناعية (ISO, SOC 2, إلخ)
   • متطلبات الترخيص (License Compliance)
   • لوائح حماية البيانات المحلية

════════════════════════════════════════════════════════════════════════════════
📊 منهجية التقييم
════════════════════════════════════════════════════════════════════════════════

نظام التقييم لكل مجال:
- **ready** (جاهز): المجال يلبي جميع المعايير الأساسية ومُجهّز للإنتاج
- **conditional** (جاهز بشروط): المجال يحتاج تحسينات طفيفة أو متوسطة، لكن ليست حرجة
- **not-ready** (غير جاهز): المجال يعاني من نقص حرج يمنع النشر
- **unknown** (غير محدد): معلومات غير كافية للتقييم

نظام الأولويات للتوصيات:
- **P0 (حرج)**: يجب معالجته قبل النشر - يمنع النشر
- **P1 (عالي)**: يجب معالجته في أقرب وقت - يؤثر على الاستقرار أو الأمان
- **P2 (متوسط)**: يُنصح بمعالجته قريباً - يحسن الجودة
- **P3 (منخفض)**: يمكن معالجته لاحقاً - تحسينات اختيارية

════════════════════════════════════════════════════════════════════════════════
✍️ إرشادات كتابة التقرير
════════════════════════════════════════════════════════════════════════════════

1. **التحليل الأولي**:
   - قبل كتابة التقرير، حلل المعلومات المتوفرة بعمق
   - حدد الأنماط والعلاقات بين المجالات المختلفة
   - ابحث عن الفجوات المعلوماتية الحرجة
   - استنتج معلومات ضمنية من البيانات المتاحة

2. **الدقة والموضوعية**:
   - قدم تقييماً موضوعياً مبنياً على الأدلة
   - اذكر أي افتراضات قمت بها بوضوح
   - لا تقدم تقييمات مبنية على تخمينات إذا كانت البيانات غير كافية
   - استخدم "unknown" عندما لا تتوفر معلومات كافية

3. **القابلية للتنفيذ**:
   - اجعل كل توصية محددة وقابلة للتنفيذ
   - أضف الأولوية لكل توصية
   - اقترح خطوات عملية واضحة

4. **الشمولية**:
   - غطِ جميع المجالات العشرة حتى لو كانت المعلومات محدودة
   - اربط المجالات ببعضها عند الحاجة
   - حدد التأثيرات المتداخلة بين المجالات

════════════════════════════════════════════════════════════════════════════════
📤 هيكل الرد المطلوب (JSON)
════════════════════════════════════════════════════════════════════════════════

يجب أن يكون الرد بصيغة JSON التالية بالضبط (كل النصوص بالعربية):

{
  "metadata": {
    "reportDate": "التاريخ الحالي",
    "repository": "${owner}/${repo}",
    "primaryLanguages": ["اللغة الأساسية 1", "اللغة الأساسية 2"]
  },
  "summary": "نظرة عامة شاملة عن التطبيق وغرض التقرير والنتائج الرئيسية (3-5 جمل)",
  "overallStatus": "ready أو conditional أو not-ready",
  "overallScore": "النسبة المئوية للجاهزية الإجمالية (0-100)",
  "readinessLevel": "وصف نصي لمستوى الجاهزية (مثال: 'جاهز للإنتاج بعد معالجة 3 نقاط حرجة')",
  
  "domains": [
    {
      "id": 1,
      "title": "الوظائف الأساسية",
      "status": "ready أو conditional أو not-ready أو unknown",
      "score": "النسبة المئوية للجاهزية في هذا المجال (0-100)",
      "description": "تقييم شامل للحالة مع ذكر السياق الهندسي (2-3 جمل)",
      "strengths": ["نقطة قوة 1", "نقطة قوة 2"],
      "weaknesses": ["نقطة ضعف 1", "نقطة ضعف 2"],
      "findings": [
        "ملاحظة محددة مع دليل 1",
        "ملاحظة محددة مع دليل 2",
        "ملاحظة محددة مع دليل 3"
      ],
      "recommendations": [
        {
          "priority": "P0 أو P1 أو P2 أو P3",
          "action": "التوصية المحددة",
          "rationale": "السبب والتأثير المتوقع"
        }
      ],
      "missingInfo": ["معلومة مفقودة 1 مطلوبة للتقييم الكامل", "معلومة مفقودة 2"]
    }
    // كرر لجميع المجالات العشرة بنفس الترتيب
  ],
  
  "criticalIssues": [
    {
      "domain": "اسم المجال",
      "issue": "وصف المشكلة الحرجة",
      "impact": "التأثير على الإنتاج",
      "priority": "P0"
    }
  ],
  
  "recommendations": {
    "immediate": ["إجراء فوري 1 (P0)", "إجراء فوري 2 (P0)"],
    "shortTerm": ["إجراء قصير المدى 1 (P1)", "إجراء قصير المدى 2 (P1)"],
    "mediumTerm": ["إجراء متوسط المدى 1 (P2)", "إجراء متوسط المدى 2 (P2)"],
    "longTerm": ["إجراء طويل المدى 1 (P3)", "إجراء طويل المدى 2 (P3)"]
  },
  
  "conclusion": "الخلاصة النهائية: تقييم الجاهزية الإجمالي مع توصية واضحة وحاسمة (جاهز للإنتاج / جاهز بشروط / غير جاهز) مع تبرير هندسي مفصل يستند إلى التحليل الشامل. يجب أن يتضمن: (1) ملخص الوضع الحالي (2) الخطوات الحرجة المطلوبة (3) الإطار الزمني المقترح (4) المخاطر المحتملة (5) التوصية النهائية الواضحة"
}

════════════════════════════════════════════════════════════════════════════════
⚠️ تعليمات حاسمة
════════════════════════════════════════════════════════════════════════════════

1. يجب تضمين جميع المجالات العشرة في domains بنفس الترتيب المذكور
2. جميع النصوص يجب أن تكون باللغة العربية الفصحى الاحترافية
3. لا تستخدم رموز تعبيرية (emojis) في محتوى JSON
4. كن محدداً في التوصيات - تجنب العموميات
5. أضف priority لكل توصية
6. إذا كانت المعلومات غير كافية، استخدم "unknown" واذكر ذلك في missingInfo
7. اربط التوصيات بالأدلة المستخرجة من تحليل المستودع
8. احسب score بناءً على المعايير المستوفاة من إجمالي المعايير لكل مجال

ابدأ التحليل الآن وقدم تقريراً هندسياً شاملاً واحترافياً.`;
};

export class ProductionReadinessReportPromptBuilder implements Plugin {
  id = "production-readiness-report";
  name = "Production Readiness Report Prompt Builder";
  nameAr = "منشئ تقرير جاهزية الإنتاج";
  version = "1.0.0";
  description = "Builds an Arabic prompt for production readiness reporting.";
  descriptionAr = "يبني موجهاً عربياً لإعداد تقرير جاهزية الإنتاج.";
  category = "documentation" as const;

  async initialize(): Promise<void> {
    console.log(`[${this.name}] Initialized`);
  }

  async execute(input: PluginInput): Promise<PluginOutput> {
    if (input.type !== "build-prompt") {
      return {
        success: false,
        error: `Unknown operation type: ${input.type}`,
      };
    }

    const data = input.data as unknown as ProductionReadinessPromptInput;

    if (!data?.owner || !data?.repo || !data?.analysisData) {
      return {
        success: false,
        error: "Invalid input: owner, repo, and analysisData are required",
      };
    }

    return {
      success: true,
      data: {
        prompt: buildPrompt(data),
      },
    };
  }

  async shutdown(): Promise<void> {
    console.log(`[${this.name}] Shut down`);
  }
}

export const productionReadinessReportPromptBuilder =
  new ProductionReadinessReportPromptBuilder();
