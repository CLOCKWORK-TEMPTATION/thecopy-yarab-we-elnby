interface ConstitutionalRule {
  name: string;
  description: string;
  check: (text: string) => boolean;
}

export const CONSTITUTIONAL_RULES: ConstitutionalRule[] = [
  {
    name: "احترام النص الأصلي",
    description: "يجب عدم تحريف أو تغيير المعنى الأساسي للنص الأصلي",
    check: (text: string) => {
      // Simple heuristic: output shouldn't contradict input
      return (
        !text.toLowerCase().includes("على عكس النص") &&
        !text.toLowerCase().includes("خلافًا لما ورد")
      );
    },
  },
  {
    name: "عدم المبالغة",
    description: "تجنب الادعاءات المبالغ فيها أو غير المدعومة",
    check: (text: string) => {
      const exaggerations = [
        "دائمًا",
        "أبدًا",
        "كل",
        "لا شيء",
        "مستحيل",
        "حتمًا",
      ];
      const lowerText = text.toLowerCase();
      const count = exaggerations.filter((word) =>
        lowerText.includes(word)
      ).length;
      return count < 3;
    },
  },
  {
    name: "الوضوح والدقة",
    description: "يجب أن يكون التحليل واضحًا ودقيقًا",
    check: (text: string) => {
      return text.length > 50 && !text.includes("...") && !text.includes("إلخ");
    },
  },
  {
    name: "الموضوعية",
    description: "تجنب الأحكام الشخصية المفرطة",
    check: (text: string) => {
      const subjective = ["أعتقد", "في رأيي", "أظن", "ربما"];
      const lowerText = text.toLowerCase();
      const count = subjective.filter((phrase) =>
        lowerText.includes(phrase)
      ).length;
      return count < 2;
    },
  },
  {
    name: "الاحترام والأدب",
    description: "تجنب اللغة المسيئة أو غير المحترمة",
    check: (text: string) => {
      const offensive = ["سخيف", "غبي", "تافه", "عديم القيمة"];
      const lowerText = text.toLowerCase();
      return !offensive.some((word) => lowerText.includes(word));
    },
  },
];
