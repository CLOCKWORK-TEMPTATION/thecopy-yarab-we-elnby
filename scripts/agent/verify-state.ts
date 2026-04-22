import fs from "node:fs";

import {
  AGENT_CONTEXT_PATH,
  FINGERPRINT_PATH,
  IDE_CANDIDATES,
  MANUAL_GUIDANCE_FILES,
  SESSION_STATE_PATH,
} from "./lib/constants";
import {
  collectRepoFacts,
  collectStructuralFiles,
  computeIdeHashes,
  computeInputHashes,
  computeOutputHashes,
  createFactsHash,
  createKnowledgeHash,
  createStructuralHash,
  readFingerprint,
} from "./lib/repo-state";
import { readTextIfExists, fromRepoRoot } from "./lib/utils";
import { verifyIdeMirrorContent, verifyManualGuidanceContent, type VerificationIssue } from "./lib/verify";

async function main(): Promise<void> {
  const issues: VerificationIssue[] = [];
  const fingerprint = await readFingerprint();

  if (!fingerprint) {
    throw new Error("لا توجد بصمة حالة حالية. شغّل pnpm agent:bootstrap أولًا.");
  }

  const facts = await collectRepoFacts();
  const structuralFiles = collectStructuralFiles(facts);
  const inputHashes = await computeInputHashes(structuralFiles);
  const outputHashes = await computeOutputHashes();
  const ideHashes = await computeIdeHashes(facts.requiredIdeTargets);
  const repoFactsHash = createFactsHash(facts);
  const knowledgeHash = createKnowledgeHash(facts.knowledgeInventory);
  const structuralHash = createStructuralHash(structuralFiles, inputHashes);

  if (fingerprint.repoFactsHash !== repoFactsHash) {
    issues.push({ level: "error", message: "الحقيقة التشغيلية الحالية تغيّرت بعد آخر bootstrap." });
  }

  if (fingerprint.structuralHash !== structuralHash) {
    issues.push({ level: "error", message: "الملفات البنيوية الحرجة تغيّرت بعد آخر بصمة." });
  }

  if (fingerprint.knowledgeHash !== knowledgeHash) {
    issues.push({ level: "error", message: "طبقة المعرفة والاسترجاع تغيّرت بعد آخر bootstrap." });
  }

  for (const [filePath, hash] of Object.entries(outputHashes)) {
    if (fingerprint.referenceOutputHashes[filePath] && fingerprint.referenceOutputHashes[filePath] !== hash) {
      issues.push({ level: "error", message: `المرجع المولد stale: ${filePath}` });
    }
  }

  for (const [filePath, hash] of Object.entries(ideHashes)) {
    if (fingerprint.ideMirrorHashes[filePath] && fingerprint.ideMirrorHashes[filePath] !== hash) {
      issues.push({ level: "error", message: `مرآة IDE تغيّرت خارج bootstrap: ${filePath}` });
    }
  }

  const agentsContent = await readTextIfExists(fromRepoRoot("AGENTS.md"));
  if (!agentsContent.includes("pnpm agent:bootstrap") || !agentsContent.includes("output/session-state.md")) {
    issues.push({ level: "error", message: "AGENTS.md لم يعد يحيل إلى bootstrap أو الحالة الحية." });
  }

  const generatedContext = await readTextIfExists(fromRepoRoot(AGENT_CONTEXT_PATH));
  if (!generatedContext.includes("output/session-state.md")) {
    issues.push({ level: "error", message: "الملف المولد لا يشير إلى المصدر الوحيد للحالة." });
  }
  if (!generatedContext.includes(".repo-agent/RAG-OPERATING-CONTRACT.md")) {
    issues.push({ level: "error", message: "الملف المولد لا يربط طبقة المعرفة والاسترجاع بعقدها التشغيلي." });
  }

  const myAgentContent = await readTextIfExists(fromRepoRoot(".github/agents/my-agent.md"));
  if (!myAgentContent.includes("AGENTS.md") || !myAgentContent.includes("output/session-state.md")) {
    issues.push({ level: "error", message: ".github/agents/my-agent.md ما زال لا يعمل كمرآة مرجعية." });
  }

  for (const manualGuidanceFile of MANUAL_GUIDANCE_FILES) {
    const content = await readTextIfExists(fromRepoRoot(manualGuidanceFile));
    issues.push(...verifyManualGuidanceContent(manualGuidanceFile, content));
  }

  if (facts.knowledgeInventory.totalSystems === 0) {
    issues.push({ level: "error", message: "لم يعد الجرد المرجعي يكتشف أي نظام معرفة أو استرجاع رغم وجود الطبقة." });
  }

  if (facts.knowledgeInventory.ungovernedFiles.length > 0) {
    for (const filePath of facts.knowledgeInventory.ungovernedFiles) {
      issues.push({ level: "error", message: `يوجد ملف معرفة أو استرجاع خارج الحوكمة المرجعية: ${filePath}` });
    }
  }

  if (facts.knowledgeInventory.discoveryWarnings.length > 0) {
    for (const warning of facts.knowledgeInventory.discoveryWarnings) {
      issues.push({ level: "error", message: warning });
    }
  }

  if (!facts.knowledgeInventory.commands.includes("pnpm workspace:embed")) {
    issues.push({ level: "error", message: "أمر workspace:embed غير ممثل داخل الجرد المرجعي لطبقة المعرفة." });
  }

  if (facts.knowledgeInventory.totalSystems < 4) {
    issues.push({ level: "error", message: "الجرد المرجعي لا يغطي أربعة أنظمة معرفة على الأقل بعد إدخال نظام المحرر." });
  }

  if (!facts.knowledgeInventory.systems.some((system) => system.id === "editor-code-rag")) {
    issues.push({ level: "error", message: "نظام editor-code-rag غير ممثل داخل الجرد المرجعي." });
  }

  const sessionStateContent = await readTextIfExists(fromRepoRoot(SESSION_STATE_PATH));
  if (!sessionStateContent.includes("طبقة المعرفة والاسترجاع")) {
    issues.push({ level: "error", message: "session-state لا يصف حالة طبقة المعرفة والاسترجاع." });
  }

  const ragSystemsMap = await readTextIfExists(fromRepoRoot("output/code-map/rag-systems.md"));
  if (!ragSystemsMap.trim()) {
    issues.push({ level: "error", message: "rag-systems map مفقود أو فارغ." });
  }

  const ragEntrypointsMap = await readTextIfExists(fromRepoRoot("output/code-map/rag-entrypoints.md"));
  if (!ragEntrypointsMap.trim()) {
    issues.push({ level: "error", message: "rag-entrypoints map مفقود أو فارغ." });
  }

  const ragTopology = await readTextIfExists(fromRepoRoot("output/mind-map/rag-topology.mmd"));
  if (!ragTopology.trim()) {
    issues.push({ level: "error", message: "rag-topology mind map مفقود أو فارغ." });
  }

  const specifyContent = await readTextIfExists(fromRepoRoot(".specify/scripts/powershell/update-agent-context.ps1"));
  if (specifyContent.includes("Join-Path $REPO_ROOT 'AGENTS.md'")) {
    issues.push({ level: "error", message: "سكربت specify ما زال قادرًا على التوجيه المباشر إلى AGENTS.md." });
  }

  for (const ideTarget of facts.requiredIdeTargets.filter((target) => target.required)) {
    const absolutePath = fromRepoRoot(ideTarget.path);
    const content = await readTextIfExists(absolutePath);
    if (!content.trim()) {
      issues.push({ level: "error", message: `ملف IDE مطلوب لكنه مفقود أو فارغ: ${ideTarget.path}` });
      continue;
    }

    issues.push(...verifyIdeMirrorContent(ideTarget, content));
  }

  const unexpectedIdeFiles = IDE_CANDIDATES.filter((target) => {
    const isRequired = facts.requiredIdeTargets.some((entry) => entry.path === target.path && entry.required);
    const exists = fs.existsSync(fromRepoRoot(target.path));
    return exists && !isRequired;
  });

  for (const ideFile of unexpectedIdeFiles) {
    issues.push({
      level: "error",
      message: `تم إنشاء ملف IDE بلا استحقاق وفق القاعدة الحاكمة: ${ideFile.path}`,
    });
  }

  if (!fs.existsSync(fromRepoRoot(SESSION_STATE_PATH))) {
    issues.push({ level: "error", message: "ملف session-state مفقود." });
  }

  if (!fs.existsSync(fromRepoRoot(FINGERPRINT_PATH))) {
    issues.push({ level: "error", message: "ملف البصمة مفقود." });
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`- ${issue.message}`);
    }
    process.exit(1);
  }

  console.log("نجح التحقق النهائي لطبقة الوكلاء.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`فشل verify: ${message}`);
  process.exit(1);
});
