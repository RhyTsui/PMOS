# PMAIOS Version Plan

## Purpose

This is the canonical PMAIOS version plan after cleaning up earlier planning-time version labels.

The previous `v0.2 -> v0.6` wording is now treated as historical roadmap language. Actual product versions are assigned by accepted development result.

Canonical version governance:

- `docs/operations/version-governance.md`

Current daily progress snapshot:

- `docs/operations/current-version-progress.md`

## Version Timeline

| Version | Cycle | Theme | Acceptance State |
| --- | --- | --- | --- |
| `v0.1` | 2026-04-06 -> 2026-04-12, inferred | Prototype workflow/runtime seed | Archived |
| `v0.2` | 2026-04-13 -> 2026-04-18 20:15, inferred | Local runtime baseline | Accepted |
| `v0.3` | 2026-04-18 20:15 -> 2026-04-18 22:20, inferred | AI Product Office planning and foundation consolidation | Accepted |
| `v0.4` | 2026-04-18 22:00 -> current | Active AI Product Office runtime and governed product loop | In progress / release candidate |

## v0.1 Prototype Workflow Runtime

### Cycle

- Start: 2026-04-06, inferred from review/run artifacts.
- End: 2026-04-12, inferred.

### Accepted Scope

- Early workflow and review concepts existed.
- Initial repository memory and execution artifacts existed.
- This version is archived as historical seed work.

### Remaining

- None. All actionable work is folded into later versions.

## v0.2 Local Runtime Baseline

### Cycle

- Start: 2026-04-13, inferred.
- End: 2026-04-18 20:15 +0800, anchored by commit `14432a4`.

### Accepted Scope

- Backend entrypoint exists.
- Frontend console exists.
- CLI entrypoint exists.
- Local lint, tests, and production build passed.
- Backend can serve built frontend.
- Local Chroma fallback exists.
- Local runbook and release docs exist.

### Acceptance Evidence

- Commit `14432a4`: `feat: ship PMAIOS local runtime with passing build, tests, and release docs`.

### Remaining

- None for `v0.2`; later smoke hardening is handled in `v0.4`.

## v0.3 AI Product Office Foundation

### Cycle

- Start: 2026-04-18 20:15 +0800, inferred from post-runtime baseline.
- End: 2026-04-18 22:20 +0800, inferred from roadmap/template timestamps.

### Accepted Scope

- AI Product Office target model documented.
- Human/AI boundary documented.
- Product output categories documented.
- Manager/specialist Product Agent hierarchy defined.
- Physical-world profile template introduced.
- AI-first estimation model introduced.
- External pattern/open-source scouting requirement introduced.
- Schema-driven UI and reusable business block direction introduced.
- Module roadmap defined with P0/P1/P2 execution order.

### Remaining

- None for `v0.3`; implementation moved into active `v0.4`.

## v0.4 Active Runtime And Governed Product Loop

### Cycle

- Start: 2026-04-18 22:00 +0800.
- Current date: 2026-04-19.
- Status: in progress / release candidate.

### Product Goal

Turn PMAIOS from a local workflow runtime plus roadmap into an active project-PM output runtime:

- can generate current-project product outputs that the PM can use directly every day
- can ask missing product questions
- can route work to product agents
- can generate governed product outputs
- can run deterministic multi-agent review on generated PM outputs
- can trace requirements, versions, reviews, evaluations, and artifacts
- can normalize historical documents
- can operate local/remote retrieval governance
- can expose product-office operations in the frontend console

Priority order inside `v0.4`:

1. Project PM outputs for the current product project.
2. Product Agent / product skill / design skill / documentation-output workflow.
3. Product Chief review and governance.
4. Engineering hardening only when it blocks product-output use.

### Completed Capability Groups

- Product Chief runtime analysis.
- Missing physical-world question generation.
- Learning and cognitive guidance generation.
- Product Agent manager/specialist hierarchy bootstrap and frontend surface.
- Product skill registry API and frontend surface for product/design/documentation-output skills.
- External connector surface for Notion, Figma, web fetch, and DingTalk meeting-note import.
- Governed Product Chief output generation.
- Specialist task records and artifacts.
- Deterministic multi-agent review loop for generated project PM outputs.
- Project PM Outputs frontend surface with review status and artifact links.
- Documentation normalization runtime, API, CLI, artifacts, requirement trace, and version trace.
- Capability registry lifecycle: register, dataset, evaluation run, publish, invoke, rollback.
- Capability publish gate based on real evaluation and linked workflow review evidence.
- Requirement Desk: create, update, batch update, chat ingestion, status, priority, trace.
- Version Desk: release notes, diff summary, rollback linkage, approval metadata.
- Workflow Ops: advance, run-until-blocked, resume, manual approve/rework.
- Observability filters.
- Portfolio panel.
- DAG graph, change event, dirty node state, and dirty rerun.
- Retrieval governance: mode, remote URL, indexing, topK, quality gate, governed search.
- NotebookLLM retrieval governance integration.
- Hermes policy mainline TypeScript service.
- Docker Compose Chroma service with verified remote heartbeat.
- Chroma in-memory fallback when remote embedding function is unavailable.
- Claude design tooling status and `claude-design-system@1.0.7` installation record.
- Rich requirement source attribution from non-chat sources:
  - document normalization requirements use `document-normalization`
  - extracted document requirements use `document`
  - Product Chief output review requirements use `product-output`
  - each source can carry `sourceRef` with entity/path/label context
- Evaluation history drill-down by requirement, version entry, capability, and version.
- Production API smoke for health, workflow, Product Chief, documentation normalization, retrieval governance, and evaluation history.

### In Progress

- Version progress reporting is active and should be maintained daily.
- Product-output priority is now centered on current project PM work; Product Chief remains the review/governance layer.

### Open P2 / External Follow-up

- CI artifact download verification after push.
- Broader external knowledge and internal system connectors beyond the current Notion/Figma/web/DingTalk starter surface.
- Real model-backed specialist execution; this is future enhancement, not a blocker for deterministic `v0.4` multi-agent review.
- Living physical-world profile automation.
- UI schema to implementation-task loop.

### v0.4 Acceptance Criteria

- `npm run lint` passes.
- `npm run test` passes.
- `npm run build` passes.
- Product Chief can generate governed outputs with requirement/version trace.
- Project PM can use generated roadmap/version/daily/weekly/demo/manual/design/evaluation outputs directly.
- Product, design, and documentation-output skills are visible from API and frontend.
- Notion/Figma/web/DingTalk connector readiness is visible from API and frontend.
- Web pages and DingTalk meeting notes can enter governed inbox/document-normalization flow.
- Generated project PM outputs include deterministic multi-agent review records and artifacts.
- Documentation normalization creates auditable runs and requirement/version records.
- Requirement records expose non-chat source attribution for document normalization, extracted documents, and Product Chief outputs.
- Evaluation history can be queried by capability/version/requirement/version-entry.
- Capability publish rejects insufficient evaluation/review evidence.
- Requirement and Version desks expose traceability.
- Workflow Ops can run, block, resume, approve, and rework.
- DAG dirty rerun is connected to workflow runtime.
- Retrieval governance can index/search with quality-gate result.
- Hermes policy reports are available in the mainline runtime.
- Current version progress snapshot is updated.
- Production API smoke covers the main v0.4 endpoints.

## Future Version Candidates

### v0.5 Candidate

Likely theme: external data and real-world product-office integration.

Candidate scope:

- Notion, Figma, web research, meeting transcript, and internal document connectors.
- External knowledge ingestion with permissions and source trace.
- Living physical-world profile updates.
- Daily/weekly report automation from live sources.

### v0.6 Candidate

Likely theme: autonomous multi-agent product delivery.

Candidate scope:

- Model-backed specialist agents.
- Realtime/model-backed multi-agent collaboration beyond the deterministic `v0.4` review loop.
- UI schema to implementation-task generation.
- Stronger release/CI/CD automation and artifact download verification.

Future versions must be accepted through requirement change control before implementation.
