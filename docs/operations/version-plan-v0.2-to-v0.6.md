# Historical Version Plan v0.2 -> v0.6

## Superseded Status

This document is now historical planning material.

The current canonical PMAIOS version plan is:

- `docs/operations/pmaios-version-plan.md`

The current version governance rule is:

- `docs/operations/version-governance.md`

Reason:

- Earlier `v0.2 -> v0.6` labels were planning-time labels.
- Final version numbers are now assigned by actual development and verification result.
- Current active product version is `v0.4`.

## Purpose

This was the earlier implementation plan for moving PMAIOS from a `v0.2` local runtime baseline toward a planned `v0.6` AI Product Office.

It is preserved for traceability only. Do not use it as the current operational backlog.

It replaces ad-hoc chat reconstruction as the source of truth for:

- version scope
- priority order
- completed work
- remaining implementation work
- acceptance criteria

Primary inputs:

- `docs/operations/module-roadmap.md`
- `docs/operations/ai-product-office-roadmap.md`
- `docs/operations/2026-04-18-evening-requirements-reconstruction.md`
- `docs/operations/p0-p2-execution-log.md`

## Execution Rule

Implement by version and priority:

1. Close unfinished `P0` items in the earliest incomplete version.
2. Then close `P1`.
3. Then close `P2`.
4. Update this document and the execution log after each material change.
5. Do not use chat history as the operational backlog.

## Version Summary

| Version | Theme | Current Status | Exit Criteria |
| --- | --- | --- | --- |
| `v0.2` | Local runtime and web console baseline | Mostly complete | Local API/UI/CLI are buildable, testable, and documented |
| `v0.3` | AI Product Office foundation | Partial | Product-chief operating model, physical-world profile, specialist agent hierarchy, and governed templates are active, not just documented |
| `v0.4` | Controlled workflow kernel and traceability | Mostly complete | Runtime, requirements, versions, review, observability, and DAG impact are connected to active workflow operations |
| `v0.5` | Governed AI product work loop | Incomplete | Product agents generate governed outputs, ask missing questions, enforce scouting/learning/UI-schema loops, and publish only through real review state |
| `v0.6` | Integrated mainline OS | Partial | Multi-project runtime, Hermes policy layer, retrieval governance, CI/deploy, and smoke verification are integrated into the active mainline |

## v0.2 Local Runtime Baseline

### Completed

- Active backend entrypoint exists at `src/backend/server.ts`.
- React console exists at `src/frontend/App.tsx`.
- CLI entrypoint exists at `src/cli/aios.ts`.
- Local lint, test, and production build pass.
- Backend serves built frontend in production mode.
- Chroma has local-safe in-memory fallback.
- Local runbook documents startup and smoke checks.

### Remaining

- `P2`: Run a long-lived production smoke against `npm start` and record exact API/UI checks.
- `P2`: Confirm CI artifact download after pushing the branch.

### Acceptance

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm start` smoke documents health, workflow, DAG, retrieval, and Hermes endpoints.

## v0.3 AI Product Office Foundation

### Completed

- AI Product Office roadmap exists.
- Human/AI boundary is documented.
- Product output template categories are documented.
- Product-agent manager/specialist blueprint hierarchy exists.
- Frontend can display product agents and bootstrap the blueprint hierarchy.
- Claude Code installation status has been recorded.
- Virtual Product Chief runtime analysis exists:
  - generates missing physical-world questions
  - generates learning/cognitive guidance
  - selects engaged specialist agents
  - requires governed outputs such as physical-world profile, ecosystem scan, version plan, and UI schema spec
  - persists auditable reports under `docs/memory/product-chief/reports/`
- Product Chief governed output generation exists:
  - generates auditable output records under `docs/memory/product-chief/outputs/`
  - writes Markdown artifacts under `docs/product-office/outputs/`
  - records specialist agent participation for generated outputs
  - covers ecosystem/open-source scouting and schema-driven UI/business-block planning outputs
- Specialist product agents now execute auditable Product Chief output tasks:
  - task records persist under `docs/memory/product-chief/specialist-tasks/`
  - task artifacts persist under `docs/product-office/specialist-tasks/`
  - generated output records include `specialistTaskIds` and `specialistTaskArtifactPaths`
  - output version entries include specialist task artifacts in trace paths
- Historical documentation normalization is now a tracked runtime operation:
  - `DocumentationNormalizationService` scans `docs/sources/inbox/`
  - generated runs persist under `docs/memory/document-normalization/runs/`
  - normalized artifacts persist under `docs/product-office/document-normalization/`
  - generated requirements and version records link every normalized source back to traceable repository state
- Historical Claude design tooling status is preserved in `docs/archive/claude-design-tooling-status-2026-04-19.md`.
- Product Chief can now generate roadmap/version planning, daily intelligence, weekly brief, demo script, user manual, strategic radar, and external capability evaluation outputs through the same governed output pipeline.
- Product Chief can now generate learning and cognitive upgrade memos for recurring operator blind spots.

### Partially Complete

- Specialist product agents now execute deterministic auditable tasks; model-backed specialist execution through live provider calls is still a future enhancement.
- Product output templates exist and Product Chief output generation is now a runtime action.
- Physical-world profile template exists, but context updates are not yet automatically captured into a living profile.

### Remaining P0

- None for the current AI Product Office foundation baseline.

### Remaining P1

- None for the current AI Product Office foundation baseline.

### Remaining P2

- Connect external knowledge and internal system data.

### Acceptance

- Product-chief endpoint or runtime action returns missing-question prompts based on context gaps.
- Specialist agent engagement is persisted as auditable work, not only metadata.
- At least one governed product output can be generated from the active console/API.
- Documentation normalization produces traceable requirement/version/output records.

## v0.4 Controlled Workflow Kernel

### Completed

- Orchestrator supports manual resume and manual gate decisions.
- Requirement system supports create, update, batch update, chat ingestion, priority, status, and trace links.
- Version system records release notes, diff summary, approval metadata, and rollback linkage.
- Review gate blocks runs missing open-source-first/build-vs-buy evidence.
- Observability panel filters timeline entries.
- Workflow Ops panel exposes advance, run-until-blocked, resume, approve, and rework.
- DAG graph and impact baseline are derived from workflow definitions.
- DAG dirty-node rerun is connected to the active workflow runtime.

### Remaining P0

- None for the current active kernel loop.

### Remaining P1

- Add richer requirement source attribution from non-chat sources.
- Add evaluation history drill-down by requirement/version/capability.

### Remaining P2

- Add end-to-end smoke coverage for DAG rerun through a running production server.

### Acceptance

- Full test suite passes.
- CLI review rework behavior and DAG rerun behavior both pass regression tests.
- Frontend can operate workflow stages without manual file edits.

## v0.5 Governed AI Product Work Loop

### Completed

- Capability registry supports registration, dataset creation, evaluation run trigger, publish, invoke, and rollback controls.
- Capability desk supports release-note and review-summary editing.
- Product-agent hierarchy is visible and bootstrappable.
- Capability publish now derives publish approval from real evidence:
  - latest capability evaluation must pass
  - linked workflow review must pass
  - frontend `testsPassed` / `reviewPassed` booleans are ignored for publish gating and retained only for API compatibility
- Generated Product Chief outputs now link into requirement and version records:
  - generated output records include `requirementIds` and `versionEntryId`
  - each generated output can create a review requirement
  - version entries use `product-output` as the governed entity type
  - requirement traces are backfilled with generated artifact paths
- Specialist Product Chief tasks are now executed and traced as part of generated output creation.
- Roadmap/version planning, intelligence briefs, demo scripts, manuals, strategic radar, and external capability evaluation are now governed Product Chief output types.

### Partially Complete

- External open-source scouting is required by review logic and can be generated as a governed Product Chief output; it still needs real external research integration.
- Schema-driven UI can be generated as a governed Product Chief output; it still needs deeper integration with UI implementation tasks.

### Remaining P0

- None for the current governed work-loop baseline.

### Remaining P1

- None for the current governed work-loop baseline.

### Remaining P2

- None for the current governed work-loop baseline.

### Acceptance

- Publish API refuses capability publication when linked review/evaluation state is insufficient.
- Strategic proposal generation includes an ecosystem/open-source scan artifact.
- Product-chief output includes missing questions, learning guidance, and UI-schema/business-block recommendations when relevant.

## v0.6 Integrated Mainline OS

### Completed

- Multi-project portfolio visibility exists.
- Provider routing visibility and provider priority controls exist.
- DAG dirty-node rerun is integrated with workflow runtime.
- Retrieval governance supports local-only, prefer-remote, remote-required, indexing, governed search, and quality-gate reporting.
- Hermes is integrated into the TypeScript mainline as an enhance-only policy service.
- CI workflow is split into verification/build jobs with artifact upload.

### Partially Complete

- Retrieval governance is active for its dedicated API/UI, but not yet wired into every user-facing knowledge/retrieval path.
- Hermes policy reports are visible, but not yet used as input to all strategic product-output generators.
- CI is configured, but remote CI artifact download has not been verified in this environment.
- NotebookLLM retrieval now uses retrieval governance settings for remote policy, `topK`, and score filtering.
- Docker Compose now includes a Chroma service, and remote Chroma heartbeat was verified through the Node Chroma client; the verification container was stopped afterward.
- Chroma integration now falls back to in-memory collections when a reachable remote server lacks the default embedding function required by the JS client.

### Remaining P0

- None for the current runtime integration baseline.

### Remaining P1

- None for the current integrated mainline baseline.

### Remaining P2

- CI artifact download check after push.

### Acceptance

- `npm run lint`
- `npm run test`
- `npm run build`
- UI smoke covers Workflow Ops, Hermes Policy, DAG Impact, Retrieval Governance, Product Agents, Portfolio, Capability Ops, and Requirement + Version Desk.

## Global Backlog Order

### Next P0

1. None currently open across the `v0.2` to `v0.6` implementation baseline.

### Next P1

1. None currently open across the `v0.2` to `v0.6` implementation baseline.

### Next P2

1. CI artifact download verification after push.
2. Connect broader external knowledge/internal system data sources beyond current local repository and Chroma scope.

## Latest Verification

Current verified commands:

- `npm run lint`
- `npm run test -- productChiefService`
- `npm run test -- productChiefService capabilityRegistry`
- `npm run test -- capabilityRegistry`
- `npm run test -- requirementVersion capabilityRegistry`
- `npm run test -- documentationNormalizationService productChiefService`
- `npm run test -- notebookllm`
- `npm run test -- documentationNormalizationService`
- `npm run test`
- `npm run build`
- `npm run cli -- documentation normalize`
- `node --input-type=module -e "...ChromaClient heartbeat..."`

Current full-test result:

- `19` test files passed
- `69` tests passed
