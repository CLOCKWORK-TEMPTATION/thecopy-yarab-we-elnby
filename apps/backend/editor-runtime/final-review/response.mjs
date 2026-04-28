// ─────────────────────────────────────────────────────────
// final-review/response.mjs — T008 تحليل استجابة المراجعة
// ─────────────────────────────────────────────────────────

import { isObjectRecord, normalizeSceneHeaderDecisionType } from "./utils.mjs";

export const parseFinalReviewResponse = (text) => {
  if (!text || typeof text !== "string") return [];
  let parsed;
  try {
    parsed = JSON.parse(text.trim());
  } catch {
    // Fallback: extract from first { to last }
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return [];
    try {
      parsed = JSON.parse(text.slice(start, end + 1));
    } catch {
      return [];
    }
  }
  // Handle both array and {commands: [...]} formats
  const commands = Array.isArray(parsed)
    ? parsed
    : Array.isArray(parsed?.commands)
      ? parsed.commands
      : [];
  return commands.filter((cmd) => isObjectRecord(cmd) && cmd.op === "relabel");
};

// T009 — تطبيع الأوامر ضد الطلب
export const normalizeCommandsAgainstRequest = (commands, request) => {
  const validItemIds = new Set(request.suspiciousLines.map((l) => l.itemId));
  const bestByItemId = new Map();
  for (const cmd of commands) {
    if (!cmd.itemId || !validItemIds.has(cmd.itemId)) continue;
    const existing = bestByItemId.get(cmd.itemId);
    if (!existing || (cmd.confidence ?? 0) > (existing.confidence ?? 0)) {
      const normalized = { ...cmd };
      if (cmd.op === "relabel" && cmd.newType) {
        normalized.newType = normalizeSceneHeaderDecisionType(cmd.newType);
      }
      bestByItemId.set(cmd.itemId, normalized);
    }
  }
  return [...bestByItemId.values()];
};
