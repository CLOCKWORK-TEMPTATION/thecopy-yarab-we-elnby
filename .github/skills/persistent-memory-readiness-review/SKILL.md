---
name: persistent-memory-readiness-review
description: Verify repository persistent-agent-memory readiness, including live turn context, session close gate, repair path, secrets path, evals, latency, and RAG governance. Use when PLAN.md, agent memory, retrieval, embeddings, or session closure are in scope.
compatibility: Requires the repository persistent-memory scripts and agent contracts.
metadata:
  author: codex
  source: PLAN.md
---

# Persistent Memory Readiness Review

## Purpose

Use this skill when a review touches the governed persistent memory system.

It verifies that the memory layer works as an operational system, not only as files.

## Required Context

Read:

```text
PLAN.md
output/session-state.md
.repo-agent/OPERATING-CONTRACT.md
.repo-agent/RAG-OPERATING-CONTRACT.md
output/code-map/rag-systems.md
output/code-map/rag-entrypoints.md
```

## Required Runtime Evidence

When judging closure, run the relevant subset of:

```text
pnpm agent:persistent-memory:turn -- --query "هل الحقن يعتمد على السؤال؟"
pnpm agent:persistent-memory:turn -- --query "ما الذي لا يجب تكراره؟"
pnpm agent:persistent-memory:turn -- --query "ما حالة البنية المحلية؟"
pnpm agent:persistent-memory:turn:verify
pnpm agent:persistent-memory:session:close
pnpm agent:persistent-memory:secrets:verify
pnpm agent:persistent-memory:eval
pnpm agent:persistent-memory:eval:golden
pnpm agent:persistent-memory:eval:safety
pnpm agent:persistent-memory:eval:latency
pnpm agent:verify
```

Run broader checks if the review asks for production readiness:

```text
pnpm type-check
pnpm test
pnpm build
```

## Acceptance Signals

Verify directly:

- Live turn context exists and includes required fields.
- Different questions produce question-conditioned memory envelopes.
- Session close gate fails or repairs incomplete turns as designed.
- Secret-bearing queries are redacted and hash-only where required.
- Latency evidence covers the plan budget.
- Evaluation commands cover golden, safety, and latency paths.
- RAG systems remain represented in state, maps, and verification.
- Optional infrastructure absence does not get misreported as successful production infrastructure.

## Required Fields

Check generated live context for:

```text
turn_context_status
query_hash
selected_intent
selected_profile
retrieval_event_id
audit_event_id
memory_context
latency_ms
```

## Gap Classification

Use:

```text
critical
high
medium
low
```

Critical gaps include:

- missing live turn command
- missing generated turn context
- same context for different questions
- session close not enforced
- secret path untested
- agent verify failing

## Report Notes

Never claim memory readiness from generated files alone.

Generated files are supporting evidence unless paired with a fresh command result.
