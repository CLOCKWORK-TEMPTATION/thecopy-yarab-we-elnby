/**
 * Station definitions for analysis pipeline
 */

export interface Station {
  id: number;
  name: string;
  description: string;
  processFunction: (input: any) => Promise<any>;
}

export const stations: Station[] = [
  {
    id: 1,
    name: "المحطة 1: التحليل الأساسي",
    description: "يستخرج الشخصيات وعلاقاتهم",
    processFunction: async (_input: any) => {
      return { status: "completed", data: {} };
    },
  },
  {
    id: 2,
    name: "المحطة 2: التحليل المفاهيمي",
    description: "يحدد بيان القصة والنوع",
    processFunction: async (_input: any) => {
      return { status: "completed", data: {} };
    },
  },
  {
    id: 3,
    name: "المحطة 3: بناء الشبكة",
    description: "يبني هيكل شبكة الصراع",
    processFunction: async (_input: any) => {
      return { status: "completed", data: {} };
    },
  },
  {
    id: 4,
    name: "المحطة 4: مقاييس الكفاءة",
    description: "يقيس كفاءة وفعالية النص",
    processFunction: async (_input: any) => {
      return { status: "completed", data: {} };
    },
  },
  {
    id: 5,
    name: "المحطة 5: التحليل المتقدم",
    description: "يحلل الديناميكيات والرموز",
    processFunction: async (_input: any) => {
      return { status: "completed", data: {} };
    },
  },
  {
    id: 6,
    name: "المحطة 6: التشخيص والعلاج",
    description: "يشخص الشبكة ويقترح تحسينات",
    processFunction: async (_input: any) => {
      return { status: "completed", data: {} };
    },
  },
  {
    id: 7,
    name: "المحطة 7: التقرير النهائي",
    description: "يولد التصورات والملخصات النهائية",
    processFunction: async (_input: any) => {
      return { status: "completed", data: {} };
    },
  },
];
