import type { DriftResult, FingerprintState, IdeTarget, RepoFacts } from "./repo-state";

function formatCodeBlockLines(lines: string[]): string {
  return `\`\`\`text\n${lines.join("\n")}\n\`\`\``;
}

function summarizeWorkingTree(facts: RepoFacts): string {
  if (facts.git.workingTreeClean) {
    return "نظيفة";
  }

  return `غير نظيفة — ${facts.git.changedFiles.length} ملف متغير`;
}

const HERO_LAYOUT_GUARDRAILS = [
  "تموضع الكروت السبعة في هيرو الصفحة الرئيسية ثابت ومرجعي عبر كل المقاسات.",
  "ممنوع إدخال breakpoint-based repositioning أو resize-driven layout updates لهذا التكوين إلا بطلب صريح جديد.",
  "الملفان الحاكمان لهذا القيد هما `apps/web/src/lib/hero-config.ts` و `apps/web/src/hooks/use-hero-animation.ts`.",
];

function renderKnowledgeSection(facts: RepoFacts): string {
  const systems = facts.knowledgeInventory.systems;
  const competing = facts.knowledgeInventory.competingSignals;
  const ungoverned = facts.knowledgeInventory.ungovernedFiles;
  const discoveryWarnings = facts.knowledgeInventory.discoveryWarnings;

  return `## طبقة المعرفة والاسترجاع

- الحالة الحاكمة:

\`${facts.knowledgeInventory.governanceStatus}\`

- عدد الأنظمة المكتشفة:

\`${facts.knowledgeInventory.totalSystems}\`

- الأنواع:

${facts.knowledgeInventory.systemTypes.map((type) => `- \`${type}\``).join("\n") || "- لا توجد أنظمة معرفة واسترجاع مكتشفة."}

- مزودو embeddings:

${facts.knowledgeInventory.embeddingsProviders.map((provider) => `- \`${provider}\``).join("\n") || "- لا توجد مزودات embeddings مكتشفة."}

- vector stores:

${facts.knowledgeInventory.vectorStores.map((store) => `- \`${store}\``).join("\n") || "- لا توجد vector stores مكتشفة."}

- rerankers:

${facts.knowledgeInventory.rerankers.map((reranker) => `- \`${reranker}\``).join("\n") || "- لا توجد rerankers مكتشفة."}

- الأنظمة:

${systems
  .map(
    (system) => `- \`${system.label}\`
  - id: \`${system.id}\`
  - النوع: \`${system.category}\`
  - السياسة: \`${system.policy}\`
  - الحالة: \`${system.status}\`
  - المزودات: ${system.embeddingsProviders.map((provider) => `\`${provider}\``).join("، ") || "لا يوجد"}
  - المخازن المتجهية: ${system.vectorStores.map((store) => `\`${store}\``).join("، ") || "لا يوجد"}
  - المدخلات: ${system.inputs.map((input) => `\`${input}\``).join("، ") || "لا يوجد"}
  - المخرجات أو artifacts: ${system.artifacts.map((artifact) => `\`${artifact}\``).join("، ") || "لا يوجد"}
  - الاعتماديات: ${system.dependencies.map((dependency) => `\`${dependency}\``).join("، ") || "لا يوجد"}`,
  )
  .join("\n") || "- لا توجد أنظمة معرفة واسترجاع مكتشفة."}

- إشارات التشتت:

${competing.map((signal) => `- ${signal}`).join("\n") || "- لا توجد إشارات تشتت موثقة."}

- تحذيرات الكشف:

${discoveryWarnings.map((warning) => `- ${warning}`).join("\n") || "- لا توجد تحذيرات كشف مفتوحة."}

- ملفات معرفة غير محكومة:

${ungoverned.map((filePath) => `- \`${filePath}\``).join("\n") || "- لا توجد ملفات غير محكومة مكتشفة."}
`;
}

export function renderIdeShim(target: IdeTarget): string {
  const heading = target.kind === "cursor-rule" ? "قواعد Cursor" : `مرآة ${target.label}`;
  const body = `# ${heading}

هذا الملف مرآة خاصة بالأداة فقط.

هذا الملف ليس مصدر الحقيقة.

ابدأ دائمًا من:

\`\`\`text
AGENTS.md
\`\`\`

ثم اقرأ:

\`\`\`text
output/session-state.md
\`\`\`

ثم اقرأ فقط ما يلزم من:

\`\`\`text
output/code-map/*
output/mind-map/*
\`\`\`

قبل أي تحليل أو تعديل أو تنفيذ:

1. اقرأ العقد الأعلى.
2. اقرأ الحالة الحية.
3. أخرج brief قصيرًا من 3 إلى 7 حقائق تشغيلية يثبت القراءة، ويتضمن حقيقة صريحة تثبت قراءة قاعدة الفحوصات الحاكمة.
4. ثم فقط ابدأ العمل.

ممنوع:

- اعتبار هذا الملف مصدر الحقيقة.
- الاعتماد على ذاكرة المحادثة أو واجهة الأداة كمصدر للحالة.
- وضع المنافذ الرسمية أو أوامر التشغيل أو قائمة الخدمات أو حالة الأعطال أو معلومات RAG المحلية هنا.

عند نهاية الجولة:

1. حدّث:

\`\`\`text
output/round-notes.md
\`\`\`

2. حدّث:

\`\`\`text
output/session-state.md
\`\`\`

إذا تغيّرت الحقيقة التشغيلية أو البنيوية.
3. أخرج handoff brief قصيرًا يذكر:
   - ما الذي تغيّر
   - ما الذي ثبت
   - ما الذي بقي مفتوحًا

المرجع الأعلى:

\`\`\`text
AGENTS.md
.repo-agent/OPERATING-CONTRACT.md
.repo-agent/RAG-OPERATING-CONTRACT.md
.repo-agent/STARTUP-PROTOCOL.md
.repo-agent/HANDOFF-PROTOCOL.md
\`\`\`
`;

  if (target.kind !== "cursor-rule") {
    return body;
  }

  return `---
description: العقد الرسمي المختصر للمستودع
globs:
  - "**/*"
alwaysApply: true
---

${body}`;
}

export function renderSessionState(
  facts: RepoFacts,
  drift: DriftResult,
  referenceTimestamp: string,
): string {
  const openIssues = facts.openIssues.length > 0 ? facts.openIssues : ["لا توجد أعطال مفتوحة مرصودة في الفحص الحالي."];

  return `# الحالة التشغيلية الحالية

## تعريف الملف

\`output/session-state.md\` هو المصدر الوحيد للحالة التشغيلية الحالية للمشروع.

## بيانات التحكم

| البند | القيمة |
|---|---|
| آخر مزامنة مرجعية | ${referenceTimestamp} |
| الفرع الحالي | \`${facts.git.branch}\` |
| آخر commit | \`${facts.git.headCommit}\` |
| حالة working tree | ${summarizeWorkingTree(facts)} |
| مستوى drift | \`${drift.level}\` |

## الحقيقة التشغيلية الحالية

### مدير الحزم الرسمي

${formatCodeBlockLines([facts.packageManager])}

### مساحة العمل الرسمية

${formatCodeBlockLines(facts.workspacePatterns)}

### أوامر التشغيل الرسمية

${formatCodeBlockLines(facts.officialCommands)}

### المنافذ الرسمية الحالية

${formatCodeBlockLines([
  `frontend: ${facts.webPort ?? "غير محسوم"}`,
  `backend: ${facts.backendPort ?? "غير محسوم"}`,
])}

### التطبيقات الأساسية

${facts.apps.map((entry) => `- \`${entry.name}\` — \`${entry.path}\``).join("\n")}

### الحزم الأساسية

${facts.packages.map((entry) => `- \`${entry.name}\` — \`${entry.path}\``).join("\n")}

## حالة طبقة الوكلاء

- العقد الأعلى المختصر:

${formatCodeBlockLines(["AGENTS.md"])}

- العقد التشغيلي الكامل:

${formatCodeBlockLines([".repo-agent/OPERATING-CONTRACT.md"])}

- عقد طبقة المعرفة والاسترجاع:

${formatCodeBlockLines([".repo-agent/RAG-OPERATING-CONTRACT.md"])}

- الملف المولد للسياق:

${formatCodeBlockLines([".repo-agent/AGENT-CONTEXT.generated.md"])}

## حالة المرجع الحي

- session-state:

\`up-to-date\`

- round-notes:

\`up-to-date\`

- code-map:

\`up-to-date\`

- mind-map:

\`up-to-date\`

## ثوابت واجهة حرجة

${HERO_LAYOUT_GUARDRAILS.map((guardrail) => `- ${guardrail}`).join("\n")}

${renderKnowledgeSection(facts)}

## مرايا IDE المطلوبة حاليًا

${facts.requiredIdeTargets
    .filter((target) => target.required)
    .map((target) => `- \`${target.path}\` — ${target.reasons.join("، ")}`)
    .join("\n") || "- لا توجد مرايا IDE مطلوبة حاليًا."}

## ما تغيّر منذ آخر بصمة

${drift.reasons.map((reason) => `- ${reason}`).join("\n")}

## الأعطال المفتوحة الآن

${openIssues.map((issue) => `- ${issue}`).join("\n")}
`;
}

export function renderGeneratedContext(
  facts: RepoFacts,
  drift: DriftResult,
  referenceTimestamp: string,
  openIssues: string[],
): string {
  const ideStatus = facts.requiredIdeTargets
    .filter((target) => target.required)
    .map((target) => `- \`${target.path}\` — up-to-date`)
    .join("\n");

  return `# السياق المولد الحالي للوكلاء

## بيانات الجلسة

| البند | القيمة |
|---|---|
| آخر مزامنة مرجعية | ${referenceTimestamp} |
| الفرع الحالي | \`${facts.git.branch}\` |
| آخر commit | \`${facts.git.headCommit}\` |
| حالة الشجرة | ${summarizeWorkingTree(facts)} |
| مستوى drift | \`${drift.level}\` |

## المرجع الحاكم

- المصدر الوحيد للحالة الحالية:

\`output/session-state.md\`

- العقد الأعلى:

\`AGENTS.md\`

- عقد RAG التشغيلي:

\`.repo-agent/RAG-OPERATING-CONTRACT.md\`

## أوامر التشغيل الرسمية الحالية

${formatCodeBlockLines(facts.officialCommands)}

## المنافذ الرسمية الحالية

${formatCodeBlockLines([
  `frontend: ${facts.webPort ?? "غير محسوم"}`,
  `backend: ${facts.backendPort ?? "غير محسوم"}`,
])}

## التطبيقات والحزم الأساسية

${facts.apps.map((entry) => `- \`${entry.name}\` — \`${entry.path}\``).join("\n")}

${facts.packages.map((entry) => `- \`${entry.name}\` — \`${entry.path}\``).join("\n")}

## نقاط الدخول الأهم

${facts.entrypoints.map((entry) => `- \`${entry}\``).join("\n")}

${renderKnowledgeSection(facts)}

## حالة الملفات المرجعية

- session-state:

\`up-to-date\`

- round-notes:

\`up-to-date\`

- code-map:

\`up-to-date\`

- mind-map:

\`up-to-date\`

## ثوابت واجهة حرجة

${HERO_LAYOUT_GUARDRAILS.map((guardrail) => `- ${guardrail}`).join("\n")}

## مرايا IDE المطلوبة

${ideStatus || "- لا توجد مرايا IDE مطلوبة الآن."}

## أهم الأعطال المفتوحة

${(openIssues.length > 0 ? openIssues : ["لا توجد أعطال مفتوحة مرصودة في الفحص الحالي."]).slice(0, 5).map((issue) => `- ${issue}`).join("\n")}
`;
}

export function renderStartupBrief(
  facts: RepoFacts,
  drift: DriftResult,
  updatedPaths: string[],
  openIssues: string[],
): string {
  const status =
    drift.level === "hard-drift"
      ? "جاهز بعد تسوية drift بنيوي"
      : drift.level === "soft-drift"
        ? "جاهز بعد تسوية drift مرجعي"
        : "جاهز";
  const updates = updatedPaths.length > 0 ? updatedPaths.map((entry) => `- ${entry}`).join("\n") : "- لا يوجد تحديثات مولدة في هذه الجولة";

  return `=== Startup Brief ===
الحالة:
${status}

أهم الحقائق:
- مدير الحزم الرسمي هو ${facts.packageManager}
- الويب الرسمي على المنفذ ${facts.webPort ?? "غير محسوم"}
- الخلفية المرجعية على المنفذ ${facts.backendPort ?? "غير محسوم"}
- المصدر الوحيد للحالة الحالية هو output/session-state.md
- عدد أنظمة المعرفة والاسترجاع المكتشفة هو ${facts.knowledgeInventory.totalSystems}
- حالة حوكمة طبقة RAG هي ${facts.knowledgeInventory.governanceStatus}
- قاعدة الفحوصات الحاكمة مقروءة ومطلوب إثبات قراءتها في brief البداية

حاجز واجهة حرج:
- تموضع الكروت السبعة في الهيرو ثابت عبر كل المقاسات وممنوع جعله متجاوبًا تلقائيًا

حالة drift:
- ${drift.level}
${drift.reasons.map((reason) => `- ${reason}`).join("\n")}

ما تم تحديثه:
${updates}

أهم الأعطال المفتوحة:
${(openIssues.length > 0 ? openIssues : ["لا توجد أعطال مفتوحة مرصودة حاليًا."]).slice(0, 3).map((issue) => `- ${issue}`).join("\n")}

الجاهزية:
- يمكن بدء المهمة الآن فقط بعد قراءة output/session-state.md
`;
}

export function shouldAppendSessionStart(
  previousFingerprint: FingerprintState | null,
  facts: RepoFacts,
  drift: DriftResult,
): boolean {
  if (!previousFingerprint) {
    return true;
  }

  if (previousFingerprint.branch !== facts.git.branch || previousFingerprint.headCommit !== facts.git.headCommit) {
    return true;
  }

  return drift.level !== "no-drift";
}

export function renderRoundNote(
  roundNumber: number,
  facts: RepoFacts,
  drift: DriftResult,
  updatedPaths: string[],
  referenceTimestamp: string,
): string {
  const roundId = String(roundNumber).padStart(3, "0");

  return `## الجولة ${roundId}

### التاريخ والوقت

${referenceTimestamp}

### نوع الجولة

بدء جلسة

### ما الذي فحصه bootstrap

- حالة git الحالية
- أوامر التشغيل الرسمية
- المنافذ الرسمية
- التطبيقات والحزم
- العقود اليدوية
- الملفات المرجعية الحية
- مرايا IDE المطلوبة
- طبقات المعرفة والاسترجاع

### ما الذي تم تحديثه

${updatedPaths.length > 0 ? updatedPaths.map((entry) => `- ${entry}`).join("\n") : "- لم يلزم تحديث أي ملف مولد"}

### مستوى drift

\`${drift.level}\`

### حالة طبقة المعرفة والاسترجاع

- governance status: \`${facts.knowledgeInventory.governanceStatus}\`
- total systems: \`${facts.knowledgeInventory.totalSystems}\`

### ما الذي بقي مفتوحًا

${facts.openIssues.length > 0 ? facts.openIssues.slice(0, 3).map((issue) => `- ${issue}`).join("\n") : "- لا توجد أعطال مفتوحة مرصودة في الفحص الحالي"}

### هل استلزم الأمر تحديث session-state

${updatedPaths.includes("output/session-state.md") ? "نعم" : "لا"}
`;
}
