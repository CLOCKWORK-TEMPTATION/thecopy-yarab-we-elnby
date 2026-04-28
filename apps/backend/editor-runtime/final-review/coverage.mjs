// ─────────────────────────────────────────────────────────
// final-review/coverage.mjs — T028 تحديد حالة التغطية
// ─────────────────────────────────────────────────────────

export const determineCoverageStatus = (commands, request) => {
  const resolvedItemIds = commands.map((c) => c.itemId);
  const resolvedSet = new Set(resolvedItemIds);
  const missingItemIds = request.requiredItemIds.filter(
    (id) => !resolvedSet.has(id),
  );
  const unresolvedForcedItemIds = request.forcedItemIds.filter(
    (id) => !resolvedSet.has(id),
  );

  let status;
  if (unresolvedForcedItemIds.length > 0) {
    status = "error";
  } else if (missingItemIds.length === 0) {
    status = "applied";
  } else {
    status = "partial";
  }

  return { status, resolvedItemIds, missingItemIds, unresolvedForcedItemIds };
};
