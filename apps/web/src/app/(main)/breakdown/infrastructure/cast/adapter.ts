import type {
  CastAnalysisResult,
  CastMember,
  ExtendedCastMember,
} from "../../domain/models";

export const simplifyCastMember = (member: ExtendedCastMember): CastMember => ({
  name: member.name,
  role: member.roleCategory,
  age: member.ageRange,
  gender: member.gender,
  description: member.visualDescription,
  motivation: member.motivation,
});

export const simplifyCastResult = (result: CastAnalysisResult): CastMember[] =>
  result.members.map(simplifyCastMember);
