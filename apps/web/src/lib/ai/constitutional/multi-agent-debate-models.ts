import {
  isUnknownRecord,
  stringArrayFromUnknown,
  stringifyUnknown,
} from "@/lib/utils/unknown-values";

export interface DebateParticipant {
  role: "prosecutor" | "defender" | "judge";
  name: string;
  perspective: string;
}

export interface DebateArgument {
  participant: string;
  argument: string;
  evidence: string[];
  strength: number;
}

export interface DebateRound {
  round: number;
  prosecutorArgument: DebateArgument;
  defenderArgument: DebateArgument;
  judgeComments: string;
}

export interface ConsensusArea {
  aspect: string;
  agreement: string;
  confidence: number;
}

export interface DisputedArea {
  aspect: string;
  prosecutorView: string;
  defenderView: string;
  judgeOpinion: string;
  resolution: string;
}

export interface FinalVerdict {
  overallAssessment: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  confidence: number;
}

export interface DebateVerdict {
  consensusAreas: ConsensusArea[];
  disputedAreas: DisputedArea[];
  finalVerdict: FinalVerdict;
}

export interface DebateDynamics {
  rounds: number;
  convergenceScore: number;
  controversialTopics: string[];
}

export interface DebateResult {
  participants: DebateParticipant[];
  rounds: DebateRound[];
  verdict: DebateVerdict;
  debateDynamics: DebateDynamics;
}

export const DEFAULT_DEBATE_PARTICIPANTS: DebateParticipant[] = [
  {
    role: "prosecutor",
    name: "المدعي الناقد",
    perspective: "تحديد نقاط الضعف والأخطاء والتحيزات",
  },
  {
    role: "defender",
    name: "المدافع البناء",
    perspective: "إبراز نقاط القوة والجوانب الإيجابية",
  },
  {
    role: "judge",
    name: "القاضي الموضوعي",
    perspective: "التوصل لحكم متوازن وشامل",
  },
];

export const fallbackVerdict: DebateVerdict = {
  consensusAreas: [],
  disputedAreas: [],
  finalVerdict: {
    overallAssessment: "تعذر إصدار حكم نهائي بسبب خطأ في الخدمة.",
    strengths: [],
    weaknesses: [],
    recommendations: [],
    confidence: 0,
  },
};

function numberFromUnknown(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

export function parseDebateVerdict(content: string): DebateVerdict {
  const parsed: unknown = JSON.parse(content);
  if (!isUnknownRecord(parsed)) {
    return fallbackVerdict;
  }

  const consensusAreas = Array.isArray(parsed["consensusAreas"])
    ? parsed["consensusAreas"].flatMap((area) => {
        if (!isUnknownRecord(area)) {
          return [];
        }
        return [
          {
            aspect: stringifyUnknown(area["aspect"]),
            agreement: stringifyUnknown(area["agreement"]),
            confidence: numberFromUnknown(area["confidence"], 0),
          },
        ];
      })
    : [];

  const disputedAreas = Array.isArray(parsed["disputedAreas"])
    ? parsed["disputedAreas"].flatMap((area) => {
        if (!isUnknownRecord(area)) {
          return [];
        }
        return [
          {
            aspect: stringifyUnknown(area["aspect"]),
            prosecutorView: stringifyUnknown(area["prosecutorView"]),
            defenderView: stringifyUnknown(area["defenderView"]),
            judgeOpinion: stringifyUnknown(area["judgeOpinion"]),
            resolution: stringifyUnknown(area["resolution"]),
          },
        ];
      })
    : [];

  const finalVerdict = isUnknownRecord(parsed["finalVerdict"])
    ? {
        overallAssessment: stringifyUnknown(
          parsed["finalVerdict"]["overallAssessment"]
        ),
        strengths: stringArrayFromUnknown(parsed["finalVerdict"]["strengths"]),
        weaknesses: stringArrayFromUnknown(
          parsed["finalVerdict"]["weaknesses"]
        ),
        recommendations: stringArrayFromUnknown(
          parsed["finalVerdict"]["recommendations"]
        ),
        confidence: numberFromUnknown(parsed["finalVerdict"]["confidence"], 0),
      }
    : fallbackVerdict.finalVerdict;

  return {
    consensusAreas,
    disputedAreas,
    finalVerdict,
  };
}
