/**
 * @fileoverview كشف الروابط الضعيفة في شبكة الصراعات.
 */

import type { ConflictNetwork } from "../core/models/base-entities";

import {
  getConflictEntries,
  getRelationships,
} from "./network-diagnostics-helpers";
import type {
  DiagnosticReport,
  WeakConnectionIssue,
} from "./network-diagnostics-types";

export function findWeakConnections(
  network: ConflictNetwork
): DiagnosticReport["weakConnections"] {
  const weakConnections: WeakConnectionIssue[] = [];

  for (const relationship of getRelationships(network)) {
    if ((relationship.strength ?? 0) < 4) {
      weakConnections.push({
        connectionType: "relationship",
        elementId:
          relationship.id ?? `${relationship.source}-${relationship.target}`,
        weakness: "قوة العلاقة ضعيفة",
        strengthScore: relationship.strength ?? 0,
        improvementSuggestions: [
          "أضف مشاهد تفاعل أكثر بين الشخصيتين",
          "طور الخلفية المشتركة للشخصيتين",
          "أنشئ صراعاً يجمع بينهما",
        ],
      });
    }
  }

  if (network.conflicts) {
    for (const [conflictId, conflict] of getConflictEntries(network)) {
      if ((conflict.strength ?? 0) < 4) {
        weakConnections.push({
          connectionType: "conflict_involvement",
          elementId: conflict.id ?? conflictId,
          weakness: "مشاركة ضعيفة في الصراع",
          strengthScore: conflict.strength ?? 0,
          improvementSuggestions: [
            "زد من حدة الصراع",
            "أضف نقاط تحول مهمة",
            "اربط الصراع بدوافع الشخصيات الأساسية",
          ],
        });
      }
    }
  }

  return {
    totalWeak: weakConnections.length,
    connections: weakConnections,
  };
}
