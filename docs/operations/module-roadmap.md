# Module Roadmap

## Purpose

This document records the current PMAIOS module roadmap against the live repository baseline. It is intended to answer one question clearly: what should be completed next, by whom, and in what order.

## Roadmap Table

| Module | Recommended Owner | Priority | Next Milestone | Fill Order |
| --- | --- | --- | --- | --- |
| Workflow kernel / orchestrator | Platform architect + runtime engineer | `P0` | Upgrade the main loop from "runnable" to "controllable" with failure recovery, manual gate control, and explicit rework handling | `1` |
| Requirement system | Product platform owner + requirement PM | `P0` | Turn the current requirement records into a real managed pool with status flow, prioritization, source traceability, and batch operations | `2` |
| Observability / review / metrics | Delivery quality owner + review owner | `P0` | Add one operational surface for run, stage, artifact, review, and metrics visibility | `3` |
| Version system | Release owner + platform backend owner | `P0` | Turn version logging into a release loop with diff, rollback, release notes, and approval records | `4` |
| Frontend console | Frontend owner + PMAIOS product owner | `P1` | Upgrade from read-only inspection to workflow operations: requirement pool, version desk, observability desk, and rework entrypoints | `5` |
| Capability registry / evaluation / publish | Capability owner + QA/eval owner | `P1` | Complete the capability lifecycle with evaluation, publish, rollback, and invocation visibility | `6` |
| Multi-project / subproject isolation | Portfolio PM + platform backend owner | `P1` | Move from isolated project runs to portfolio-level management with cross-project visibility and shared capability governance | `7` |
| Product-agent governance | Product platform lead + agent governance owner | `P1` | Move product agents from "registered/generated" to "governed/observable/auditable" | `8` |
| DAG / impact engine | Graph execution owner + runtime engineer | `P1` | Connect the current `v0.4` DAG skeleton to the main runtime, starting with dirty-node rerun and impact propagation | `9` |
| Hermes / legacy side branch integration | Platform architect + agent runtime engineer | `P2` | Integrate Hermes into the active mainline as a policy/enhancer service instead of a parallel legacy API | `10` |
| Retrieval / Chroma / knowledge | Knowledge engineer + platform backend owner | `P2` | Upgrade from local-safe retrieval to governed retrieval with indexing strategy, quality control, and remote/local mode management | `11` |
| Runtime / deploy / CI | DevOps / release engineer | `P2` | Add CI/CD, environment layering, monitoring, alerting, and release rollback rehearsal | `12` |

## Recommended Execution Sequence

1. Close the `P0` loop first:
   `orchestrator -> requirement -> observability -> version`
2. Upgrade the operator surface next:
   `frontend -> capability -> multi-project`
3. Then pull graph, policy, retrieval, and deploy hardening into the active runtime:
   `DAG -> Hermes -> retrieval -> deploy`

## Current Read

- The active product version is now `v0.4` under `docs/operations/pmaios-version-plan.md`.
- Earlier `v0.5` and `v0.6` labels are treated as planning-language references, not accepted product versions.
- The repository is currently a `v0.4` release candidate with graph, policy, retrieval, and product-office runtime capabilities already pulled into the active line.

## Acceptance Guidance

- Do not open a new major branch of work before the current `P0` closed loops are operational.
- Prefer integrating mature open-source tools before writing bespoke module code.
- Treat this roadmap as the operational priority order unless a newer decision record overrides it.
