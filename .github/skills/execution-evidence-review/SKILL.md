---
name: execution-evidence-review
description: Review command output, tests, generated artifacts, and manual evidence for freshness, behavioral coverage, and closure quality. Use when a task depends on whether executed checks actually prove implementation, failure handling, or acceptance criteria.
compatibility: Works with repository command logs, generated reports, and acceptance artifacts.
metadata:
  author: codex
  source: web-researched-test-evidence-and-verification-loop-patterns
---

# Execution Evidence Review

## Purpose

Use this skill to judge whether evidence proves behavior rather than only existence.

## Required Checks

For every command or artifact in scope, verify:

- The command was run during the current review when making a current-state claim.
- The exit code and output support the claimed result.
- The command covers the relevant success path.
- The command covers the relevant failure path when the plan requires one.
- Generated artifacts include required fields and are not empty.
- Evidence is fresh relative to the current working tree.

## Freshness Rules

Mark evidence as stale when:

- It was generated before relevant files changed.
- It references a previous branch or commit.
- It lacks a date or command source.
- It is a static report for a behavior that has an executable check.

## Quality Rules

Passing commands are not enough if they do not exercise the behavior under review.

Failing commands are findings, not proof of completion.

Skipped commands must be listed as `not-run` with the exact blocker.

## Review Steps

1. Inventory all required commands from the plan and repository scripts.
2. Run the commands that are necessary and practical for the current review.
3. Capture exit code, duration, and relevant output.
4. Map each result to a plan item.
5. Classify coverage as success path, failure path, integration path, or static support.
6. Flag missing, stale, or thin evidence.

## Output Format

```text
| Evidence | Type | Freshness | Path covered | Result | Closure impact |
| --- | --- | --- | --- | --- | --- |
```

Use `Closure impact` values:

```text
blocks
weakens
supports
no-impact
```
