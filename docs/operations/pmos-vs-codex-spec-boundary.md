# PMOS vs Codex Spec Boundary

- version: v0.2
- date: 2026-05-21
- status: active

## Purpose

This document defines which rules belong to PMOS product truth and which rules may remain Codex-local executor adaptation.

The goal is to keep PMOS deployable and reproducible without depending on hidden local memory.

## Boundary

| Area | PMOS Product Truth | Codex-Local Adaptation |
| --- | --- | --- |
| Product behavior | workflow stages, review gates, acceptance standards, role contracts | temporary task notes and local execution preferences |
| Runtime state | Task SSOT, Outbox, Scheduler, Document Governance, cloud mirror | local session recovery hints that are not product behavior |
| UI governance | PMOS UI contract, UISchema rules, anti-pattern guardrails | editor-specific shortcuts or local browser automation setup |
| External sync | GitHub/Notion/Dataki layering, publish cadence, outbox receipts | local tokens, account-specific connector paths |
| Skills/tools | product-facing skill registry and capability classification | installed Codex skills, plugin cache, hidden tool metadata |
| Handoff | repo docs and shared MCP context | private `.codex/memories` copies used only as redundant local recovery |

## Migration Rule

If a rule affects:

- user-facing behavior
- product quality gates
- deployability
- cross-device reproducibility
- external publish or audit

then it must live in the PMOS repo truth.

If a rule only affects:

- this machine's shell behavior
- a local token path
- an executor UI preference
- temporary command approval history

then it can remain Codex-local.

## Current PMOS Truth Sources

Product behavior and runtime rules should be recovered from:

- `docs/operations/startup-whoami.md`
- `docs/operations/current-version-progress.md`
- `docs/operations/v1.0-gap-list.md`
- `docs/operations/v1.0-acceptance-standard.md`
- `docs/operations/cloud-sync-layer-contract.md`
- `docs/operations/product-repo-release-readiness.md`
- `cloud-mirror/runtime-status.md`
- `docs/memory/mcp-context/session-state.json`

Codex-local mirrors may exist, but they are not the product source of truth.

## Current Gaps

- Boundary cleanup for the current v1.0 todo is recorded in `docs/operations/pmos-vs-codex-boundary-cleanup-2026-05-21.md`.
- Product behavior rules carried by `AGENTS.md` now have repo truth-source locations; `AGENTS.md` remains an executor bootstrap/reminder, not the sole source of product behavior.
- Inspected Codex-local memories are subproject recovery copies, not PMOS platform product rules.
- Command approval history, local tokens, account paths, and connector-specific runtime details are local-only by design.
- A clean external product-repo export and install/start test still belongs to the deployment / release track.

## Acceptance

This boundary is `partial-strong` when:

1. product behavior rules have repo truth-source locations
2. local-only executor rules are identified as local-only
3. current-state recovery has a cloud-visible mirror

For the current todo, this boundary is treated as `solved` because the repository now has an explicit recovery chain and hidden Codex memories are not required for PMOS platform behavior.

The remaining external clean-export verification belongs to `Deployment / operation / release / GitHub sharing readiness`.
