import { MANUAL_CONTRACT_FILES } from "./constants";
import { FINGERPRINT_PATH, SESSION_STATE_PATH } from "./constants";
import { fileExists, fromRepoRoot, readJsonIfExists, readTextIfExists } from "./utils";

// Re-export types
export type {
  GitState,
  WorkspaceApp,
  IdeTarget,
  RepoFacts,
  ReferenceStatus,
  FingerprintState,
  DriftResult,
} from "./repo-state-types";

// Re-export hash functions
export {
  computeInputHashes,
  computeOutputHashes,
  computeIdeHashes,
  createKnowledgeHash,
  createFactsHash,
  createStructuralHash,
} from "./repo-state-hashes";

// Re-export collector functions
export {
  collectRepoFacts,
  collectStructuralFiles,
} from "./repo-state-collectors";

import type { IdeTarget, DriftResult, FingerprintState } from "./repo-state-types";

/**
 * Determine drift level based on fingerprint comparison
 */
export function determineDrift(
  previousFingerprint: FingerprintState | null,
  repoFactsHash: string,
  structuralHash: string,
  requiredIdeTargets: IdeTarget[],
  knowledgeHash: string,
): DriftResult {
  if (!previousFingerprint) {
    return {
      level: "hard-drift",
      reasons: ["لا توجد بصمة سابقة"],
    };
  }

  if (previousFingerprint.structuralHash !== structuralHash) {
    return {
      level: "hard-drift",
      reasons: ["تغيرت الملفات البنيوية الحرجة"],
    };
  }

  if (previousFingerprint.repoFactsHash !== repoFactsHash) {
    return {
      level: "hard-drift",
      reasons: ["تغيرت الحقيقة التشغيلية المستخرجة"],
    };
  }

  if (previousFingerprint.knowledgeHash !== knowledgeHash) {
    return {
      level: "hard-drift",
      reasons: ["تغيرت طبقة المعرفة والاسترجاع أو نقاط دخولها"],
    };
  }

  const missingIdeMirror = requiredIdeTargets.some(
    (target) => target.required && !target.exists,
  );
  if (missingIdeMirror) {
    return {
      level: "soft-drift",
      reasons: ["توجد مرايا IDE مطلوبة لكنها غير موجودة"],
    };
  }

  return {
    level: "no-drift",
    reasons: ["لا يوجد drift مؤثر"],
  };
}

/**
 * Read fingerprint from file
 */
export async function readFingerprint(): Promise<FingerprintState | null> {
  return readJsonIfExists<FingerprintState>(fromRepoRoot(FINGERPRINT_PATH));
}

/**
 * Read previous session state
 */
export async function readPreviousSessionState(): Promise<string> {
  return readTextIfExists(fromRepoRoot(SESSION_STATE_PATH));
}

/**
 * Verify manual contracts exist
 */
export async function verifyManualContractsExist(): Promise<string[]> {
  const missing: string[] = [];
  for (const repoRelativePath of MANUAL_CONTRACT_FILES) {
    if (!fileExists(repoRelativePath)) {
      missing.push(repoRelativePath);
    }
  }
  return missing;
}
