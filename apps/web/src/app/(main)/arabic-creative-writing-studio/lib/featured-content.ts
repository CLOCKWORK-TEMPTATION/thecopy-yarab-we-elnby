import {
  CreativePrompt,
  DailyPrompt,
  WeeklyChallenge,
} from "@/app/(main)/arabic-creative-writing-studio/types";

export interface FeaturedWeeklyChallenge extends WeeklyChallenge {
  prompt: CreativePrompt;
}

const today = new Date();
const nextWeek = new Date(today);

nextWeek.setDate(today.getDate() + 7);

export const FEATURED_DAILY_PROMPT: DailyPrompt = {
  id: "daily-prompt-desert-letter",
  date: today.toISOString().slice(0, 10),
  specialEvent: "جرعة إلهام سريعة لهذا اليوم",
  prompt: {
    id: "daily_prompt_desert_letter",
    title: "رسالة من آخر محطة",
    description: "رسالة تصل متأخرة من مسافر يظن الجميع أنه اختفى",
    genre: "literary_fiction",
    technique: "atmospheric",
    difficulty: "intermediate",
    wordCount: 900,
    timeEstimate: "35 دقيقة",
    tags: ["رسائل", "غياب", "حنين"],
    arabic:
      "اكتب رسالة تصل إلى البطلة بعد سنوات من اختفاء صاحبها، وفي كل فقرة تكتشف أن الرسالة لا تصف الماضي فقط، بل تكشف ما يجب أن تفعله اليوم قبل فوات الأوان.",
    tips: [
      "اجعل كل فقرة تفتح طبقة جديدة من الماضي.",
      "ابنِ التوتر حول الشيء الذي يجب فعله اليوم.",
      "وازن بين الحنين والقرار العملي في النهاية.",
    ],
  },
};

export const ACTIVE_WEEKLY_CHALLENGE: FeaturedWeeklyChallenge = {
  id: "weekly-challenge-double-witness",
  week: 16,
  title: "مشهد بشاهدين",
  description:
    "اكتب المشهد نفسه مرتين من وجهتي نظر متعارضتين حتى يظهر الفرق في الحقيقة العاطفية.",
  requirements: [
    "اكتب بين 600 و900 كلمة.",
    "قسّم المشهد إلى مقطعين فقط.",
    "بدّل الراوي بين المقطعين من دون تغيير الحدث الأساسي.",
    "اختم بنقطة تكشف لماذا اختلفت الروايتان.",
  ],
  deadline: nextWeek,
  reward: "وسام التحدي الأسبوعي داخل أرشيفك المحلي",
  prompt: {
    id: "weekly_challenge_double_witness",
    title: "التحدي الأسبوعي: مشهد بشاهدين",
    description: "حدث واحد يرويه شاهدان متناقضان",
    genre: "mystery",
    technique: "dialogue_driven",
    difficulty: "advanced",
    wordCount: 900,
    timeEstimate: "75 دقيقة",
    tags: ["التحدي الأسبوعي", "وجهات نظر", "حقيقة"],
    arabic:
      "اكتب مشهداً يبدأ بلحظة اتهام داخل غرفة مغلقة. في النصف الأول يروي الشاهد الأول ما حدث، وفي النصف الثاني يعيد الشاهد الثاني اللحظة نفسها من زاوية تنسف التفسير الأول.",
    tips: [
      "حافظ على الحدث ثابتاً، وغيّر التأويل فقط.",
      "استخدم الحوار لكشف الانحياز لا المعلومات وحدها.",
      "اجعل الفرق بين الروايتين يخدم المفاجأة الأخيرة.",
    ],
  },
};
