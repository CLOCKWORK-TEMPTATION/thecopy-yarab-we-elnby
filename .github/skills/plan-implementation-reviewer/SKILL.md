---
name: plan-implementation-reviewer
description: Review an implemented repository state against PLAN.md using executable evidence, plan-to-evidence mapping, and gap classification. Use when asked to audit whether PLAN.md has been implemented, whether persistent-memory work is production-ready, or whether a plan-review report is needed.
compatibility: Requires the repository agent contract and the root PLAN.md file.
metadata:
  author: codex
  source: .github/agents/plan-implementation-reviewer.agent.md
---

# Plan Implementation Reviewer

## Purpose

Use this skill for a read-only executive review of the current implementation against the root plan.

The review must not fix gaps unless the user explicitly changes the task from review to remediation.

## Mandatory Startup

Run the repository startup path first:

```text
pnpm agent:bootstrap
```

Then read:

```text
output/session-state.md
.repo-agent/PERSISTENT-MEMORY-CONTEXT.generated.md
PLAN.md
```

If the scope touches memory, retrieval, embeddings, or context assembly, also read:

```text
.repo-agent/RAG-OPERATING-CONTRACT.md
output/code-map/rag-systems.md
output/code-map/rag-entrypoints.md
output/mind-map/rag-topology.mmd
```

## Supporting Skills

Use these project skills in this order:

```text
plan-evidence-matrix
execution-evidence-review
persistent-memory-readiness-review
```

## Execution Ladder

Run the narrow reviewer first:

```text
pnpm agent:plan-review
```

Run the blocking gap mode when judging closure:

```text
pnpm agent:plan-review -- --fail-on-gaps
```

Run the acceptance surface when the user asks whether the implementation is complete or production-ready:

```text
pnpm agent:plan-review -- --acceptance
```

If acceptance output leaves unexecuted plan commands, run the relevant commands directly where practical.

## Review Rules

- Separate static evidence from executable evidence.
- Treat file existence as supporting evidence only.
- Treat successful build as insufficient for behavior claims.
- Treat stale generated artifacts as unproven until regenerated or verified.
- Classify every material gap by severity and closure impact.
- Do not weaken tests, checks, guards, scripts, or acceptance commands.

## Report Contract

Produce these sections:

```text
حالة المراجعة
ملخص تنفيذي
الأدلة التنفيذية
مصفوفة الخطة مقابل الدليل
الفجوات الحرجة
الفجوات العالية
الفجوات المتوسطة
ما ثبت بفحص ساكن فقط
ما لم يثبت تنفيذيًا
الأوامر التي شغلت ونتائجها
بيان الثقة
```

Use one confidence level:

```text
منخفض
متوسط
مرتفع
```

Do not use high confidence while required acceptance paths remain unexecuted or failing.
