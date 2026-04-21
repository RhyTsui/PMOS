# `{do}` Mode Execution Protocol

- version: v0.2
- date: 2026-04-21
- status: experimental
- scope: fast-execution route under PMAIOS mode architecture

## Purpose

This document defines the execution contract for `{do}` mode.

`{do}` is for cases where:

- the user wants a fast implementation route
- the plan is already accepted enough
- the goal is same-day or short-window delivery

It should not replace the default conservative mode.

It should provide a different execution protocol when explicitly requested.

## Why `{do}` Still Falsely Stops

The main failure pattern is not lack of capability.

It is this combination:

1. a direct side question is interpreted as a new completed interaction
2. the reply slips into summary or final-answer tone
3. mode continuity is lost even though the main target did not change

`{do}` must override this pattern.

## Trigger

Suggested examples:

- `{do} finish today's plan`
- `{do} keep pushing, do not stop`
- `{do} execute the accepted route now`

## Core Contract

In `{do}` mode:

1. continue execution by default
2. keep sync short
3. do not let stage updates stop work
4. park side topics unless critical
5. only stop on real blockers, high-risk forks, hard permission gates, or clear drift

## Required Behavior Changes

### 1. Sync Style

Use short sync instead of reflective wrap-up.

Good `{do}` sync:

- what is being done now
- what was completed
- what is next
- whether there is a real blocker

Avoid:

- long reflective summaries
- milestone-sounding wrap-up language
- asking for confirmation when the next safe step is already known

### 2. Stop Conditions

Stop only when:

- the next step is truly blocked
- a high-risk product or architecture fork must be chosen
- a required permission gate blocks continuation
- continuing would likely drift materially from the target

Do not stop just because:

- a phase boundary was reached
- a summary was written
- a small uncertainty exists
- a new side idea appeared
- a colleague or stakeholder asked for a brief introduction or status explanation

### 3. Side-Idea Policy

When a new side idea appears during `{do}` mode:

- do not let it hijack the main line by default
- record it as parked, candidate, or sidecar if valuable
- only absorb it immediately if it is critical to current delivery

When a brief colleague or stakeholder question appears during `{do}` mode:

- answer it briefly if it is cheap and useful
- treat it as a short side response, not as a mode exit
- return to the current main line immediately after the response
- do not let the side response reset the active task unless the user explicitly redirects the goal

### 3.5. Direct-Question Continuity Rule

In `{do}` mode, a direct question does not automatically mean:

- the main task is complete
- the active route should be dropped
- the assistant should wait for another instruction

Instead:

- answer the question as cheaply as possible
- restate or preserve the active main line internally
- continue execution in the same turn if the main target is unchanged

### 4. Permission Policy

When permissions are needed:

- batch permission-gated work where possible
- continue non-blocked work in parallel
- do not turn one blocked command into whole-task idle waiting

### 5. Priority Policy

The top priority is:

- finish the accepted plan or the highest-value subset within the current window

Do not silently switch from:

- delivery

to:

- theory polishing
- unrelated optimization
- broad refactoring
- new architecture exploration

unless the user explicitly redirects or the current route becomes invalid.

## Minimum Status Loop

The internal working loop for `{do}` should feel like:

`do -> short sync -> continue -> short sync -> continue`

not:

`do -> summary -> stop -> wait`

and not:

`do -> answer side question -> stop -> wait`

## Recommended Pairing

`{do}` works best when paired with:

- a known plan
- a bounded target
- a time box

Examples:

- finish today's plan
- close the current board and doc batch
- complete a specific version-scope artifact set

## Relation To Other Modes

- `default`: safer, slower, broader evaluation
- `plan`: refine before implementation
- `deep`: sidecar research without blocking main flow
- `do`: fast execution on accepted direction

## Related Documents

- `docs/architecture/mode-architecture.md`
- `docs/templates/mode_switch_template.md`
- `docs/operations/pmaios-v0.5-checklist.md`
