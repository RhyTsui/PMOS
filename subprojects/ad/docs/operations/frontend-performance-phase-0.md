# Frontend Phase 0 Performance Baseline

- status: active
- scope: frontend performance baseline and modular split preparation
- appRoot: `frontend/src`
- reportOutput: `frontend/src/tmp/performance-baseline/phase-0-baseline.md`
- canonicalSpecs:
  - `AGENTS.md`
  - `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
  - `docs/architecture/governance/ai-chat-implementation-guardrails.md`
  - `docs/operations/ui-guardrail.md`
  - `docs/小乔智投-Ant-Design-X默认规范-2026-05-09.md`

## Boundary

Phase 0 is an evidence-gathering phase. It must not change user-visible product copy, `/api/chat` orchestration, MCP execution, model routing, Prompt behavior, ResponseContract shape, or Trace semantics.

The baseline belongs to:

- Frontend Presentation: route availability and response size.
- Frontend Engineering System: build assets, source module size, client component inventory.
- Observability: repeatable local report output for later comparison.

It does not belong to:

- Request Understanding
- Chat Domain
- Capability Discovery
- MCP
- Model Service
- Prompt
- ResponseContract
- Admin configuration

## Command

Run from `frontend/src`:

```bash
pnpm perf:phase0
```

Optional environment variables:

```bash
FRONTEND_BASE_URL=http://127.0.0.1:8002
PHASE0_ROUTES=/,/reports,/admin
PHASE0_OUTPUT_DIR=tmp/performance-baseline
```

The default route set covers the current user-facing workbench, report entry, and admin control surface. Add routes through `PHASE0_ROUTES` when validating a specific split candidate.

## Captured Signals

The script records:

- HTTP probe per route: status, first byte time, total time, response bytes.
- `.next/static` JavaScript and CSS sizes when a production build exists.
- Source inventory under `src/app`, `src/components`, `src/contracts`, `src/lib`, and `src/renderers`.
- Large files, client components, external import counts, dynamic import counts.
- Initial split candidates based on source size, client component boundary, and import fan-in.

The output is intentionally lightweight and dependency-free so it can run before adding heavier lab tooling.

## Modular Split Preparation

Use the generated split candidates as investigation leads, not as automatic refactor instructions.

Before splitting a module, classify it:

- Result Plane renderer: must continue through `SemanticResultContract.regions[].componentBinding`.
- Runtime Plane renderer: must remain under Runtime Display Protocol or the `ai-runtime` / `workflow-trace` binding.
- Conversation shell: should preserve Ant Design X semantics for input, message, suggestions, actions, attachments, and markdown.
- Admin-only surface: can be lazily isolated from the primary user workbench when it is not needed for first interaction.

Do not split by copying contracts or creating parallel UI schemas. Keep shared action, evidence, source, runtime, and component registry contracts as the single source.

## Acceptance

Phase 0 is ready for Phase 1 when:

- `pnpm perf:phase0` produces JSON and Markdown output.
- Route probes succeed for the selected route set.
- A production build has been run at least once so `.next/static` asset sizes are available.
- The report identifies concrete split candidates with file paths and size/import evidence.
- `pnpm validate:ad-ui` remains green after script and document changes.

If a route probe fails because the dev server is not running, start the app and rerun the command. Do not mark route performance as valid from source scan alone.
