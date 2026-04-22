/**
 * @fileoverview الثوابت والبيانات الثابتة لاستوديو الممثل الذكي
 * هذا الملف يحتوي على جميع القيم الثابتة والبيانات التجريبية
 * لفصلها عن منطق المكونات وتسهيل الصيانة والتحديث
 */

import type {
  VocalExercise,
  ActingMethodology,
  ARFeature,
  GestureControl,
} from "../types/index";

// ==================== نص تجريبي للعرض ====================

/**
 * نص تجريبي لاختبار ميزات التطبيق
 * @description مشهد رومانسي كلاسيكي يُستخدم للعرض التوضيحي
 */
export const SAMPLE_SCRIPT = `المشهد الأول - حديقة المنزل - ليلاً

يقف أحمد تحت شرفة ليلى، ينظر إليها بشوق.

أحمد:
يا ليلى، يا قمر الليل، أنتِ نور عيني وروحي.
كيف أستطيع أن أعيش بعيداً عنكِ؟

تظهر ليلى على الشرفة.

ليلى:
يا أحمد، قلبي معك، لكن العائلة تقف بيننا.
ماذا سنفعل؟

أحمد:
سأجد طريقة، مهما كانت الصعوبات.
حبنا أقوى من كل العوائق.`;

/**
 * نص تجريبي لاختبار الحفظ
 */
export const SAMPLE_MEMORIZATION_SCRIPT = `أكون أو لا أكون، ذلك هو السؤال
هل من الأنبل في العقل أن نحتمل
سهام القدر الجائر ورماحه
أم أن نتسلح ضد بحر من المتاعب
وبالمقاومة ننهيها؟`;

// ==================== تمارين الصوت ====================

/**
 * قائمة تمارين الصوت المتاحة
 * @description مجموعة متنوعة من التمارين الصوتية للممثلين
 * @reason توفر تدريباً شاملاً للتنفس والنطق والإسقاط الصوتي
 */
export const VOCAL_EXERCISES: VocalExercise[] = [
  {
    id: "1",
    name: "تمرين التنفس العميق",
    description:
      "استنشق ببطء لمدة 4 ثوان، احبس النفس 4 ثوان، ثم أخرج الهواء لمدة 4 ثوان",
    duration: "5 دقائق",
    category: "breathing",
  },
  {
    id: "2",
    name: "تمرين الحروف المتحركة",
    description:
      "ردد الحروف: آ - إي - أو - إييي - أووو مع التركيز على وضوح كل حرف",
    duration: "3 دقائق",
    category: "articulation",
  },
  {
    id: "3",
    name: "تمرين الإسقاط الصوتي",
    description:
      "تخيل أن صوتك يصل لنهاية القاعة، ردد جملة 'أنا هنا' بصوت واضح ومُسقَط",
    duration: "4 دقائق",
    category: "projection",
  },
  {
    id: "4",
    name: "تمرين الرنين",
    description:
      "أغلق فمك وهمهم بصوت 'ممممم' مع الشعور بالاهتزاز في الوجه والصدر",
    duration: "3 دقائق",
    category: "resonance",
  },
  {
    id: "5",
    name: "أعاصير اللسان",
    description: "ردد بسرعة: 'قرقر القمري فوق قمة القرية' - كرر 5 مرات",
    duration: "2 دقائق",
    category: "articulation",
  },
  {
    id: "6",
    name: "تمرين الحجاب الحاجز",
    description:
      "ضع يدك على بطنك، استنشق حتى تشعر ببطنك يرتفع، ثم أخرج الهواء مع صوت 'هااا'",
    duration: "4 دقائق",
    category: "breathing",
  },
];

// ==================== المنهجيات التمثيلية ====================

/**
 * قائمة المنهجيات التمثيلية المدعومة
 * @description الطرق والمدارس التمثيلية المشهورة
 */
export const ACTING_METHODOLOGIES: ActingMethodology[] = [
  {
    id: "stanislavsky",
    name: "طريقة ستانيسلافسكي",
    nameEn: "Stanislavsky Method",
  },
  {
    id: "meisner",
    name: "تقنية مايسنر",
    nameEn: "Meisner Technique",
  },
  {
    id: "chekhov",
    name: "تقنية مايكل تشيخوف",
    nameEn: "Michael Chekhov",
  },
  {
    id: "hagen",
    name: "أوتا هاجن",
    nameEn: "Uta Hagen",
  },
  {
    id: "practical",
    name: "الجماليات العملية",
    nameEn: "Practical Aesthetics",
  },
];

// ==================== ميزات AR/MR ====================

/**
 * ميزات الواقع المعزز/المختلط المتاحة
 * @description قائمة أدوات التدريب بتقنية AR/MR
 */
export const AR_FEATURES: ARFeature[] = [
  {
    id: "teleprompter",
    name: "Teleprompter معلق",
    description: "نص معلق في الفراغ يتبع نظرتك مع التمرير التلقائي",
    icon: "📜",
    status: "ready",
  },
  {
    id: "blocking",
    name: "علامات Blocking",
    description: "علامات ثلاثية الأبعاد على الأرض لتحديد مواقع الحركة",
    icon: "🎯",
    status: "ready",
  },
  {
    id: "camera_eye",
    name: "عين الكاميرا",
    description: "إطار كاميرا افتراضي لفهم الـ Framing والتكوين",
    icon: "📷",
    status: "ready",
  },
  {
    id: "holographic_partner",
    name: "شريك هولوغرافي",
    description: "شخصية ثلاثية الأبعاد للتدريب على المشاهد الثنائية",
    icon: "👤",
    status: "ready",
  },
  {
    id: "gesture_control",
    name: "تحكم بالإيماءات",
    description: "تحكم بالعين واليد والرأس والصوت",
    icon: "👁️",
    status: "ready",
  },
];

// ==================== أنواع اللقطات السينمائية ====================

/**
 * أنواع اللقطات السينمائية
 */
export const SHOT_TYPES = [
  { id: "extreme_wide", name: "لقطة واسعة جداً", nameEn: "Extreme Wide Shot" },
  { id: "wide", name: "لقطة واسعة", nameEn: "Wide Shot" },
  { id: "medium", name: "لقطة متوسطة", nameEn: "Medium Shot" },
  { id: "closeup", name: "لقطة قريبة", nameEn: "Close-up" },
] as const;

// ==================== إيماءات التحكم ====================

/**
 * إعدادات التحكم بالإيماءات الافتراضية
 * @description تعريفات الإيماءات وإجراءاتها المرتبطة
 */
export const GESTURE_CONTROLS: GestureControl[] = [
  { type: "eye", action: "النظر للأعلى = تمرير النص", enabled: true },
  { type: "eye", action: "الرمش المزدوج = إيقاف/تشغيل", enabled: true },
  { type: "hand", action: "رفع اليد = إيقاف الشريك", enabled: true },
  { type: "hand", action: "إشارة OK = استمرار", enabled: true },
  { type: "head", action: "إيماءة الرأس = الموافقة", enabled: true },
  { type: "voice", action: "'توقف' = إيقاف المشهد", enabled: true },
  { type: "voice", action: "'أعد' = إعادة السطر", enabled: true },
];

// ==================== القيم الافتراضية ====================

/**
 * القيم الافتراضية للإعدادات المختلفة
 */
export const DEFAULT_VALUES = {
  /** إعدادات التلقين الافتراضية */
  teleprompter: {
    speed: 50,
    fontSize: 24,
    opacity: 80,
    position: "center" as const,
  },
  /** إعدادات الكاميرا الافتراضية */
  camera: {
    focalLength: 50,
    shotType: "medium" as const,
    aspectRatio: "16:9" as const,
  },
  /** إعدادات الشريك الهولوغرافي الافتراضية */
  holographicPartner: {
    character: "ليلى",
    emotion: "حب",
    intensity: 70,
    isActive: false,
  },
  /** علامات الحركة الافتراضية */
  blockingMarks: [
    { id: "1", x: 20, y: 30, label: "بداية", color: "#22c55e" },
    { id: "2", x: 50, y: 50, label: "وسط", color: "#3b82f6" },
    { id: "3", x: 80, y: 70, label: "نهاية", color: "#ef4444" },
  ],
} as const;

// ==================== ردود الذكاء الاصطناعي التجريبية ====================

/**
 * ردود تجريبية لشريك المشهد
 * @description تُستخدم في وضع العرض التوضيحي
 */
export const AI_PARTNER_RESPONSES = [
  "يا أحمد، قلبي معك، لكن العائلة تقف بيننا. ماذا سنفعل؟ 💔",
  "أنا خائفة... لكن حبك يعطيني القوة. هل ستبقى معي؟",
  "كلماتك تلمس قلبي... لكن الطريق صعب أمامنا.",
  "أثق بك يا أحمد. سنجد طريقة معاً.",
] as const;

// ==================== ثوابت التحقق ====================

/**
 * ثوابت التحقق من المدخلات
 */
export const VALIDATION_CONSTANTS = {
  /** الحد الأدنى لطول النص للتحليل */
  MIN_SCRIPT_LENGTH: 50,
  /** الحد الأقصى لطول النص للتحليل */
  MAX_SCRIPT_LENGTH: 50000,
  /** الحد الأدنى لطول الاسم */
  MIN_NAME_LENGTH: 2,
  /** الحد الأقصى لطول الاسم */
  MAX_NAME_LENGTH: 100,
  /** وقت التردد قبل التلقين (بالمللي ثانية) */
  HESITATION_TIMEOUT: 3000,
  /** مدة عرض الإشعار (بالمللي ثانية) */
  NOTIFICATION_DURATION: 5000,
} as const;

// ==================== رسائل الخطأ ====================

/**
 * رسائل الخطأ المترجمة
 */
export const ERROR_MESSAGES = {
  SCRIPT_REQUIRED: "يرجى إدخال نص أولاً",
  SCRIPT_TOO_SHORT: "النص قصير جداً للتحليل",
  WEBCAM_PERMISSION_DENIED: "لم يتم السماح بالوصول للكاميرا",
  MICROPHONE_PERMISSION_DENIED: "لم يتم السماح بالوصول للميكروفون",
  MEMORIZATION_SCRIPT_REQUIRED: "الرجاء إدخال نص للحفظ أولاً",
  LOGIN_REQUIRED: "يرجى تسجيل الدخول أولاً",
  INVALID_EMAIL: "البريد الإلكتروني غير صالح",
  FILL_ALL_FIELDS: "يرجى ملء جميع الحقول",
} as const;

// ==================== رسائل النجاح ====================

/**
 * رسائل النجاح المترجمة
 */
export const SUCCESS_MESSAGES = {
  LOGIN_SUCCESS: "تم تسجيل الدخول بنجاح!",
  REGISTER_SUCCESS: "تم إنشاء الحساب بنجاح!",
  LOGOUT_SUCCESS: "تم تسجيل الخروج",
  ANALYSIS_SUCCESS: "تم تحليل النص بنجاح!",
  RECORDING_SAVED: "تم حفظ التسجيل!",
  WEBCAM_ACTIVATED: "تم تفعيل الكاميرا بنجاح!",
  EXERCISE_COMPLETED: "أحسنت! تم إنهاء التمرين",
  REHEARSAL_ENDED: "انتهت جلسة التدريب! أحسنت 👏",
  SAMPLE_LOADED: "تم تحميل النص التجريبي",
  MEMORIZATION_STARTED: "بدأت جلسة الحفظ - حاول تذكر الكلمات المحذوفة",
  MEMORIZATION_COMPLETED: "أحسنت! أكملت النص بالكامل",
} as const;
