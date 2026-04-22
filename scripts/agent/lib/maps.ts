import type { RepoFacts } from "./repo-state";

export interface MapFile {
  path: string;
  content: string;
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function renderDependencyGraph(facts: RepoFacts): string {
  const ragNodes = facts.knowledgeInventory.systems
    .map((system) => `    Agents --> ${system.id}[\"${system.label}\"]`)
    .join("\n");

  return `# الرسم الاعتمادي العالي

\`\`\`mermaid
flowchart LR
    Root["Root workspace"] --> Agents["طبقة الوكلاء"]
    Root --> Web["apps/web"]
    Root --> Backend["apps/backend"]
    Root --> Packages["packages/*"]

    Agents --> Contract["AGENTS.md"]
    Agents --> Operating[".repo-agent/OPERATING-CONTRACT.md"]
    Agents --> RAGContract[".repo-agent/RAG-OPERATING-CONTRACT.md"]
    Agents --> Session["output/session-state.md"]
    Agents --> CodeMap["output/code-map/*"]
    Agents --> MindMap["output/mind-map/*"]
    Agents --> IDE["IDE mirrors"]
${ragNodes ? `${ragNodes}\n` : ""}    Web --> Backend
    Web --> Packages
    Backend --> Packages
    IDE --> Contract
    IDE --> Session
\`\`\`
`;
}

function renderCodeMapMarkdown(facts: RepoFacts): string {
  return `# Code Map

## نظرة تنفيذية

هذا المرجع مولد من الحقيقة الحالية للمستودع، لا من README.

- مدير الحزم الرسمي:

\`\`\`text
${facts.packageManager}
\`\`\`

- مساحة العمل:

\`\`\`text
${facts.workspacePatterns.join("\n")}
\`\`\`

- الأوامر الرسمية الحالية:

\`\`\`text
${facts.officialCommands.join("\n")}
\`\`\`

## التطبيقات الأساسية

${facts.apps.map((entry) => `- \`${entry.name}\` — \`${entry.path}\``).join("\n")}

## الحزم الأساسية

${facts.packages.map((entry) => `- \`${entry.name}\` — \`${entry.path}\``).join("\n")}

## نقاط الدخول الأهم

${facts.entrypoints.map((entry) => `- \`${entry}\``).join("\n")}

## طبقة الوكلاء

- العقد الأعلى المختصر:

\`\`\`text
AGENTS.md
\`\`\`

- العقد التشغيلي الكامل:

\`\`\`text
.repo-agent/OPERATING-CONTRACT.md
\`\`\`

- عقد طبقة المعرفة والاسترجاع:

\`\`\`text
.repo-agent/RAG-OPERATING-CONTRACT.md
\`\`\`

- المصدر الوحيد للحالة:

\`\`\`text
output/session-state.md
\`\`\`

## طبقة المعرفة والاسترجاع

- عدد الأنظمة المكتشفة:

\`${facts.knowledgeInventory.totalSystems}\`

- الحالة الحاكمة:

\`${facts.knowledgeInventory.governanceStatus}\`

- الأنواع:

${facts.knowledgeInventory.systemTypes.map((type) => `- \`${type}\``).join("\n") || "- لا توجد أنظمة معرفة مكتشفة."}
`;
}

function renderEntrypointsMarkdown(facts: RepoFacts): string {
  return `# نقاط الدخول

## أوامر الجذر

${facts.officialCommands.map((command) => `- \`${command}\``).join("\n")}

## ملفات الوكلاء

- \`AGENTS.md\`
- \`.repo-agent/OPERATING-CONTRACT.md\`
- \`.repo-agent/RAG-OPERATING-CONTRACT.md\`
- \`.repo-agent/STARTUP-PROTOCOL.md\`
- \`.repo-agent/HANDOFF-PROTOCOL.md\`
- \`.repo-agent/AGENT-CONTEXT.generated.md\`
- \`.repo-agent/state-fingerprint.json\`

## نقاط دخول المعرفة والاسترجاع

${facts.knowledgeInventory.entrypoints.map((entry) => `- \`${entry}\``).join("\n") || "- لا توجد نقاط دخول معرفة مكتشفة."}

## التطبيقات

${facts.apps.map((entry) => `- \`${entry.path}\``).join("\n")}
`;
}

function renderFindingsMarkdown(facts: RepoFacts): string {
  return `# Findings

## الحقائق الحالية

- الويب الرسمي يعمل على المنفذ \`${facts.webPort ?? "غير محسوم"}\`
- الخلفية المرجعية تعمل على المنفذ \`${facts.backendPort ?? "غير محسوم"}\`
- لا يوجد مصدر أعلى للحقيقة غير \`AGENTS.md\` والعقد التشغيلي الكامل
- \`output/session-state.md\` هو المصدر الوحيد للحالة الحالية
- طبقة المعرفة والاسترجاع الحالية حالتها \`${facts.knowledgeInventory.governanceStatus}\`

## إشارات التشتت أو المنافسة

${facts.knowledgeInventory.competingSignals.map((signal) => `- ${signal}`).join("\n") || "- لا توجد إشارات منافسة موثقة حاليًا."}

## تحذيرات الكشف

${facts.knowledgeInventory.discoveryWarnings.map((warning) => `- ${warning}`).join("\n") || "- لا توجد تحذيرات كشف مفتوحة."}

## الملفات غير المحكومة مرجعيًا

${facts.knowledgeInventory.ungovernedFiles.map((filePath) => `- \`${filePath}\``).join("\n") || "- لا توجد ملفات معرفة غير محكومة مكتشفة."}
`;
}

function renderRuntimeFlowsMarkdown(facts: RepoFacts): string {
  return `# Runtime Flows

## المسار المؤتمت

1. \`pnpm agent:start\`
2. \`pnpm agent:bootstrap\`
3. قراءة \`output/session-state.md\`
4. تنفيذ المهمة
5. \`pnpm agent:verify\`

## مسار IDE

1. قراءة \`AGENTS.md\`
2. قراءة \`output/session-state.md\`
3. قراءة ما يلزم من الخرائط
4. إخراج brief يثبت القراءة
5. تنفيذ المهمة
6. تحديث \`output/round-notes.md\`
7. تحديث \`output/session-state.md\` عند تغير الحقيقة

## طبقة المعرفة والاسترجاع

1. يتم اكتشافها داخل bootstrap
2. يتم إدراجها داخل session-state والسياق المولد
3. تدخل في fingerprint
4. يفشل verify عند drift معرفي أو استرجاعي

## المنافذ الحالية

- الويب: \`${facts.webPort ?? "غير محسوم"}\`
- الخلفية: \`${facts.backendPort ?? "غير محسوم"}\`
`;
}

function renderRagSystemsMarkdown(facts: RepoFacts): string {
  return `# RAG Systems

هذا الملف مولد داخل نظام الخرائط المرجعي الحالي، وليس مرجعًا أعلى مستقلًا.

## الحالة العامة

- governance status: \`${facts.knowledgeInventory.governanceStatus}\`
- total systems: \`${facts.knowledgeInventory.totalSystems}\`

## الأنظمة المكتشفة

${facts.knowledgeInventory.systems
  .map(
    (system) => `### ${system.label}

- id: \`${system.id}\`
- category: \`${system.category}\`
- policy: \`${system.policy}\`
- status: \`${system.status}\`
- root: \`${system.root}\`
- description: ${system.description}
- commands:
${system.commands.map((command) => `  - \`${command}\``).join("\n") || "  - none"}
- entrypoints:
${system.entrypoints.map((entry) => `  - \`${entry}\``).join("\n") || "  - none"}
- inputs:
${system.inputs.map((input) => `  - \`${input}\``).join("\n") || "  - none"}
- artifacts:
${system.artifacts.map((artifact) => `  - \`${artifact}\``).join("\n") || "  - none"}
- dependencies:
${system.dependencies.map((dependency) => `  - \`${dependency}\``).join("\n") || "  - none"}
- embeddings providers:
${system.embeddingsProviders.map((provider) => `  - \`${provider}\``).join("\n") || "  - none"}
- vector stores:
${system.vectorStores.map((store) => `  - \`${store}\``).join("\n") || "  - none"}
- rerankers:
${system.rerankers.map((reranker) => `  - \`${reranker}\``).join("\n") || "  - none"}
- governance notes:
${system.governanceNotes.map((note) => `  - ${note}`).join("\n") || "  - none"}`,
  )
  .join("\n\n") || "لا توجد أنظمة معرفة واسترجاع مكتشفة."}
`;
}

function renderRagEntrypointsMarkdown(facts: RepoFacts): string {
  const entrypoints = uniqueSorted(facts.knowledgeInventory.entrypoints);
  const commands = uniqueSorted(facts.knowledgeInventory.commands);

  return `# RAG Entrypoints

## Commands

${commands.map((command) => `- \`${command}\``).join("\n") || "- لا توجد أوامر معرفة واسترجاع مكتشفة."}

## Entrypoints

${entrypoints.map((entry) => `- \`${entry}\``).join("\n") || "- لا توجد نقاط دخول معرفة واسترجاع مكتشفة."}

## Critical Files

${facts.knowledgeInventory.criticalFiles.map((filePath) => `- \`${filePath}\``).join("\n") || "- لا توجد ملفات حرجة مكتشفة."}
`;
}

function renderMindMapJson(facts: RepoFacts): string {
  return JSON.stringify(
    {
      root: "The Copy Agent Layer",
      nodes: [
        { id: "contract", label: "AGENTS.md" },
        { id: "operating", label: ".repo-agent/OPERATING-CONTRACT.md" },
        { id: "rag-contract", label: ".repo-agent/RAG-OPERATING-CONTRACT.md" },
        { id: "state", label: "output/session-state.md" },
        { id: "rounds", label: "output/round-notes.md" },
        { id: "code-map", label: "output/code-map/*" },
        { id: "mind-map", label: "output/mind-map/*" },
        ...facts.requiredIdeTargets
          .filter((target) => target.required)
          .map((target) => ({ id: target.id, label: target.path })),
        ...facts.knowledgeInventory.systems.map((system) => ({ id: system.id, label: system.label })),
      ],
    },
    null,
    2,
  );
}

function renderMindMapMermaid(facts: RepoFacts): string {
  const ideChildren = facts.requiredIdeTargets
    .filter((target) => target.required)
    .map((target) => `      ${target.id}[${target.label}]`)
    .join("\n");

  const ragChildren = facts.knowledgeInventory.systems
    .map((system) => `      ${system.id}[${system.label}]`)
    .join("\n");

  return `mindmap
  root((The Copy Agent Layer))
    Contracts
      AGENTS.md
      OPERATING-CONTRACT
      RAG-OPERATING-CONTRACT
      STARTUP-PROTOCOL
      HANDOFF-PROTOCOL
    Live State
      session-state
      round-notes
      code-map
      mind-map
    Automated Flow
      agent:start
      agent:bootstrap
      agent:verify
      agent:refresh-maps
    IDE Mirrors
${ideChildren || "      none[no mirrors required]"}
    Knowledge Layer
${ragChildren || "      none[no knowledge systems detected]"}
`;
}

function renderRagTopologyMermaid(facts: RepoFacts): string {
  const systems = facts.knowledgeInventory.systems;
  const lines = systems
    .map((system) => {
      const providers = system.embeddingsProviders.join(", ") || "none";
      const stores = system.vectorStores.join(", ") || "none";
      const artifacts = system.artifacts.join(", ") || "none";
      return `    ${system.id}[\"${system.label}\\n${system.category}\"] --> ${system.id}Policy[\"policy: ${system.policy}\"]\n    ${system.id}[\"${system.label}\\n${system.category}\"] --> ${system.id}Providers[\"providers: ${providers}\"]\n    ${system.id}[\"${system.label}\\n${system.category}\"] --> ${system.id}Stores[\"stores: ${stores}\"]\n    ${system.id}[\"${system.label}\\n${system.category}\"] --> ${system.id}Artifacts[\"artifacts: ${artifacts}\"]`;
    })
    .join("\n");

  return `flowchart TD
    Root["RAG Governance inside Agent Operating System"] --> Contract[".repo-agent/RAG-OPERATING-CONTRACT.md"]
    Root --> Session["output/session-state.md"]
    Root --> Fingerprint[".repo-agent/state-fingerprint.json"]
${lines ? `${lines}\n` : ""}`;
}

function renderMindMapMarkdown(facts: RepoFacts): string {
  return `# Mind Map

هذه الطبقة تمثل المرجع البصري السريع لطبقة تشغيل الوكلاء.

ابدأ دائمًا من:

\`\`\`text
AGENTS.md
output/session-state.md
\`\`\`

وحين تمس المهمة طبقة المعرفة والاسترجاع، ارجع أيضًا إلى:

\`\`\`text
.repo-agent/RAG-OPERATING-CONTRACT.md
output/code-map/rag-systems.md
output/code-map/rag-entrypoints.md
output/mind-map/rag-topology.mmd
\`\`\`

عدد أنظمة المعرفة والاسترجاع المكتشفة الآن: \`${facts.knowledgeInventory.totalSystems}\`
`;
}

function renderMindMapSummary(facts: RepoFacts): string {
  return `# Mind Map Summary

- العقد الأعلى المختصر: \`AGENTS.md\`
- المصدر الوحيد للحالة الحالية: \`output/session-state.md\`
- عدد مرايا IDE المطلوبة الآن: \`${facts.requiredIdeTargets.filter((target) => target.required).length}\`
- عدد أنظمة المعرفة والاسترجاع المكتشفة: \`${facts.knowledgeInventory.totalSystems}\`
- حالة حوكمة طبقة المعرفة والاسترجاع: \`${facts.knowledgeInventory.governanceStatus}\`
- المساران الرسميان الوحيدان: \`pnpm agent:start\` أو مسار IDE القائم على إثبات القراءة
`;
}

export function buildMapFiles(facts: RepoFacts): MapFile[] {
  return [
    {
      path: "output/code-map/code-map.json",
      content: JSON.stringify(
        {
          packageManager: facts.packageManager,
          workspacePatterns: facts.workspacePatterns,
          officialCommands: facts.officialCommands,
          ports: {
            frontend: facts.webPort,
            backend: facts.backendPort,
          },
          apps: facts.apps,
          packages: facts.packages,
          entrypoints: facts.entrypoints,
          ideMirrors: facts.requiredIdeTargets.filter((target) => target.required).map((target) => ({
            id: target.id,
            path: target.path,
            reasons: target.reasons,
          })),
          knowledgeInventory: facts.knowledgeInventory,
          openIssues: facts.openIssues,
        },
        null,
        2,
      ),
    },
    {
      path: "output/code-map/CODEMAP.md",
      content: renderCodeMapMarkdown(facts),
    },
    {
      path: "output/code-map/dependency-graph.md",
      content: renderDependencyGraph(facts),
    },
    {
      path: "output/code-map/entrypoints.md",
      content: renderEntrypointsMarkdown(facts),
    },
    {
      path: "output/code-map/findings.md",
      content: renderFindingsMarkdown(facts),
    },
    {
      path: "output/code-map/rag-systems.md",
      content: renderRagSystemsMarkdown(facts),
    },
    {
      path: "output/code-map/rag-entrypoints.md",
      content: renderRagEntrypointsMarkdown(facts),
    },
    {
      path: "output/code-map/runtime-flows.md",
      content: renderRuntimeFlowsMarkdown(facts),
    },
    {
      path: "output/mind-map/mindmap.json",
      content: renderMindMapJson(facts),
    },
    {
      path: "output/mind-map/MINDMAP.md",
      content: renderMindMapMarkdown(facts),
    },
    {
      path: "output/mind-map/mindmap-summary.md",
      content: renderMindMapSummary(facts),
    },
    {
      path: "output/mind-map/mindmap.mmd",
      content: renderMindMapMermaid(facts),
    },
    {
      path: "output/mind-map/rag-topology.mmd",
      content: renderRagTopologyMermaid(facts),
    },
  ];
}
