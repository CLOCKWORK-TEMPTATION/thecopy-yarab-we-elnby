/**
 * السجل المركزي للتطبيقات المعروضة داخل المنصة.
 *
 * يجب أن يبقى هذا الملف هو المصدر المرجعي للمسارات المفعّلة ووصفها المختصر،
 * لأن مشغّل التطبيقات وصفحة الاستعراض العامة يعتمدان عليه مباشرة.
 *
 * قواعد الصيانة:
 * - كل path يجب أن يكون موجودًا في pages.manifest.json
 * - nameAr يجب أن يتطابق مع الاسم الإنجليزي في المعنى
 * - أي تطبيق يشير إلى route غير موجود → enabled: false
 */
export interface PlatformApp {
  id: string;
  name: string;
  nameAr: string;
  description: string;
  icon: string;
  path: string;
  color: string;
  category: "production" | "creative" | "analysis" | "management";
  enabled: boolean;
  badge?: string;
}

/**
 * قائمة التطبيقات التي تعرضها المنصة للمستخدم النهائي.
 *
 * أي إضافة أو إزالة هنا تؤثر مباشرة على:
 * - صفحة مشغّل التطبيقات (/ui)
 * - صفحة الاستعراض العام (/apps-overview)
 * - وثائق السطح العام للمستودع
 *
 * شرط الصحة: كل app بـ enabled:true يجب أن يكون path موجودًا
 * في pages.manifest.json. إذا لم يكن كذلك → enabled: false حتمًا.
 */
export const platformApps: PlatformApp[] = [
  {
    id: "breakdown",
    name: "ScriptBreakdown AI",
    nameAr: "تحليل السيناريو بالذكاء الاصطناعي",
    description:
      "تحليل النصوص السينمائية بـ 12 وكيل متخصص (ملابس، مؤثرات، مشاهد خطرة...)",
    icon: "🎬",
    path: "/breakdown",
    color: "from-purple-600 to-pink-600",
    category: "production",
    enabled: true,
    badge: "AI Powered",
  },
  {
    id: "budget",
    name: "FilmBudget AI",
    nameAr: "ميزانية الإنتاج",
    description: "إدارة ميزانية الإنتاج السينمائي بذكاء اصطناعي",
    icon: "💰",
    path: "/BUDGET",
    color: "from-green-600 to-emerald-600",
    category: "management",
    enabled: true,
  },
  {
    id: "editor",
    name: "Screenplay Editor",
    nameAr: "محرر السيناريو المتقدم",
    description: "محرر سيناريو احترافي مع دعم العربية والتنسيق الذكي",
    icon: "📝",
    path: "/editor",
    color: "from-blue-600 to-cyan-600",
    category: "creative",
    enabled: true,
  },
  {
    id: "directors-studio",
    name: "Director's Studio",
    nameAr: "استوديو المخرج",
    description: "مساحة عمل متكاملة لإدارة المشاريع والمشاهد",
    icon: "🎥",
    path: "/directors-studio",
    color: "from-orange-600 to-red-600",
    category: "management",
    enabled: true,
  },
  {
    id: "art-director",
    name: "CineArchitect AI",
    nameAr: "مدير الديكور والفن",
    description: "تصميم ديكورات سينمائية بمساعدة الذكاء الاصطناعي",
    icon: "🎨",
    path: "/art-director",
    color: "from-yellow-600 to-orange-500",
    category: "creative",
    enabled: true,
  },
  {
    id: "cinefit",
    name: "CineFit Pro",
    nameAr: "استوديو تصميم الأزياء السينمائية",
    description: "تصميم وتجربة الأزياء ثلاثية الأبعاد مع تحليل السلامة",
    icon: "👔",
    path: "/styleIST",
    color: "from-indigo-600 to-purple-600",
    category: "production",
    enabled: true,
    badge: "3D",
  },
  {
    id: "actor-ai",
    name: "ActorAI Studio",
    nameAr: "استوديو الممثل بالذكاء الاصطناعي",
    description: "أدوات ذكية لتدريب وتطوير أداء الممثلين",
    icon: "🎭",
    path: "/actorai-arabic",
    color: "from-pink-600 to-rose-600",
    category: "creative",
    enabled: true,
  },
  {
    id: "analysis",
    name: "Seven Stations Analysis",
    nameAr: "نظام المحطات السبع للتحليل",
    description: "تحليل درامي متقدم للسيناريوهات عبر 7 محطات متتابعة",
    icon: "🧠",
    path: "/analysis",
    color: "from-violet-600 to-purple-600",
    category: "analysis",
    enabled: true,
  },
  {
    // إصلاح: كان "Creative Writing Studio" / "ستوديو التحليل" — الاسمان متناقضان
    // والمسار /development يشير إلى صفحة تطوير النص الدرامي لا استوديو كتابة إبداعية.
    // الاسم الحالي معدَّل ليعكس ما تفعله الصفحة فعلًا (تحليل درامي آلي للنص).
    id: "script-development",
    name: "Script Development Lab",
    nameAr: "مختبر تطوير النص الدرامي",
    description:
      "تحليل درامي آلي فوري للنص استنادًا إلى أشهر الهياكل القصصية والنماذج الأدبية",
    icon: "✍️",
    path: "/development",
    color: "from-teal-600 to-cyan-600",
    category: "creative",
    enabled: true,
  },
  {
    id: "arabic-creative-writing-studio",
    name: "Arabic Creative Writing Studio",
    nameAr: "استوديو الكتابة الإبداعية العربية",
    description:
      "بيئة كتابة عربية متخصصة بالتجريب والتحرير وصناعة المسودات الإبداعية",
    icon: "✒️",
    path: "/arabic-creative-writing-studio",
    color: "from-fuchsia-600 to-rose-600",
    category: "creative",
    enabled: true,
    badge: "Arabic",
  },
  {
    id: "arabic-prompt-engineering-studio",
    name: "Arabic Prompt Engineering Studio",
    nameAr: "استوديو هندسة التوجيهات",
    description:
      "تحليل التوجيهات العربية ومقارنتها وبناء قوالب عملية قابلة لإعادة الاستخدام",
    icon: "🧪",
    path: "/arabic-prompt-engineering-studio",
    color: "from-sky-600 to-indigo-600",
    category: "analysis",
    enabled: true,
    badge: "Prompt Lab",
  },
  {
    id: "brainstorm",
    name: "Brain Storm AI",
    nameAr: "عصف ذهني بالذكاء الاصطناعي",
    description: "توليد أفكار إبداعية باستخدام الذكاء الاصطناعي",
    icon: "💡",
    path: "/brain-storm-ai",
    color: "from-amber-600 to-yellow-500",
    category: "creative",
    enabled: true,
  },
  {
    id: "cinematography",
    name: "Cinematography Studio",
    nameAr: "استوديو التصوير السينمائي",
    description: "أدوات تخطيط وتحليل اللقطات السينمائية",
    icon: "📹",
    path: "/cinematography-studio",
    color: "from-slate-600 to-gray-600",
    category: "production",
    enabled: true,
  },
  {
    id: "metrics-dashboard",
    name: "Metrics Dashboard",
    nameAr: "لوحة المقاييس",
    description: "مراقبة صحة النظام والأداء والموارد من واجهة تشغيل واحدة",
    icon: "📊",
    path: "/metrics-dashboard",
    color: "from-emerald-600 to-teal-600",
    category: "management",
    enabled: true,
    badge: "Ops",
  },
  {
    id: "breakapp",
    name: "BreakApp - Runner Management",
    nameAr: "إدارة المساعدين والطلبات",
    description: "نظام إدارة طلبات التصوير وتتبع المساعدين بالخرائط",
    icon: "🏃",
    path: "/BREAKAPP",
    color: "from-red-600 to-orange-600",
    category: "management",
    enabled: true,
    badge: "GPS Tracking",
  },
  {
    // إصلاح: المسار /brainstorm غير موجود في pages.manifest.json ولا في filesystem.
    // لا يوجد app/(main)/brainstorm — disabled حتى يُنشأ الـ route الفعلي.
    id: "brainstorm-ai",
    name: "Multi-Agent Brainstorm",
    nameAr: "العصف الذهني بالوكلاء المتعددين",
    description:
      "نقاش حقيقي بين وكلاء ذكاء اصطناعي متعددين لتطوير الأفكار الإبداعية عبر 5 مراحل",
    icon: "🤖",
    path: "/brainstorm",
    color: "from-cyan-600 to-blue-600",
    category: "creative",
    enabled: false,
    badge: "قريبًا",
  },
];

/**
 * المسارات التي يعرضها المشغّل الرئيسي (12 بطاقة حول الهيرو في /ui).
 *
 * قاعدة: كل مسار هنا يجب أن يكون في platformApps بحالة enabled:true.
 * يتم التحقق من هذا الشرط في apps.config.test.ts تلقائيًا.
 */
export const FEATURED_APP_PATHS = [
  "/breakdown",
  "/BUDGET",
  "/editor",
  "/directors-studio",
  "/art-director",
  "/styleIST",
  "/actorai-arabic",
  "/analysis",
  "/development",
  "/cinematography-studio",
  "/BREAKAPP",
  "/brain-storm-ai",
] as const;

export type FeaturedAppPath = (typeof FEATURED_APP_PATHS)[number];

/**
 * يعيد تعريف تطبيق واحد حسب المعرّف الداخلي.
 */
export function getAppById(id: string): PlatformApp | undefined {
  return platformApps.find((app) => app.id === id);
}

/**
 * يعيد جميع التطبيقات المنتمية إلى فئة واحدة دون تصفية حالة التفعيل.
 */
export function getAppsByCategory(
  category: PlatformApp["category"]
): PlatformApp[] {
  return platformApps.filter((app) => app.category === category);
}

/**
 * يعيد التطبيقات المفعلة فقط داخل فئة محددة.
 */
export function getEnabledAppsByCategory(
  category: PlatformApp["category"]
): PlatformApp[] {
  return platformApps.filter((app) => app.category === category && app.enabled);
}

/**
 * يعيد جميع التطبيقات المفعلة التي يجب أن تظهر للمستخدم حاليًا.
 */
export function getEnabledApps(): PlatformApp[] {
  return platformApps.filter((app) => app.enabled);
}
