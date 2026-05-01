import { promises as fsp } from "node:fs";
import path from "node:path";

import {
  IDE_CANDIDATES,
  RAG_CONTRACT_PATH,
  TOOL_GUARD_CONTRACT_PATH,
  PROJECT_RULES_PATH,
  SESSION_STATE_PATH,
  ROUND_NOTES_PATH,
  CODE_MAP_FILES,
  MIND_MAP_FILES,
  AGENT_CONTEXT_PATH,
  PERSISTENT_MEMORY_CONTEXT_PATH,
  FINGERPRINT_PATH,
  MANUAL_CONTRACT_FILES,
} from "./constants";
import {
  collectKnowledgeInventory,
  type KnowledgeInventory,
} from "./knowledge-systems";
import { collectCodeMemoryHealth } from "./code-memory/status";
import type { CodeMemoryHealth } from "./code-memory/types";
import {
  fileExists,
  fromRepoRoot,
  readJsonIfExists,
  readTextIfExists,
  runGitCommand,
  toPosixPath,
} from "./utils";
import {
  parseWorkspacePatterns,
  extractPortFromScript,
  extractBackendPortFromDoctor,
  extractSpecifyTargets,
  hasMergeMarkers,
  hasLegacyEditorRelativeUrls,
  hasLegacyViteEditorVars,
  uniqueSorted,
} from "./repo-state-parsers";
import { probeTcpPort, probeHttpReady } from "./repo-state-probers";
import type {
  GitState,
  WorkspaceApp,
  IdeTarget,
  RepoFacts,
} from "./repo-state-types";

/**
 * Read package name from package.json file
 */
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

/**
 * Collect workspace apps or packages
 */
async function collectWorkspaceApps(
  basePath: "apps" | "packages",
): Promise<WorkspaceApp[]> {
  const directory = fromRepoRoot(basePath);
  try {
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    const apps = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map(async (entry) => {
          const repoRelative = toPosixPath(
            path.join(basePath, entry.name, "package.json"),
          );
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

/**
 * Collect current open issues from various sources
 */
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
    issues.push(
      "ملف البيئة النموذجي ما زال يضع عناوين editor runtime نسبية بدل العناوين الرسمية الكاملة",
    );
  }

  if (hasLegacyViteEditorVars(rootEnvExampleText)) {
    issues.push(
      "ملف البيئة النموذجي ما زال يحمل متغيرات Vite قديمة لمسار المحرر",
    );
  }

  const [postgresReady, redisReady, weaviateReady, qdrantReady] =
    await Promise.all([
    probeTcpPort("127.0.0.1", 5433, 750),
    probeTcpPort("127.0.0.1", 6379, 750),
    probeHttpReady("http://127.0.0.1:8080/v1/.well-known/ready", 1500),
    probeHttpReady("http://127.0.0.1:6333/readyz", 1500),
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
  if (!qdrantReady) {
    unavailableInfraPorts.push("6333");
  }

  if (unavailableInfraPorts.length > 0) {
    issues.push(
      `لا توجد listeners محلية على \`${unavailableInfraPorts.join("` و `")}\` وقت الفحص`,
    );
  }

  return issues;
}

/**
 * Collect repository facts
 */
export async function collectRepoFacts(): Promise<RepoFacts> {
  const rootPackageText = await readTextIfExists(fromRepoRoot("package.json"));
  const rootPackage = JSON.parse(rootPackageText) as {
    packageManager?: string;
    scripts?: Record<string, string>;
  };
  const workspaceText = await readTextIfExists(
    fromRepoRoot("pnpm-workspace.yaml"),
  );
  const webPackageText = await readTextIfExists(
    fromRepoRoot("apps/web/package.json"),
  );
  const webPackage = JSON.parse(webPackageText) as {
    scripts?: Record<string, string>;
  };
  const backendPackageText = await readTextIfExists(
    fromRepoRoot("apps/backend/package.json"),
  );
  const backendPackage = JSON.parse(backendPackageText) as {
    scripts?: Record<string, string>;
  };
  const rootEnvExampleText = await readTextIfExists(
    fromRepoRoot(".env.example"),
  );
  const databaseGuideText = await readTextIfExists(
    fromRepoRoot("docs/DATABASE.md"),
  );
  const doctorText = await readTextIfExists(fromRepoRoot("scripts/doctor.ps1"));
  const specifyText = await readTextIfExists(
    fromRepoRoot(".specify/scripts/powershell/update-agent-context.ps1"),
  );
  const knowledgeInventory = await collectKnowledgeInventory();
  const codeMemory = await collectCodeMemoryHealth();
  const openIssues = await collectCurrentOpenIssues(
    rootEnvExampleText,
    backendPackage,
    databaseGuideText,
  );

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
    "agent:guard:start",
    "agent:guard:step",
    "agent:guard:verify",
    "agent:refresh-maps",
    "agent:start",
    "agent:memory:index",
    "agent:memory:search",
    "agent:memory:status",
    "agent:memory:verify",
    "agent:memory:watch",
    "agent:persistent-memory:secrets:scan",
    "agent:persistent-memory:secrets:verify",
    "agent:persistent-memory:secrets:purge",
    "agent:persistent-memory:init",
    "agent:persistent-memory:migrate",
    "agent:persistent-memory:index",
    "agent:persistent-memory:watch",
    "agent:persistent-memory:search",
    "agent:persistent-memory:ingest",
    "agent:persistent-memory:retrieve",
    "agent:persistent-memory:workers",
    "agent:persistent-memory:status",
    "agent:persistent-memory:eval",
    "agent:persistent-memory:eval:golden",
    "agent:persistent-memory:eval:safety",
    "workspace:embed",
    "infra:up",
    "infra:down",
    "infra:status",
    "infra:logs",
    "infra:reset",
  ];

  const officialCommands = desiredOfficialCommands
    .filter((commandName) => Boolean(rootPackage.scripts?.[commandName]))
    .map((commandName) =>
      commandName === "doctor" ? "pnpm run doctor" : `pnpm ${commandName}`,
    );

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
    webPort: extractPortFromScript(
      webPackage.scripts?.["dev:next-only"] ?? webPackage.scripts?.dev,
    ),
    backendPort: extractBackendPortFromDoctor(doctorText),
    apps: await collectWorkspaceApps("apps"),
    packages: await collectWorkspaceApps("packages"),
    entrypoints: uniqueSorted([
      "AGENTS.md",
      ".repo-agent/STARTUP-PROTOCOL.md",
      ".repo-agent/HANDOFF-PROTOCOL.md",
      RAG_CONTRACT_PATH,
      TOOL_GUARD_CONTRACT_PATH,
      "scripts/agent/bootstrap.ts",
      "scripts/agent/guard.ts",
      "scripts/agent/verify-state.ts",
      "scripts/agent/refresh-maps.ts",
      "scripts/agent/start-agent.ps1",
      "scripts/agent/code-memory-watch.ts",
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
      PERSISTENT_MEMORY_CONTEXT_PATH,
      FINGERPRINT_PATH,
    ],
    knowledgeInventory,
    codeMemory,
  };
}

/**
 * Collect structural files from repo facts
 */
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
    TOOL_GUARD_CONTRACT_PATH,
    ...packageFiles,
    ...facts.knowledgeInventory.criticalFiles,
  ]);
}
