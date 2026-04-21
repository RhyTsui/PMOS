# Sidecar Deep Research Mechanism

- version: v0.1
- date: 2026-04-21
- status: draft
- scope: v0.5 candidate research workflow extension

## Purpose

This document defines how PMAIOS should support deeper research without derailing the main execution path.

The principle is:

- main flow keeps moving
- a sidecar research thread can deepen the topic
- the user can inject physical-world context later
- the two lines remain linked

## Main Flow Vs Sidecar Flow

### Main Flow

The main flow exists to:

- keep the active task moving
- produce the immediate artifact or decision
- avoid blocking on every unresolved extension

### Sidecar Deep Research

The sidecar flow exists to:

- expand a large topic beyond the immediate task
- compare routes more deeply
- accumulate evidence and examples
- remain open to later user feedback and real-world constraints

## When To Start A Sidecar Research Thread

Start one when the topic is:

- large enough to recur
- strategic enough to influence many downstream decisions
- multi-route and not obviously settled
- likely to gain from outside/physical-world feedback
- valuable beyond the current task only

Do not start one for every local issue.

## Expected Outputs

A sidecar deep research thread can produce:

- deep research document
- comparison matrix
- method brief
- concept map
- recommendation memo

At minimum it should define:

- topic
- why it matters
- candidate routes
- what still needs real-world input
- what should remain separate from the main flow

## Linkage Rules

A sidecar document should link back to:

- the triggering task
- the related board or project
- the related version or planning topic

The main flow should also note that sidecar research exists, so the topic is not lost.

## Anti-Patterns

Do not let sidecar research:

- freeze the main delivery path
- create a second source of truth
- become endless unbounded exploration
- silently redefine the current task without explicit sync

## Suggested First Implementation Order

1. define trigger criteria
2. define minimum sidecar template
3. define how sidecar topics appear in cognition map
4. define how sidecar insights promote back into mainline docs
