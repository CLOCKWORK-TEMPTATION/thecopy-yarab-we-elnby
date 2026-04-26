/**
 * Station definitions for analysis pipeline
 */

export interface Station {
  id: number;
  name: string;
  description: string;
  processFunction: (input: unknown) => Promise<unknown>;
}

export const stations: Station[] = [
  {
    id: 1,
    name: "المحطة 1: التحليل الأساسي",
    description: "يستخرج الشخصيات وعلاقاتهم",
    processFunction: (_input: unknown) =>
      Promise.resolve({ status: "completed", data: {} }),
  },
  {
    id: 2,
    name: "المحطة 2: التحليل المفاهيمي",
    description: "يحدد بيان القصة والنوع",
    processFunction: (_input: unknown) =>
      Promise.resolve({ status: "completed", data: {} }),
  },
  {
    id: 3,
    name: "المحطة 3: بناء الشبكة",
    description: "يبني هيكل شبكة الصراع",
    processFunction: (_input: unknown) =>
      Promise.resolve({ status: "completed", data: {} }),
  },
  {
    id: 4,
    name: "المحطة 4: مقاييس الكفاءة",
    description: "يقيس كفاءة وفعالية النص",
    processFunction: (_input: unknown) =>
      Promise.resolve({ status: "completed", data: {} }),
  },
  {
    id: 5,
    name: "المحطة 5: التحليل المتقدم",
    description: "يحلل الديناميكيات والرموز",
    processFunction: (_input: unknown) =>
      Promise.resolve({ status: "completed", data: {} }),
  },
  {
    id: 6,
    name: "المحطة 6: التشخيص والعلاج",
    description: "يشخص الشبكة ويقترح تحسينات",
    processFunction: (_input: unknown) =>
      Promise.resolve({ status: "completed", data: {} }),
  },
  {
    id: 7,
    name: "المحطة 7: التقرير النهائي",
    description: "يولد التصورات والملخصات النهائية",
    processFunction: (_input: unknown) =>
      Promise.resolve({ status: "completed", data: {} }),
  },
];
