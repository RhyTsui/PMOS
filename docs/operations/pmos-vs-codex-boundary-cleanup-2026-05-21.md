# PMOS vs Codex Boundary Cleanup

- date: 2026-05-21
- status: solved-for-current-todo
- scope: PMOS product behavior vs Codex-local executor adaptation

## Purpose

This record closes the current PMOS vs Codex boundary-cleanup todo.

The target is not to remove Codex from the repo. The target is to make sure PMOS product behavior can be recovered from repo truth sources, while Codex-local state remains only an executor adaptation layer.

## Cleanup Result

| Area | Product Truth Location | Codex / Local Role | Result |
| --- | --- | --- | --- |
| Startup identity and active version | `docs/operations/startup-whoami.md`, `docs/operations/platform-truth-source-index.md`, `docs/operations/current-version-progress.md` | `AGENTS.md` reminds the executor to read these files | solved |
| Shared task and checkpoint state | `docs/memory/mcp-context/session-state.json`, `McpContextSyncService`, CLI/API mcp-context commands | Codex runs sequential write commands and records checkpoints | solved |
| Default Chinese, requirement refinement, dual requirement, denominator progress, no-false-finish | `docs/operations/startup-whoami.md`, `docs/operations/codex-collaboration-migration-baseline.md`, `docs/operations/requirement-promotion-and-loss-prevention.md`, `docs/operations/user-requirement-backcheck-2026-04-21.md` | `AGENTS.md` repeats the rules as executor startup constraints | solved |
| `{do}` fast route | `docs/operations/do-mode-execution-protocol.md`, `docs/operations/do-mode-task-start-contract.md`, `docs/architecture/mode-architecture.md` | Codex follows the fast-route behavior when the shared mode requires it | solved |
| PMOS UI governance | `docs/operations/frontend-style-default.md`, `docs/operations/uiux-stack-baseline.md`, `docs/operations/product-workflow-total-design.md`, `docs/operations/ui-pmos-copilot-contract.md`, `docs/templates/ui_schema_spec_template.md`, `src/ui-schema/registry.ts` | `AGENTS.md` acts as a high-priority executor reminder, not the sole source | solved |
| Product repo packaging and keep/drop boundary | `docs/operations/product-repo-release-readiness.md`, `docs/release/product-repo-readiness-package.md`, `docs/release/product-repo-readiness-package.json` | Codex-local command approvals and dirty-worktree notes are excluded from product scope | solved |
| Local Codex memories | none for PMOS platform behavior | `C:/Users/xuyun/.codex/memories/*.md` currently contains `ad` subproject recovery copies only | local-only |
| Secrets, tokens, account paths, command approval history | documented as environment/setup concerns, not product truth | `.env`, local approvals, connector account details stay local | local-only |

## Clean-Checkout Recovery Check

A clean PMOS checkout must be able to recover product behavior without reading hidden Codex memory.

Required recovery chain:

1. `AGENTS.md`
2. `docs/operations/startup-whoami.md`
3. `docs/operations/platform-truth-source-index.md`
4. `docs/operations/current-version-progress.md`
5. `docs/operations/v1.0-gap-list.md`
6. `docs/operations/v1.0-acceptance-standard.md`
7. `docs/operations/pmos-vs-codex-spec-boundary.md`
8. `docs/operations/do-mode-execution-protocol.md`
9. `docs/operations/do-mode-task-start-contract.md`
10. `docs/operations/frontend-style-default.md`
11. `docs/operations/uiux-stack-baseline.md`
12. `docs/operations/product-workflow-total-design.md`
13. `docs/operations/ui-pmos-copilot-contract.md`
14. `docs/templates/ui_schema_spec_template.md`
15. `src/ui-schema/registry.ts`

Inspection result:

- PMOS product behavior no longer depends on `C:/Users/xuyun/.codex/memories`.
- The local Codex memories inspected in this cleanup are subproject handoff notes, not platform product rules.
- `AGENTS.md` remains in the product repo because it is the same-repo executor bootstrap file, but every durable product rule it carries now points to repo truth documents.
- External Cloud mirror publish is intentionally removed from the current active todo; local `cloud-mirror/runtime-status.*` remains product evidence.
- Dataki / Notion retrieval loop is marked operator-verified for the current todo denominator.

## Acceptance

This item is closed for the current v1.0 todo because:

1. product behavior rules have repo truth-source locations
2. local-only executor rules are explicitly classified
3. clean-checkout recovery has a concrete repo-file chain
4. hidden Codex memories are not required for PMOS platform behavior

Remaining release-level verification, such as a clean external export and install/start test, belongs to the deployment / product-repo release track, not this boundary-cleanup todo.
