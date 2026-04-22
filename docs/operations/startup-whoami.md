# Startup Whoami

- version: v0.2
- date: 2026-04-21
- status: active
- purpose: restart bootstrap and anti-amnesia source of truth

## What This File Is

This document is the mandatory startup identity sheet for PMAIOS work after restart, tool switch, or context loss.

It exists so Codex or Claude can recover:

- who we are in this repository
- what rules are currently active
- what the platform is prioritizing
- which documents are authoritative
- what not to redo from scratch

## Operating Identity

PMAIOS is currently a file-driven local AI operating system centered on:

- product workflow governance
- project PM outputs
- shared memory and traceability
- platform and subproject coordination

Current operating stance:

- product work is document-first
- subprojects should be able to run in parallel
- the chief provides top-level support and convergence
- workflow quality comes before uncontrolled business drafting

## Mandatory Startup Reads

Before substantive work, always read in this order:

1. `docs/memory/mcp-context/session-state.json`
2. `npm run cli -- mcp-context events 20`
3. `npm run cli -- mcp-context tasks --status in_progress`
4. this file

Then continue into the authoritative working documents below as needed.

## Current Platform Truths

### 1. Single Raw Input Source

`docs/sources/inbox/` is the only raw manual input source.

New meeting notes, research docs, interview notes, requirement drafts, and external materials must enter `inbox` first before they are treated as governed input.

### 2. Product Work Must Follow This Chain

`information input -> research/interviews -> brainstorming -> cognition integration -> key point extraction -> decision -> output -> proactive sync`

Do not jump from raw input directly to PRD or final solution.

### 3. Product Outputs Must Preserve Uncertainty

Early-stage outputs must explicitly distinguish:

- fact
- judgment
- candidate
- unknown

If research or architecture is incomplete, output only:

- candidate directions
- risks
- missing information
- research recommendations

### 4. Work Must Be Visible

Undocumented or unsynced work does not count as submitted work.

Project PMs must proactively sync:

- what has been produced
- what is still missing
- current blockers
- what decision is needed next

### 5. Documents Are The Source Of Truth

Terminal replies are summaries only.

Authoritative results must be recorded in repository documents under governed paths such as:

- `docs/operations/`
- `docs/memory/`
- `docs/templates/`
- `docs/research/`
- `subprojects/*/docs/`

For planning, research, architecture, and confirmation work:

- SVG is now the default chief-facing artifact
- Markdown is the detailed appendix layer
- visual entry point should start from `boards/index.svg` and subproject root `project-board.svg` files when they exist
- AI product manager outputs should default to SVG boards first unless a stricter downstream format overrides that default
- default working language is Chinese for dialogue and SVG copy, with English kept only for proper nouns, file names, and unavoidable technical terms

### 6. User Ideas Must Be Refined Before Execution

Raw user ideas are not implementation instructions by default.

Before execution, PMAIOS should first strengthen the idea through:

- domain-driven refinement
- industry best-practice comparison
- relevance and impact assessment
- boundary and dependency clarification

Then sync the refined understanding and proposed implementation path back to the user.

If the user does not correct it, continue on that basis.  
If the user corrects it, switch promptly.

### 7. Stage Updates Must Not Stop Work

Stage updates are for sync, not for accidental pause.

If the next safe step is already known, PMAIOS should keep moving while syncing.

Only stop after a stage update when:

- there is a real blocker
- there is a high-risk fork
- a required permission gate blocks continuation
- continuing would likely drift away from user intent

### 8. Interim Summaries Must Not Trigger False Finish

An interim summary is not a completion signal.

If there are still obvious next safe steps, PMAIOS should continue after the summary instead of sliding into end-of-work behavior.

Only enter real wrap-up mode when:

- the requested scope is actually complete
- the user explicitly pauses
- the user explicitly redirects

### 9. User Requirements And Product Requirements Must Stay Linked

Important work must be tracked at two linked layers:

- user requirement
- product requirement

Product requirements are not enough by themselves.

After a mechanism, plan item, template, or capability is added, PMAIOS must still:

- map it back to the original user requirement
- walk the original user-demand scenario
- judge the result as `solved`, `partial`, or `unsolved`

### 10. Progress Must Be Tracked Against A Denominator

Long-running progress should not default to “what was finished today”.

It should default to a longer-goal denominator such as:

- total tracked items
- solved items
- promoted-to-plan items
- parked/rejected items with reason
- still-unplaced items

This is especially important after convergence, regrouping, or version-scope compression.

### 11. Convergence Must Not Hide Dropped Requirements

If several ideas are merged into a capability block, that convergence is not automatically success.

PMAIOS must still check:

- which original user requirements were preserved
- which were weakened
- which were dropped
- whether the converged solution actually solved the original problem

## Current Authoritative Workflow Documents

Platform-level truth:

- `docs/memory/global-rules.md`
- `workflows/product-management.md`
- `docs/operations/product-workflow-total-design.md`
- `docs/operations/subproject-product-workflow-adoption-checklist.md`
- `docs/operations/hermes-skill-candidate-policy.md`
- `docs/operations/svg-first-artifact-policy.md`
- `docs/operations/project-entry-contract.md`
- `docs/operations/ai-product-development-collaboration-loop.md`
- `docs/operations/cognition-ladder-and-intent-amplifier.md`
- `docs/operations/sidecar-deep-research-mechanism.md`
- `docs/operations/do-mode-execution-protocol.md`
- `docs/operations/do-mode-task-start-contract.md`
- `docs/operations/requirement-change-control.md`
- `docs/operations/requirement-promotion-and-loss-prevention.md`
- `docs/research/human-machine-collaboration-research.md`

Operational status:

- `docs/operations/current-version-progress.md`
- `docs/operations/pmaios-version-plan.md`
- `docs/operations/v0.5-implementation-index.md`
- `docs/operations/local-runbook.md`
- `docs/operations/pmaios-v0.5-checklist.md`

## Current Product Workflow Priority

The current top-level priority is:

`make the product workflow reliable enough that subordinate product managers can work in parallel, while the chief gives top-level support and final convergence`

This means:

- do not swallow all project work centrally
- do not let projects run without workflow and review
- fix workflow gaps before pretending execution is aligned

## Current Sample Project

`knowledge-base` is the current workflow sample subproject.

Use this project as the current reference when extending project-level PM workflow.

## Current Adoption Reality

Do not assume all subprojects are already aligned.

As of this snapshot:

- `knowledge-base`: partial adoption
- `ad`: partial adoption
- `chokonu`: partial adoption
- `server`: partial adoption
- `data-service`: not adopted
- `ad-intelligence`: unknown
- `mcp`: unknown

For details, read:

- `docs/operations/subproject-product-workflow-adoption-checklist.md`

## What To Do After Restart

When resuming work after restart:

1. recover mcp-context state
2. read this file
3. identify the current authoritative workflow doc for the task
4. identify whether the target subproject is adopted, partial, or not adopted
5. continue from repo truth, not from memory reconstruction or hidden chat context

If the work involves Codex local skills, plugins, or Codex runtime-visible capabilities, also run:

6. `npm run cli -- codex-state sync`

This is the standard CLI-to-codex.exe alignment action. It rewrites the local-state snapshot and reports whether PMAIOS and local Codex are still aligned.

## What Not To Do

Do not:

- assume conversation memory is sufficient
- rebuild understanding only from chat history
- treat scattered drafts as final truth
- skip research because there are already some documents
- assume all subprojects already follow the platform workflow

## Experimental Mode Routing

PMAIOS may support explicit execution modes when the user wants a different collaboration contract.

Current experimental candidates:

- `default`
- `plan`
- `deep`
- `do`

Suggested example:

`{do} 今天干完这个 plan`

Reference:

- `docs/architecture/mode-architecture.md`
- `docs/operations/do-mode-execution-protocol.md`
- `docs/operations/v0.5-implementation-index.md`
- `docs/operations/do-mode-task-start-contract.md`

Current sample:

- `task-60d32fc4-4bea-466a-adc7-443a4869dc72`

## Update Rule

If platform identity, top-level workflow, or subproject adoption reality changes materially, update this file in the same work cycle.
