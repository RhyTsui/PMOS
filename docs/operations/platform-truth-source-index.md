# PMAIOS Platform Truth Source Index

- version: v0.3
- date: 2026-05-09
- status: active

## Purpose

This is the single entry document for PMAIOS platform-level truth sources.

Use it to answer:

- which documents define the current active platform version
- which documents are direction-only
- which documents are release snapshots
- which older documents must not be mistaken for active truth

## Active Platform Truth

### 1. Runtime Snapshot

- `docs/operations/current-version-progress.md`

Use for:

- current active version
- current runtime judgment
- landed vs still-deepening capability status

### 2. Active Direction

- `docs/operations/pmaios-v1.0-direction.md`

Use for:

- why the current version exists
- what the five priority tracks are
- what is intentionally out of scope

### 3. Landed Minimum-Loop Closeout

- `docs/operations/v0.7-minimum-loop-summary.md`

Use for:

- what has already landed into the active runtime
- what was verified at minimum-loop level
- what must not be overstated yet

### 4. v0.7 Runtime Governance Slice

- `docs/operations/v0.7-p0-execution-definition-stage-agent-ui-spec-repeat-correction.md`

Use for:

- the landed runtime governance slice after the minimum loop
- how stage-agent orchestration, UI spec activation, and repeat-correction memory are defined
- what should count as real runtime adoption instead of proposal-only discussion

### 5. Hermes Effectiveness Assessment

- `docs/operations/hermes-current-effectiveness-assessment-2026-05-07.md`

Use for:

- current real effectiveness of Hermes
- what has landed vs what still lacks user-value-level effect
- why compare/judge is not equal to “say once, never say twice”

### 6. Runtime Governance Workspace Slice

- backend route: `GET /api/v0.7/runtime-governance`
- backend route: `POST /api/v0.7/runtime-governance/repeat-corrections/:candidateId/promote`
- frontend panel: `src/frontend/components/V07RuntimeGovernancePanel.tsx`

Use for:

- runtime-visible evidence of stage-agent orchestration
- runtime-visible evidence of UI spec activation
- runtime-visible repeat-correction candidate promotion

### 7. Timeline And Version Discipline

- `docs/operations/pmaios-version-plan.md`

Use for:

- historical version sequence
- current active version placement
- version-state discipline across archived, accepted, and active stages

### 8. Execution Priority

- `docs/operations/module-roadmap.md`

Use for:

- platform module priority order
- recommended owner shape
- what should be filled next in the active runtime

### 9. PMOS Identity And Panorama

- `docs/operations/pmaios-introduction.md`
- `docs/architecture/PMAIOS_product_management_agent_operating_model.md`
- `docs/boards/pmaios-runtime-panorama-v0.7.svg`

Use for:

- the clean v0.7 PMOS identity statement
- the active operating model for platform / workflow / Hermes / human approval
- the single panorama that explains the local unified entry as a control plane instead of a chat shell

### 10. Frontend Anti-Drift Rule

- `docs/operations/frontend-workbench-antipattern-ban.md`
- `docs/operations/ant-design-family-platform-baseline.md`
- `docs/operations/pmaios-ant-design-family-frontend-design.md`
- `docs/operations/ant-design-pro-isolated-adapter-layer.md`
- `docs/operations/sdd-superpowers-testing-protocol.md`
- `docs/operations/pmchat-ant-design-x-capability-matrix.md`
- `docs/operations/pmos-ai-native-workspace-design-language.md`

Use for:

- the explicit ban on `hero + summary-card + explanation-first`
- the default workbench structure rule
- review and Hermes writeback escalation for recurring frontend drift
- the active Ant Design family frontend baseline
- the isolated adapter rule for `Ant Design Pro`
- the active strict-testing protocol for `SDD + Superpowers`
- the governed PMChat component / RICH / streaming / XMarkdown / provider / A2UI acceptance matrix
- the active AI-native workspace design-language baseline for PMOS home shell and derivative chat workspaces

### 11. v0.7 Runtime Baseline Closeout

- `docs/operations/v0.7-final-core-closure-plan-2026-05-09.md`
- `docs/operations/document-lifecycle-governance.md`

Use for:

- the final six-core-item closure scope of `v0.7`
- document lifecycle governance and anti-fragment rules
- the root-cause-level remediation plan for frontend delivery and multi-agent enforcement

### 12. v1.0 Product Version Program

- `docs/operations/v1.0-product-version-program.md`
- `docs/operations/v1.0-acceptance-standard.md`
- `docs/operations/v1.0-gap-list.md`
- `docs/operations/v1.0-product-repo-and-cloud-sync-plan.md`
- `docs/operations/v1.0-product-repo-packaging-checklist.md`
- `docs/operations/v1.0-product-repo-inventory-and-codex-migration.md`
- `docs/operations/v1.0-config-scripts-prompts-inventory.md`
- `docs/operations/v1.0-product-repo-migration-file-list.md`
- `docs/operations/v1.0-product-repo-skeleton.md`
- `docs/operations/v1.0-product-repo-readme-outline.md`
- `docs/operations/v1.0-github-repo-cutover-sequence.md`
- `docs/operations/v1.0-product-repo-release-steps.md`
- `docs/deployment/first-run.md`

Use for:

- the active product-version scope after `v0.7` runtime baseline
- the complete `v1.0` acceptance denominator
- the current remaining `v1.0` gap denominator
- deployment, productization, and GitHub sharing goals
- product-repo boundary, cloud sync layering, and codex-spec migration boundary
- first-release keep/drop checklist for the standalone PMOS product repo
- actual repo-level keep/drop inventory and codex-spec migration classification
- config/scripts/prompts file-level keep/drop rules and public sample artifacts
- executable migration file list for extracting the standalone PMOS product repo
- first-release repo skeleton for assembling the standalone PMOS product repo
- README rewrite structure and first-run guidance for external operators
- old GitHub repo cutover order and standalone product-repo release steps

### 13. Document Governance Registry

- `docs/memory/document-governance/truth-sources.json`
- `docs/memory/document-governance/latest-audit.json`
- backend routes:
  - `GET /api/document-governance/truth-sources`
  - `POST /api/document-governance/truth-sources`
  - `GET /api/document-governance/audit`
  - `POST /api/document-governance/audit`
- CLI:
  - `npm run cli -- documentation truth-source-list`
  - `npm run cli -- documentation truth-source-upsert <topicKey> <path> [status] [title]`
  - `npm run cli -- documentation truth-source-audit`

Use for:

- the current registered active truth-source set
- document lifecycle conflict audit
- successor / superseded discipline

### 14. Engineering Governance Outputs

- `docs/operations/pmos-fullstack-and-testing-agent-baseline.md`
- `docs/templates/architecture_decision_record_template.md`
- `docs/templates/code_review_brief_template.md`
- `docs/templates/historical_code_review_brief_template.md`
- `docs/templates/workflow_handoff_template.md`

Use for:

- the active engineering-lane baseline after product and design governance
- the required default output shape for architecture decisions before implementation starts
- the required default output shape for incremental code review before testing acceptance
- the required default output shape for historical hotspot / legacy-risk review without confusing it with current diff review
- the explicit dependency chain from architecture output and review artifact into implementation handoff

### 15. HTML-First Document Output Policy

- `docs/operations/html-first-document-output-policy.md`

Use for:

- deciding when a PMAIOS artifact should default to an HTML human-reading / runtime surface
- preserving the AI-reading / human-reading split while upgrading the human-facing layer
- preventing HTML-first from becoming arbitrary agent-generated production HTML
- defining the boundary between Markdown, SVG, schema / DSL, and rendered HTML

## Reference-Only Or Snapshot Docs

These documents may still be useful, but they are not the primary source for current platform version identity:

- `docs/operations/release-summary.md`
  - release snapshot for a specific local-runtime delivery cycle
- `docs/operations/pmaios-v0.5-checklist.md`
  - historical closeout artifact
- `docs/operations/v0.5-implementation-index.md`
  - historical implementation index
- `docs/operations/historical-artifact-immutability-policy.md`
  - defines which Claude-era and generated artifacts remain immutable historical evidence instead of active truth

## Startup Read Order For Platform Work

When the target is PMAIOS platform work rather than a subproject:

1. `docs/memory/mcp-context/session-state.json`
2. `npm run cli -- mcp-context events 20`
3. `npm run cli -- mcp-context tasks --status in_progress`
4. `docs/operations/startup-whoami.md`
5. this file
6. `docs/operations/current-version-progress.md`
7. `docs/operations/pmaios-v1.0-direction.md`
8. `docs/operations/v1.0-product-version-program.md`
9. `docs/operations/module-roadmap.md`
10. `docs/operations/v0.7-p0-execution-definition-stage-agent-ui-spec-repeat-correction.md`

## Update Rule

Any future platform version transition must update all of the following in the same work cycle:

1. `README.md`
2. `docs/operations/current-version-progress.md`
3. `docs/operations/pmaios-version-plan.md`
4. `docs/operations/module-roadmap.md`
5. this file
