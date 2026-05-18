# Startup Whoami

- version: v0.4
- date: 2026-05-09
- status: active
- purpose: restart bootstrap and active-platform-truth recovery

## What This File Is

This document is the mandatory startup identity sheet for PMAIOS work after restart, tool switch, or context loss.

It exists so Codex can recover the current active operating identity:

- who we are in this repository
- what platform version is actually active
- which documents are authoritative for platform work
- what not to redo from stale version memory

## Operating Identity

PMAIOS is currently a file-driven local AI operating system centered on:

- product workflow governance
- project PM outputs
- shared memory and traceability
- platform and subproject coordination

Current platform stance:

- the active product version is `v1.0`
- the landed runtime baseline is `v0.7`
- the current task is to turn the landed runtime into a deployable, collaborative, product-grade PM Agent system
- do not reopen `v0.8 / v0.9` intermediate version branches

## Mandatory Startup Reads

Before substantive work, always read in this order:

1. `docs/memory/mcp-context/session-state.json`
2. `npm run cli -- mcp-context events 20`
3. `npm run cli -- mcp-context tasks --status in_progress`
4. this file
5. `docs/operations/platform-truth-source-index.md`

Then continue into the authoritative working documents below as needed.

## Current Platform Truths

### 1. Single Raw Input Source

`docs/sources/inbox/` is the only raw manual input source.

### 2. Product Work Must Follow This Chain

`information input -> research/interviews -> brainstorming -> cognition integration -> key point extraction -> decision -> output -> proactive sync`

### 3. Product Outputs Must Preserve Uncertainty

Early-stage outputs must explicitly distinguish:

- fact
- judgment
- candidate
- unknown

### 4. Work Must Be Visible

Undocumented or unsynced work does not count as submitted work.

### 5. Documents Are The Source Of Truth

Terminal replies are summaries only.

Authoritative results must be recorded in repository documents.

For platform work, the active entry chain is:

1. `docs/operations/platform-truth-source-index.md`
2. `docs/operations/current-version-progress.md`
3. `docs/operations/pmaios-v1.0-direction.md`
4. `docs/operations/pmaios-introduction.md`
5. `docs/architecture/PMAIOS_product_management_agent_operating_model.md`
6. `docs/boards/pmaios-runtime-panorama-v0.7.svg`
7. `docs/operations/v0.7-minimum-loop-summary.md`
8. `docs/operations/v0.7-p0-execution-definition-stage-agent-ui-spec-repeat-correction.md`
9. `docs/operations/module-roadmap.md`
10. `docs/operations/v1.0-product-version-program.md`
11. `docs/operations/v1.0-acceptance-standard.md`

### 6. User Ideas Must Be Refined Before Execution

Raw user ideas are not implementation instructions by default.

### 7. Stage Updates Must Not Stop Work

If the next safe step is already known, PMAIOS should keep moving while syncing.

### 8. Interim Summaries Must Not Trigger False Finish

If there are still obvious next safe steps, PMAIOS should continue after the summary.

### 9. User Requirements And Product Requirements Must Stay Linked

Important work must be tracked at two linked layers:

- user requirement
- product requirement

### 10. Progress Must Be Tracked Against A Denominator

Long-running progress should not default only to "what was finished today".

### 11. Convergence Must Not Hide Dropped Requirements

Convergence is not automatically success.

## Current Authoritative Workflow Documents

Platform-level workflow truth:

- `docs/memory/global-rules.md`
- `workflows/product-management.md`
- `docs/operations/product-workflow-total-design.md`
- `docs/operations/ai-product-development-collaboration-loop.md`
- `docs/operations/cognition-ladder-and-intent-amplifier.md`
- `docs/operations/sidecar-deep-research-mechanism.md`
- `docs/operations/requirement-change-control.md`
- `docs/operations/requirement-promotion-and-loss-prevention.md`

Operational status truth:

- `docs/operations/platform-truth-source-index.md`
- `docs/operations/current-version-progress.md`
- `docs/operations/pmaios-version-plan.md`
- `docs/operations/pmaios-v1.0-direction.md`
- `docs/operations/v1.0-product-version-program.md`
- `docs/operations/v1.0-acceptance-standard.md`
- `docs/operations/v0.7-minimum-loop-summary.md`
- `docs/operations/module-roadmap.md`
- `docs/operations/local-runbook.md`

## Current Product Workflow Priority

The current top-level priority is:

`build a v1.0 product-manager Agent product on top of the landed v0.7 runtime baseline`

This means:

- do not regress into stale `v0.5` or `v0.6` identity
- do not let business subprojects override platform product-version truth
- finish the active v1.0 acceptance tracks before opening unrelated new platform branches
- keep the local unified entry as a chat-first homepage, with control-plane and runtime surfaces invoked on demand

## Current Sample Project

`knowledge-base` remains a useful sample subproject for workflow adoption, but it is not the source of platform version identity.

## What To Do After Restart

When resuming platform work after restart:

1. recover mcp-context state
2. read this file
3. read `docs/operations/platform-truth-source-index.md`
4. identify the active platform version from `current-version-progress.md`
5. continue from active repo truth, not from stale version memory or hidden chat context

## What Not To Do

Do not:

- assume conversation memory is sufficient
- treat old `v0.5` or `v0.6` snapshots as current platform identity
- let subproject active tasks redefine PMAIOS platform scope by accident

## Update Rule

If platform version identity, active truth documents, or top-level priority changes materially, update this file in the same work cycle.
