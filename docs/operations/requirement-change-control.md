# Requirement Change Control

## Purpose

This process prevents PMAIOS from mixing new requests into the active version without updating the plan.

It applies to all new product, engineering, tooling, documentation, and environment requirements.

## Change Types

| Type | Meaning | Default Handling |
| --- | --- | --- |
| `scope-add` | New capability or feature | Add requirement, classify priority, decide current/future version. |
| `scope-change` | Changes accepted behavior or acceptance criteria | Update requirement and version plan before implementation. |
| `defect` | Current accepted capability is broken | Fix immediately if it blocks verification; backfill record in same session. |
| `environment` | Local machine, Docker, package, CI, or credential issue | Record impact and required owner action early. |
| `documentation` | Plan, runbook, status, or template update | Update docs before or alongside implementation. |

## Required Fields

Every change should record:

- request summary
- source
- priority: `P0`, `P1`, or `P2`
- target version
- acceptance criteria
- affected files or systems
- verification plan
- status

## Priority Rules

- `P0`: blocks local runtime, verification, current-version acceptance, or core product loop.
- `P1`: materially improves current-version traceability, operator workflow, or governed product output.
- `P2`: hardening, external integration, environment expansion, or future-product leverage.

## Current Version Handling

Current version: `v0.4`.

New work can enter `v0.4` only if one of these is true:

- it is required for `v0.4` acceptance
- it fixes a verification blocker
- it clarifies version tracking or daily reporting
- it is explicitly accepted as a current-version change in the plan

Otherwise it should be assigned to a future version candidate.

## Operating Rule

When a new requirement appears:

1. Update `docs/operations/current-version-progress.md`.
2. Update `docs/operations/pmaios-version-plan.md` if version scope changes.
3. If implementation starts, create or update requirement/version trace in the runtime system when possible.
4. Record verification evidence after completion.

