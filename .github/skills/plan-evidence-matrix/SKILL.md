---
name: plan-evidence-matrix
description: Build a requirement-by-requirement evidence matrix from a plan, mapping each material requirement to static evidence, executed commands, live behavior, and gap severity. Use when reviewing plan implementation, acceptance criteria, or implementation coverage.
compatibility: Works with Markdown plans and repository command evidence.
metadata:
  author: codex
  source: web-researched-skill-gap-and-review-patterns
---

# Plan Evidence Matrix

## Purpose

Use this skill to prevent vague plan reviews.

Every material plan requirement must map to direct evidence or a declared gap.

## Inputs

Read the plan and extract:

```text
requirements
acceptance criteria
closure criteria
required commands
required artifacts
failure paths
integration paths
```

For this repository, the default plan file is:

```text
PLAN.md
```

## Evidence Levels

Classify each proof item as one of:

```text
executed
static
missing
stale
not-run
```

Use these meanings:

- `executed`: command, test, build, runtime path, or verification script ran in this review.
- `static`: file or source content was read only.
- `missing`: expected file, command, test, or artifact was absent.
- `stale`: evidence predates the implementation state or was not regenerated after relevant changes.
- `not-run`: executable check exists but was not run in this review.

## Severity Rules

Assign severity by closure impact:

- `critical`: blocks any completion or production-readiness claim.
- `high`: leaves a required behavior, command, or generated artifact unproven.
- `medium`: leaves supporting coverage incomplete without blocking the core result.
- `low`: wording, reporting, or non-blocking traceability issue.

## Matrix Format

Use this table:

```text
| Plan item | Expected proof | Evidence level | Evidence source | Status | Severity | Notes |
| --- | --- | --- | --- | --- | --- | --- |
```

Status must be one of:

```text
verified
partial
missing
not-run
```

## Closure Rule

Do not summarize a plan item as verified unless the expected proof includes fresh executable evidence.

If only static evidence exists, mark it as partial.
