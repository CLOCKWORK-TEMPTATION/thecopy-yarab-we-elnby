/**
 * @module extensions/paste-classifier/schema-seed
 *
 * منطق schema-seeding من المحرك المضمّن (Karank):
 * - بناء طوابير seeds من schema elements.
 * - استهلاك seed لكل سطر يطابق نصاً مطبّعاً.
 * - قرار تفضيل seed مقابل قرار محلي.
 * - تسجيل أصوات schema-hint داخل traceCollector.
 */

import { convertHindiToArabic } from "../arabic-patterns";
import { parseBulletLine } from "../line-repair";
import type { ClassifiedDraftWithId } from "../paste-classifier-helpers";
import { traceCollector } from "@editor/suspicion-engine/trace/trace-collector";

import type { ClassifiedDraft, ElementType } from "../classification-types";

import { ENGINE_ELEMENT_MAP } from "./constants";
import { normalizeClassifierConfidence } from "./utils/draft-builders";

import type { SchemaElementInput } from "./types";

/**
 * تطبيع نص بحث seed:
 * - parseBulletLine إن وُجد.
 * - convertHindiToArabic.
 * - تجميع المسافات وقصّ.
 */
const normalizeSeedLookupText = (value: string): string => {
  const bulletNormalized = parseBulletLine(value) ?? value;
  return convertHindiToArabic(bulletNormalized).replace(/\s+/g, " ").trim();
};

/**
 * بناء طابور seeds مرتبط بكل نص مطبّع.
 * النصوص المتكررة تتراكم في طابور تُستهلك بترتيب الورود.
 */
export const buildSchemaSeedQueues = (
  schemaElements: readonly SchemaElementInput[] | undefined
): Map<string, ElementType[]> => {
  const queues = new Map<string, ElementType[]>();
  if (!schemaElements || schemaElements.length === 0) return queues;

  for (const element of schemaElements) {
    const mappedType = ENGINE_ELEMENT_MAP.get(element.element.trim());
    if (!mappedType) continue;
    const normalizedText = normalizeSeedLookupText(element.value);
    if (!normalizedText) continue;
    const queue = queues.get(normalizedText);
    if (queue) {
      queue.push(mappedType);
    } else {
      queues.set(normalizedText, [mappedType]);
    }
  }

  return queues;
};

/**
 * استهلاك seed لسطر معطى — يُرجع ElementType ثم يُزيل العنصر من الطابور.
 */
export const consumeSchemaSeedTypeForLine = (
  lineText: string,
  seedQueues: Map<string, ElementType[]>
): ElementType | undefined => {
  const normalized = normalizeSeedLookupText(lineText);
  if (!normalized) return undefined;
  const queue = seedQueues.get(normalized);
  if (!queue || queue.length === 0) return undefined;
  const value = queue.shift();
  if (queue.length === 0) {
    seedQueues.delete(normalized);
  }
  return value;
};

/**
 * قرار تفضيل seed على قرار المصنف المحلي.
 * يُعتمد seed إذا:
 * - النوع مطابق، أو
 * - الثقة المحلية ضعيفة بما يكفي (<0.98)، باستثناء regex بثقة ≥0.92
 *   و context بثقة ≥0.96.
 */
export const shouldPreferSchemaSeedDecision = (params: {
  schemaType: ElementType | undefined;
  localType: ElementType;
  localConfidence: number;
  localMethod: ClassifiedDraft["classificationMethod"];
}): boolean => {
  const { schemaType, localType, localConfidence, localMethod } = params;
  if (!schemaType) return false;
  if (schemaType === localType) return true;

  const normalizedConfidence = normalizeClassifierConfidence(localConfidence);
  if (localMethod === "regex" && normalizedConfidence >= 0.92) return false;
  if (localMethod === "context" && normalizedConfidence >= 0.96) return false;

  return normalizedConfidence < 0.98;
};

/**
 * تسجيل أصوات schema-hint للسطور المصنفة المطابقة.
 * يُرجع عدد الأصوات المسجلة.
 */
export const recordSchemaSeedVotes = (
  classified: readonly ClassifiedDraftWithId[],
  schemaElements: readonly SchemaElementInput[] | undefined
): number => {
  const queues = buildSchemaSeedQueues(schemaElements);
  let matched = 0;

  for (let index = 0; index < classified.length; index += 1) {
    const item = classified[index];
    if (!item) continue;
    const seedType = consumeSchemaSeedTypeForLine(item.text, queues);
    if (!seedType) continue;
    traceCollector.addVote(index, {
      stage: "schema-hint",
      suggestedType: seedType,
      confidence: 1,
      reasonCode: "external-engine",
      metadata: { source: "karank" },
    });
    matched += 1;
  }

  return matched;
};
