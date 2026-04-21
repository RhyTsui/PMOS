# PMAIOS Mode Architecture

- version: v0.2
- date: 2026-04-21
- status: experimental
- scope: collaboration and execution mode routing

## Purpose

This document defines a mode-routing layer for PMAIOS.

The goal is not to replace the current conservative or default behavior.

The goal is to allow explicit mode switching when the user wants a different execution contract.

This is an architecture-layer change, not only a prompt tweak.

## Why This Layer Exists

Default mode has real value:

- safer under ambiguity
- better for evaluation
- better for high-risk work
- better for idea refinement and governance

But it is not optimal for:

- same-day delivery pushes
- low-ambiguity execution
- long uninterrupted implementation windows

So PMAIOS should support multiple execution modes under one governed architecture.

## Core Idea

The system should route behavior by explicit mode rather than trying to make one global behavior satisfy every situation.

## Candidate Modes

### 1. `default`

Use when:

- ambiguity is still meaningful
- safety and governance matter more than speed
- the user has not explicitly requested a faster route

Characteristics:

- more confirmation
- more refinement before action
- more careful stage sync
- slower but safer progression

### 2. `plan`

Use when:

- the user wants a stronger proposal
- the user is still exploring or refining an idea
- the goal is to improve the idea before implementation

Characteristics:

- intent recognition first
- domain-driven refinement
- best-practice scan
- impact and boundary assessment
- implementation deferred until plan is good enough

### 3. `deep`

Use when:

- the user wants a sidecar deep research line
- the topic is strategic or recurring
- the main task should not be blocked by deeper exploration

Characteristics:

- main flow stays moving
- sidecar research document grows in parallel
- more comparison and evidence collection

### 4. `do`

Use when:

- the user explicitly wants a fast implementation route
- the main plan is already accepted enough
- the priority is same-day delivery or aggressive execution

Characteristics:

- continuous execution by default
- stage updates do not pause work
- short status sync instead of long reflective summaries
- new side topics are parked unless critical
- stop only on real blockers, high-risk forks, hard permission gates, or clear drift

## Experimental `{do}` Instruction

Suggested trigger form:

`{do} finish today's plan`

This should mean:

- enter fast-execution route
- prioritize completion over reflective pacing
- keep syncing, but do not stop because of sync itself

Detailed protocol:

- `docs/operations/do-mode-execution-protocol.md`

## Behavior Differences By Mode

### Priority Handling

- `default`: priority inferred and frequently re-checked
- `plan`: priority is proposal quality
- `deep`: priority is research depth without blocking main flow
- `do`: priority is finish the accepted plan quickly

### Stage Updates

- `default`: richer updates acceptable
- `plan`: updates may include stronger refinement and challenge
- `deep`: updates may include broader exploration
- `do`: updates must be short and non-blocking

### New Idea Insertion

- `default`: may absorb and expand if relevant
- `plan`: usually refine the new idea
- `deep`: may open sidecar paths
- `do`: park unless critical to current delivery

### Permission Handling

- `default`: safer confirmation cadence
- `do`: batch permission-gated work when possible and continue non-blocked work

## Hard Boundaries For `{do}`

`{do}` is not permission to become reckless.

Even in `{do}` mode, stop when:

- the next step is truly blocked
- there is a high-risk architectural or product fork
- a required permission gate prevents continuation
- continuing would likely drift materially away from the intended target

## Persistence

If mode routing is adopted later, PMAIOS should persist:

- current mode
- who set it
- when it was set
- what scope it applies to

Possible scopes:

- current task only
- current session
- current project

## Recommended First Implementation

1. define mode contract in documentation
2. support manual explicit switching by instruction
3. persist mode in shared context
4. later route prompts, update cadence, and blocker policy by mode

## Current Recommendation

Treat `{do}` as an experimental mode contract immediately.

Do not wait for full system implementation before trying it in practice.
