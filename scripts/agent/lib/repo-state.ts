import { promises as fsp } from "node:fs";
import { Socket } from "node:net";
import path from "node:path";

import {
  AGENT_CONTEXT_PATH,
  CODE_MAP_FILES,
  FINGERPRINT_PATH,
  IDE_CANDIDATES,
  INPUT_FACT_FILES,
  MANUAL_CONTRACT_FILES,
  MIND_MAP_FILES,
  PROJECT_RULES_PATH,
  RAG_CONTRACT_PATH,
  ROUND_NOTES_PATH,
  SESSION_STATE_PATH,
  type DriftLevel,
} from "./constants";
import { collectKnowledgeInventory, type KnowledgeInventory } from "./knowledge-systems";
import { collectCodeMemoryHealth } from "./code-memory/status";
import type { CodeMemoryHealth } from "./code-memory/types";
import {
  fileExists,
  formatTimestamp,
  fromRepoRoot,
  readJsonIfExists,
  readTextIfExists,
  runGitCommand,
  sha256,
  sha256FileIfExists,
  stableStringify,
  toPosixPath,
} from "./utils";

export interface GitState {
  branch: string;
  headCommit: string;
  workingTreeClean: boolean;
  changedFiles: string[];
}

export interface WorkspaceApp {
  name: string;
  path: string;
}

export interface IdeTarget {
  id: string;
  label: string;
  path: string;
  kind: "markdown" | "cursor-rule";
  exists: boolean;
  referencedBySpecify: boolean;
  adopted: boolean;
  required: boolean;
  reasons: string[];
}

export interface RepoFacts {
  git: GitState;
  packageManager: string;
  workspacePatterns: string[];
  rootScripts: string[];
  officialCommands: string[];
  webPort: number | null;
  backendPort: number | null;
  apps: WorkspaceApp[];
  packages: WorkspaceApp[];
  entrypoints: string[];
  requiredIdeTargets: IdeTarget[];
  specifiedIdeTargets: string[];
  openIssues: string[];
  referenceFiles: string[];
  knowledgeInventory: KnowledgeInventory;
  codeMemory: CodeMemoryHealth;
}

export interface ReferenceStatus {
  sessionStateCurrent: boolean;
  roundNotesCurrent: boolean;
  codeMapCurrent: boolean;
  mindMapCurrent: boolean;
  ideMirrorsCurrent: boolean;
  knowledgeCurrent: boolean;
}

export interface FingerprintState {
  schemaVersion: number;
  branch: string;
  headCommit: string;
  lastBootstrapTimestamp: string;
  workingTreeHash: string;
  repoFactsHash: string;
  structuralHash: string;
  knowledgeHash: string;
  knowledgeStatus: KnowledgeInventory["governanceStatus"];
  driftLevel: DriftLevel;
  driftReasons: string[];
  structuralFiles: string[];
  criticalInputHashes: Record<string, string>;
  referenceOutputHashes: Record<string, string>;
  ideMirrorHashes: Record<string, string>;
  referenceStatus: ReferenceStatus;
}

export interface DriftResult {
  level: DriftLevel;
  reasons: string[];
}

function parseWorkspacePatterns(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-"))
    .map((line) => line.replace(/^-+\s*/, "").replace(/^["']|["']$/g, ""))
    .filter(Boolean);
}

function extractPortFromScript(script: string | undefined): number | null {
  if (!script) {
    return null;
  }

  const match = script.match(/-p\s+(\d{2,5})/);
  return match ? Number(match[1]) : null;
}

function extractBackendPortFromDoctor(content: string): number | null {
  const match = content.match(/Port\s+(\d{2,5})\s+\(backend\)/);
  return match ? Number(match[1]) : null;
}

function extractSpecifyTargets(content: string): string[] {
  const matches = content.matchAll(/Join-Path \$REPO_ROOT '([^']+)'/g);
  return [...matches]
    .map((match) => toPosixPath(match[1]))
    .filter((value, index, all) => all.indexOf(value) === index)
    .sort();
}

function hasMergeMarkers(content: string): boolean {
  return /^(<<<<<<<|=======|>>>>>>>)/m.test(content);
}

function hasLegacyEditorRelativeUrls(content: string): boolean {
  return (
    /^NEXT_PUBLIC_FILE_IMPORT_BACKEND_URL=\/api\/file-extract/m.test(content) ||
    /^NEXT_PUBLIC_FINAL_REVIEW_BACKEND_URL=\/api\/final-review/m.test(content)
  );
}

function hasLegacyViteEditorVars(content: string): boolean {
  return (
    /^VITE_FILE_IMPORT_BACKEND_URL=/m.test(content) ||
    /^VITE_AGENT_REVIEW_FAIL_OPEN=/m.test(content)
  );
}

function probeTcpPort(host: string, port: number, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new Socket();
    let settled = false;

    const finish = (value: boolean) => {
      if (settled) {
        return;
      }

      settled = true;
      socket.destroy();
      resolve(value);
    };

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));

    try {
      socket.connect(port, host);
    } catch {
      finish(false);
    }
  });
}

async function probeHttpReady(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(timeoutMs),
    });
    return response.ok;
  } catch {
    return false;
  }
}

async function collectCurrentOpenIssues(
  rootEnvExampleText: string,
  backendPackage: { scripts?: Record<string, string> },
  databaseGuideText: string,
): Promise<string[]> {
  const issues: string[] = [];

  if (hasMergeMarkers(databaseGuideText)) {
    issues.push("`docs/DATABASE.md` يحتوي merge markers");
  }

  if (backendPackage.scripts?.["test:mongodb"]) {
    issues.push("سكربت `test:mongodb` ما زال يشير إلى مسار مكسور");
  }

  if (hasLegacyEditorRelativeUrls(rootEnvExampleText)) {
    issues.push("ملف البيئة النموذجي ما زال يضع عناوين editor runtime نسبية بدل العناوين الرسمية الكاملة");
  }

  if (hasLegacyViteEditorVars(rootEnvExampleText)) {
    issues.push("ملف البيئة النموذجي ما زال يحمل متغيرات Vite قديمة لمسار المحرر");
  }

  const [postgresReady, redisReady, weaviateReady] = await Promise.all([
    probeTcpPort("127.0.0.1", 5433, 750),
    probeTcpPort("127.0.0.1", 6379, 750),
    probeHttpReady("http://127.0.0.1:8080/v1/.well-known/ready", 1500),
  ]);

  const unavailableInfraPorts: string[] = [];
  if (!postgresReady) {
    unavailableInfraPorts.push("5433");
  }
  if (!redisReady) {
    unavailableInfraPorts.push("6379");
  }
  if (!weaviateReady) {
    unavailableInfraPorts.push("8080");
  }

  if (unavailableInfraPorts.length > 0) {
    issues.push(`لا توجد listeners محلية على \`${unavailableInfraPorts.join("` و `")}\` وقت الفحص`);
  }

  return issues;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

async function readPackageName(repoRelativePath: string): Promise<string> {
  const content = await readTextIfExists(fromRepoRoot(repoRelativePath));
  if (!content.trim()) {
    return path.basename(path.dirname(repoRelativePath));
  }

  try {
    const parsed = JSON.parse(content) as { name?: string };
    return parsed.name ?? path.basename(path.dirname(repoRelativePath));
  } catch {
    return path.basename(path.dirname(repoRelativePath));
  }
}

async function collectWorkspaceApps(basePath: "apps" | "packages"): Promise<WorkspaceApp[]> {
  const directory = fromRepoRoot(basePath);
  try {
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    const apps = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const repoRelative = toPosixPath(path.join(basePath, entry.name, "package.json"));
          if (!fileExists(repoRelative)) {
            return null;
          }
          return {
            name: await readPackageName(repoRelative),
            path: toPosixPath(path.join(basePath, entry.name)),
          } satisfies WorkspaceApp;
        }),
    );

    return apps
      .filter((entry): entry is WorkspaceApp => Boolean(entry))
      .sort((left, right) => left.path.localeCompare(right.path));
  } catch {
    return [];
  }
}

export async function computeInputHashes(filePaths: string[] = INPUT_FACT_FILES): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const repoRelativePath of uniqueSorted(filePaths)) {
    const hash = await sha256FileIfExists(fromRepoRoot(repoRelativePath));
    if (hash) {
      hashes[repoRelativePath] = hash;
    }
  }
  return hashes;
}

export async function computeOutputHashes(): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  const outputFiles = [
    AGENT_CONTEXT_PATH,
    SESSION_STATE_PATH,
    ROUND_NOTES_PATH,
    ...CODE_MAP_FILES,
    ...MIND_MAP_FILES,
  ];

  for (const repoRelativePath of outputFiles) {
    const hash = await sha256FileIfExists(fromRepoRoot(repoRelativePath), {
      ignoreVolatileGeneratedLines: true,
    });
    if (hash) {
      hashes[repoRelativePath] = hash;
    }
  }
  return hashes;
}

export async function computeIdeHashes(ideTargets: IdeTarget[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const ideTarget of ideTargets.filter((entry) => entry.required)) {
    const hash = await sha256FileIfExists(fromRepoRoot(ideTarget.path));
    if (hash) {
      hashes[ideTarget.path] = hash;
    }
  }
  return hashes;
}

export function createKnowledgeHash(knowledgeInventory: KnowledgeInventory): string {
  return sha256(
    stableStringify({
      governanceStatus: knowledgeInventory.governanceStatus,
      totalSystems: knowledgeInventory.totalSystems,
      systemTypes: knowledgeInventory.systemTypes,
      commands: knowledgeInventory.commands,
      entrypoints: knowledgeInventory.entrypoints,
      criticalFiles: knowledgeInventory.criticalFiles,
      embeddingsProviders: knowledgeInventory.embeddingsProviders,
      vectorStores: knowledgeInventory.vectorStores,
      rerankers: knowledgeInventory.rerankers,
      competingSignals: knowledgeInventory.competingSignals,
      ungovernedFiles: knowledgeInventory.ungovernedFiles,
      discoveryWarnings: knowledgeInventory.discoveryWarnings,
      systems: knowledgeInventory.systems.map((system) => ({
        id: system.id,
        category: system.category,
        policy: system.policy,
        status: system.status,
        entrypoints: system.entrypoints,
        criticalFiles: system.criticalFiles,
        inputs: system.inputs,
        artifacts: system.artifacts,
        dependencies: system.dependencies,
        embeddingsProviders: system.embeddingsProviders,
        vectorStores: system.vectorStores,
        rerankers: system.rerankers,
        governanceNotes: system.governanceNotes,
        components: system.components.map((component) => ({
          kind: component.kind,
          path: component.path,
          exists: component.exists,
        })),
      })),
    }),
  );
}

export async function collectRepoFacts(): Promise<RepoFacts> {
  const rootPackageText = await readTextIfExists(fromRepoRoot("package.json"));
  const rootPackage = JSON.parse(rootPackageText) as {
    packageManager?: string;
    scripts?: Record<string, string>;
  };
  const workspaceText = await readTextIfExists(fromRepoRoot("pnpm-workspace.yaml"));
  const webPackageText = await readTextIfExists(fromRepoRoot("apps/web/package.json"));
  const webPackage = JSON.parse(webPackageText) as { scripts?: Record<string, string> };
  const backendPackageText = await readTextIfExists(fromRepoRoot("apps/backend/package.json"));
  const backendPackage = JSON.parse(backendPackageText) as { scripts?: Record<string, string> };
  const rootEnvExampleText = await readTextIfExists(fromRepoRoot(".env.example"));
  const databaseGuideText = await readTextIfExists(fromRepoRoot("docs/DATABASE.md"));
  const doctorText = await readTextIfExists(fromRepoRoot("scripts/doctor.ps1"));
  const specifyText = await readTextIfExists(fromRepoRoot(".specify/scripts/powershell/update-agent-context.ps1"));
  const knowledgeInventory = await collectKnowledgeInventory();
  const codeMemory = await collectCodeMemoryHealth();
  const openIssues = await collectCurrentOpenIssues(rootEnvExampleText, backendPackage, databaseGuideText);

  const gitChangedFiles = runGitCommand(["status", "--short"])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => line.slice(3).trim());

  const specifiedIdeTargets = extractSpecifyTargets(specifyText);
  const requiredIdeTargets: IdeTarget[] = IDE_CANDIDATES.map((candidate) => {
    const exists = fileExists(candidate.path);
    const referencedBySpecify = specifiedIdeTargets.includes(candidate.path);
    const adopted = exists;
    const reasons: string[] = [];

    if (exists) {
      reasons.push("المسار موجود فعليًا");
    }
    if (referencedBySpecify) {
      reasons.push("السكربت يشير إليه صراحة");
    }
    if (adopted) {
      reasons.push("الأداة ظاهرة في مسار العمل الحالي");
    }

    return {
      ...candidate,
      exists,
      referencedBySpecify,
      adopted,
      required: exists || referencedBySpecify || adopted,
      reasons,
    };
  });

  const desiredOfficialCommands = [
    "dev",
    "start",
    "doctor",
    "verify:runtime",
    "agent:bootstrap",
    "agent:verify",
    "agent:refresh-maps",
    "agent:start",
    "agent:memory:index",
    "agent:memory:search",
    "agent:memory:status",
    "agent:memory:verify",
    "workspace:embed",
  ];

  const officialCommands = desiredOfficialCommands
    .filter((commandName) => Boolean(rootPackage.scripts?.[commandName]))
    .map((commandName) => `pnpm ${commandName}`);

  return {
    git: {
      branch: runGitCommand(["branch", "--show-current"]) || "unknown",
      headCommit: runGitCommand(["rev-parse", "HEAD"]) || "unknown",
      workingTreeClean: gitChangedFiles.length === 0,
      changedFiles: gitChangedFiles,
    },
    packageManager: rootPackage.packageManager ?? "pnpm",
    workspacePatterns: parseWorkspacePatterns(workspaceText),
    rootScripts: Object.keys(rootPackage.scripts ?? {}).sort(),
    officialCommands,
    webPort: extractPortFromScript(webPackage.scripts?.["dev:next-only"] ?? webPackage.scripts?.dev),
    backendPort: extractBackendPortFromDoctor(doctorText),
    apps: await collectWorkspaceApps("apps"),
    packages: await collectWorkspaceApps("packages"),
    entrypoints: uniqueSorted([
      "AGENTS.md",
      ".repo-agent/STARTUP-PROTOCOL.md",
      ".repo-agent/HANDOFF-PROTOCOL.md",
      RAG_CONTRACT_PATH,
      "scripts/agent/bootstrap.ts",
      "scripts/agent/verify-state.ts",
      "scripts/agent/refresh-maps.ts",
      "scripts/agent/start-agent.ps1",
      "scripts/agent/code-memory-index.ts",
      "scripts/agent/code-memory-search.ts",
      "scripts/agent/code-memory-status.ts",
      "scripts/agent/code-memory-verify.ts",
      "scripts/generate-workspace-embeddings.js",
      "apps/web/package.json",
      "apps/backend/package.json",
      "scripts/doctor.ps1",
      ...knowledgeInventory.entrypoints,
    ]),
    requiredIdeTargets,
    specifiedIdeTargets,
    openIssues: openIssues.slice(0, 8),
    referenceFiles: [
      PROJECT_RULES_PATH,
      SESSION_STATE_PATH,
      ROUND_NOTES_PATH,
      ...CODE_MAP_FILES,
      ...MIND_MAP_FILES,
      AGENT_CONTEXT_PATH,
      FINGERPRINT_PATH,
    ],
    knowledgeInventory,
    codeMemory,
  };
}

export function createFactsHash(facts: RepoFacts): string {
  return sha256(
    stableStringify({
      packageManager: facts.packageManager,
      workspacePatterns: facts.workspacePatterns,
      rootScripts: facts.rootScripts,
      officialCommands: facts.officialCommands,
      webPort: facts.webPort,
      backendPort: facts.backendPort,
      apps: facts.apps,
      packages: facts.packages,
      entrypoints: facts.entrypoints,
      ideTargets: facts.requiredIdeTargets.map((target) => ({
        path: target.path,
        required: target.required,
        referencedBySpecify: target.referencedBySpecify,
      })),
      knowledgeInventory: {
        governanceStatus: facts.knowledgeInventory.governanceStatus,
        totalSystems: facts.knowledgeInventory.totalSystems,
        systemTypes: facts.knowledgeInventory.systemTypes,
        commands: facts.knowledgeInventory.commands,
        entrypoints: facts.knowledgeInventory.entrypoints,
        criticalFiles: facts.knowledgeInventory.criticalFiles,
        competingSignals: facts.knowledgeInventory.competingSignals,
        ungovernedFiles: facts.knowledgeInventory.ungovernedFiles,
        discoveryWarnings: facts.knowledgeInventory.discoveryWarnings,
        systems: facts.knowledgeInventory.systems.map((system) => ({
          id: system.id,
          category: system.category,
          policy: system.policy,
          status: system.status,
          inputs: system.inputs,
          artifacts: system.artifacts,
          dependencies: system.dependencies,
        })),
      },
      codeMemory: {
        exists: facts.codeMemory.exists,
        stale: facts.codeMemory.stale,
        totalFiles: facts.codeMemory.totalFiles,
        totalChunks: facts.codeMemory.totalChunks,
        embeddedChunks: facts.codeMemory.embeddedChunks,
        coverageRate: facts.codeMemory.coverageRate,
        storage: facts.codeMemory.storage,
      },
    }),
  );
}

export function createStructuralHash(structuralFiles: string[], criticalInputHashes: Record<string, string>): string {
  return sha256(
    stableStringify({
      structuralFiles,
      hashes: Object.fromEntries(
        structuralFiles.map((filePath) => [filePath, criticalInputHashes[filePath] ?? "missing"]),
      ),
    }),
  );
}

export function collectStructuralFiles(facts: RepoFacts): string[] {
  const packageFiles = facts.apps
    .map((entry) => `${entry.path}/package.json`)
    .concat(facts.packages.map((entry) => `${entry.path}/package.json`));

  return uniqueSorted([
    "package.json",
    "pnpm-workspace.yaml",
    "turbo.json",
    "apps/web/package.json",
    "apps/backend/package.json",
    "scripts/doctor.ps1",
    RAG_CONTRACT_PATH,
    ...packageFiles,
    ...facts.knowledgeInventory.criticalFiles,
  ]);
}

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

  const missingIdeMirror = requiredIdeTargets.some((target) => target.required && !target.exists);
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

export async function readFingerprint(): Promise<FingerprintState | null> {
  return readJsonIfExists<FingerprintState>(fromRepoRoot(FINGERPRINT_PATH));
}

export async function readPreviousSessionState(): Promise<string> {
  return readTextIfExists(fromRepoRoot(SESSION_STATE_PATH));
}

export async function verifyManualContractsExist(): Promise<string[]> {
  const missing: string[] = [];
  for (const repoRelativePath of MANUAL_CONTRACT_FILES) {
    if (!fileExists(repoRelativePath)) {
      missing.push(repoRelativePath);
    }
  }
  return missing;
}
