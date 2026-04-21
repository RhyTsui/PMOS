# `{do}` Task Start Contract

- version: v0.1
- date: 2026-04-21
- status: draft
- scope: fast-route task kickoff

## Purpose

This document defines the minimum kickoff contract when PMAIOS enters `{do}` mode for a concrete task.

The goal is to avoid:

- vague fast execution
- hidden priority assumptions
- side-thread hijacking
- summary-shaped false starts
- cheap stakeholder interruptions turning into silent task pauses
- direct questions silently resetting the active route

## Continuity Check

When a new message arrives during `{do}`, check:

1. did the main target actually change
2. is this only a cheap side question
3. can the answer be given briefly without changing the route

If the target did not change, keep the same active main line after the answer.

## Required Kickoff Fields

When entering `{do}`, the task start should make these fields explicit:

1. accepted target
2. current highest-priority line
3. parked side lines
4. known blockers
5. next safe step

## Example Shape

- accepted target: finish the current v0.5 documentation and mode-routing cleanup batch
- current highest-priority line: startup truth -> mode protocol -> implementation index
- parked side lines: access surface implementation, project-level rollout, external connector hardening
- known blockers: none / permissions / architecture fork
- next safe step: update the next authoritative document or board immediately

## Example From This Session

- accepted target: unify mode architecture, startup truth, implementation index, and human-machine collaboration research entrances
- current highest-priority line: startup truth -> do protocol -> implementation index -> boards
- parked side lines: access surface implementation, subproject rollout, external connector hardening
- known blockers: none
- next safe step: continue tightening board and document consistency

## Relation To Shared Context

When practical, `{do}` kickoff should also be reflected through:

- `npm run cli -- mcp-context task-start ...`
- `npm run cli -- mcp-context checkpoint ...`

This keeps fast-route execution recoverable across tool switches and model switches.

## Related Documents

- `docs/architecture/mode-architecture.md`
- `docs/operations/do-mode-execution-protocol.md`
- `docs/templates/mode_switch_template.md`
