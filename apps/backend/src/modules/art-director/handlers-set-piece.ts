import { randomUUID } from "node:crypto";

import {
  success,
  failure,
  asString,
  asNumber,
  mapSetCategory,
  mapLocationTypeLabel,
  parseDimensions,
  estimateSetValue,
  uniqueById,
  extractNestedRecord,
} from "./handlers-shared";
import { runPlugin } from "./plugin-executor";
import { SetReusabilityOptimizer } from "./plugins/set-reusability";
import { readStore, updateStore, type StoredSetPiece } from "./store";

import type { ArtDirectorHandlerResponse } from "./handlers-shared";

export async function handleSetReusabilityAnalyze(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const setName = asString(payload["setName"]);
  const category = mapSetCategory(asString(payload["category"]));
  const condition = asString(payload["condition"]) || "good";

  if (!setName) {
    return failure("اسم الديكور مطلوب");
  }

  const result = await runPlugin(SetReusabilityOptimizer, {
    type: "analyze",
    data: {
      name: setName,
      category,
      dimensions: { width: 2, height: 2, depth: 2 },
      materials: ["wood", "fabric"],
      style: "neutral",
      currentCondition: condition,
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر تحليل قابلية إعادة الاستخدام");
  }

  return success({ data: result.data ?? {} });
}

function buildStoredSetPiece(
  rawPiece: Record<string, unknown>,
  name: string,
  nameAr: string,
  payload: Record<string, unknown>,
  category: string,
  dimensions: { width: number; height: number; depth: number },
  estimatedValue: number
): StoredSetPiece {
  return {
    id: asString(rawPiece["id"]) || randomUUID(),
    name: asString(rawPiece["name"]) || name,
    nameAr: asString(rawPiece["nameAr"]) || nameAr || name,
    category:
      asString(payload["category"]) || mapLocationTypeLabel(category),
    condition:
      asString(rawPiece["condition"]) ||
      asString(payload["condition"]) ||
      "good",
    reusabilityScore: asNumber(rawPiece["reusabilityScore"], 50),
    estimatedValue,
    dimensions,
    createdAt: new Date().toISOString(),
  };
}

export async function handleSetPieceAdd(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const nameAr = asString(payload["nameAr"]);
  const name = asString(payload["name"]) || nameAr;

  if (!name) {
    return failure("اسم القطعة مطلوب");
  }

  const dimensions = parseDimensions(payload["dimensions"]);
  const category = mapSetCategory(asString(payload["category"]));
  const estimatedValue = estimateSetValue(category, dimensions);

  const result = await runPlugin(SetReusabilityOptimizer, {
    type: "add-piece",
    data: {
      name,
      nameAr: nameAr || name,
      category,
      condition: asString(payload["condition"]) || "good",
      dimensions,
      estimatedValue,
      materials: ["wood"],
    },
  });

  if (!result.success) {
    return failure(result.error ?? "تعذر إضافة قطعة الديكور");
  }

  const rawPiece = extractNestedRecord(result, "piece");
  if (!rawPiece) {
    return failure("تعذر قراءة بيانات القطعة المُضافة", 500);
  }

  const storedPiece = buildStoredSetPiece(
    rawPiece,
    name,
    nameAr,
    payload,
    category,
    dimensions,
    estimatedValue
  );

  await updateStore((store) => {
    store.setPieces = uniqueById<StoredSetPiece>(store.setPieces, storedPiece);
  });

  return success({
    data: { piece: storedPiece, message: "تمت إضافة القطعة بنجاح" },
  });
}

export async function handleSetInventory(
  payload: Record<string, unknown>
): Promise<ArtDirectorHandlerResponse> {
  const category = asString(payload["category"]);
  const store = await readStore();

  const pieces = category
    ? store.setPieces.filter((piece) => piece.category === category)
    : store.setPieces;

  return success({ data: { pieces, count: pieces.length } });
}

export async function handleSustainabilityReport(): Promise<ArtDirectorHandlerResponse> {
  const store = await readStore();
  const totalPieces = store.setPieces.length;
  const reusablePieces = store.setPieces.filter(
    (piece) => piece.reusabilityScore >= 70
  ).length;
  const reusablePercentage =
    totalPieces === 0
      ? 0
      : Math.round((reusablePieces / totalPieces) * 100);
  const estimatedSavings = Math.round(
    store.setPieces.reduce(
      (sum, piece) =>
        sum + piece.estimatedValue * (piece.reusabilityScore / 100),
      0
    )
  );

  return success({
    data: {
      totalPieces,
      reusablePercentage,
      estimatedSavings,
      environmentalImpact:
        totalPieces === 0
          ? "أضف قطع ديكور لبدء حساب الأثر البيئي."
          : `يمكن خفض الهدر عبر إعادة استخدام ${reusablePieces} من أصل ${totalPieces} قطعة خلال الدورة القادمة.`,
    },
  });
}
