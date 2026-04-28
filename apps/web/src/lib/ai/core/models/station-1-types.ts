// Station 1: التحليل النصي الأساسي

import { StationInput } from "../../stations/base-station";

import {
  Character,
  CharacterAnalysis,
  DialogueAnalysis,
  UncertaintyReport,
  StationMetadata,
} from "./base-entities";

export interface Station1Input extends StationInput {
  // لا يوجد مدخلات إضافية خاصة بالمحطة 1
}

export interface Station1Output {
  // البيانات الأساسية
  logline: string; // 2-3 جمل تلخص القصة
  majorCharacters: Character[]; // الشخصيات الرئيسية (3-7)
  characterAnalysis: Map<string, CharacterAnalysis>;
  dialogueAnalysis: DialogueAnalysis;
  narrativeStyleAnalysis: {
    overallTone: string;
    pacingAnalysis: string;
    languageStyle: string;
    perspective: string;
  };

  // البيانات الوصفية
  metadata: StationMetadata;

  // تقرير عدم اليقين (إذا كان مفعلاً)
  uncertaintyReport?: UncertaintyReport;
}