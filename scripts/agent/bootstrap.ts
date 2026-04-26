import fs from "node:fs";

import {
  AGENT_CONTEXT_PATH,
  FINGERPRINT_PATH,
  ROUND_NOTES_PATH,
  SESSION_STATE_PATH,
} from "./lib/constants";
import { runAgentGuard } from "./lib/agent-guard";
import { buildMapFiles } from "./lib/maps";
import {
  collectRepoFacts,
  collectStructuralFiles,
  computeIdeHashes,
  computeInputHashes,
  computeOutputHashes,
  createFactsHash,
  createKnowledgeHash,
  createStructuralHash,
  determineDrift,
  readFingerprint,
  verifyManualContractsExist,
  type FingerprintState,
} from "./lib/repo-state";
import { appendRoundNote, getNextRoundNumber } from "./lib/round-notes";
import {
  renderGeneratedContext,
  renderIdeShim,
  renderRoundNote,
  renderSessionState,
  renderStartupBrief,
  shouldAppendSessionStart,
} from "./lib/templates";
import {
  formatTimestamp,
  fromRepoRoot,
  readTextIfExists,
  sha256,
  stableStringify,
  toRepoRelative,
  writeTextIfChanged,
} from "./lib/utils";

async function main(): Promise<void> {
  await runAgentGuard("start");

  const now = new Date();
  const bootstrapTimestamp = formatTimestamp(now);
  const previousFingerprint = await readFingerprint();
  const missingContracts = await verifyManualContractsExist();

  if (missingContracts.length > 0) {
    throw new Error(
      `ملفات العقود اليدوية المفقودة: ${missingContracts.join(", ")}`,
    );
  }

  const facts = await collectRepoFacts();
  const structuralFiles = collectStructuralFiles(facts);
  const inputHashes = await computeInputHashes(structuralFiles);
  const repoFactsHash = createFactsHash(facts);
  const knowledgeHash = createKnowledgeHash(facts.knowledgeInventory);
  const structuralHash = createStructuralHash(structuralFiles, inputHashes);
  const drift = determineDrift(
    previousFingerprint,
    repoFactsHash,
    structuralHash,
    facts.requiredIdeTargets,
    knowledgeHash,
  );

  const updatedPaths: string[] = [];
  const referenceTimestamp =
    !previousFingerprint || drift.level !== "no-drift"
      ? bootstrapTimestamp
      : previousFingerprint.lastBootstrapTimestamp;

  for (const ideTarget of facts.requiredIdeTargets.filter(
    (target) => target.required,
  )) {
    const idePath = fromRepoRoot(ideTarget.path);
    const changed = await writeTextIfChanged(idePath, renderIdeShim(ideTarget));
    if (changed) {
      updatedPaths.push(toRepoRelative(idePath));
    }
  }

  const shouldRefreshMaps =
    drift.level === "hard-drift" ||
    buildMapFiles(facts).some(
      (mapFile) => !fs.existsSync(fromRepoRoot(mapFile.path)),
    );

  if (shouldRefreshMaps || drift.level !== "no-drift") {
    for (const mapFile of buildMapFiles(facts)) {
      const changed = await writeTextIfChanged(
        fromRepoRoot(mapFile.path),
        mapFile.content,
      );
      if (changed) {
        updatedPaths.push(mapFile.path);
      }
    }
  }

  const sessionStateContent = renderSessionState(
    facts,
    drift,
    referenceTimestamp,
  );
  const sessionStateChanged = await writeTextIfChanged(
    fromRepoRoot(SESSION_STATE_PATH),
    sessionStateContent,
  );
  if (sessionStateChanged) {
    updatedPaths.push(SESSION_STATE_PATH);
  }

  const generatedContextContent = renderGeneratedContext(
    facts,
    drift,
    referenceTimestamp,
    facts.openIssues,
  );
  const generatedContextChanged = await writeTextIfChanged(
    fromRepoRoot(AGENT_CONTEXT_PATH),
    generatedContextContent,
  );
  if (generatedContextChanged) {
    updatedPaths.push(AGENT_CONTEXT_PATH);
  }

  const roundNotesPath = fromRepoRoot(ROUND_NOTES_PATH);
  const currentRoundNotes = await readTextIfExists(roundNotesPath);
  if (shouldAppendSessionStart(previousFingerprint, facts, drift)) {
    const nextRoundNumber = await getNextRoundNumber(roundNotesPath);
    const roundNote = renderRoundNote(
      nextRoundNumber,
      facts,
      drift,
      updatedPaths,
      referenceTimestamp,
    );
    const roundNotesChanged = await writeTextIfChanged(
      roundNotesPath,
      appendRoundNote(currentRoundNotes, roundNote),
    );
    if (roundNotesChanged) {
      updatedPaths.push(ROUND_NOTES_PATH);
    }
  }

  const outputHashes = await computeOutputHashes();
  const ideHashes = await computeIdeHashes(facts.requiredIdeTargets);
  const fingerprint: FingerprintState = {
    schemaVersion: 1,
    branch: facts.git.branch,
    headCommit: facts.git.headCommit,
    lastBootstrapTimestamp: referenceTimestamp,
    workingTreeHash: sha256(stableStringify(facts.git.changedFiles)),
    repoFactsHash,
    structuralHash,
    knowledgeHash,
    knowledgeStatus: facts.knowledgeInventory.governanceStatus,
    driftLevel: drift.level,
    driftReasons: drift.reasons,
    structuralFiles,
    criticalInputHashes: inputHashes,
    referenceOutputHashes: outputHashes,
    ideMirrorHashes: ideHashes,
    referenceStatus: {
      sessionStateCurrent: true,
      roundNotesCurrent: true,
      codeMapCurrent: true,
      mindMapCurrent: true,
      ideMirrorsCurrent: true,
      knowledgeCurrent: true,
    },
  };

  const fingerprintChanged = await writeTextIfChanged(
    fromRepoRoot(FINGERPRINT_PATH),
    stableStringify(fingerprint),
  );
  if (fingerprintChanged) {
    updatedPaths.push(FINGERPRINT_PATH);
  }

  console.log(renderStartupBrief(facts, drift, updatedPaths, facts.openIssues));
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`فشل bootstrap: ${message}`);
  process.exit(1);
});
