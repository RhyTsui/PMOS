# Current Version Progress

## Snapshot

- Date: 2026-04-19
- Timezone: Asia/Shanghai
- Current product version: `v0.4`
- Version cycle: 2026-04-18 22:00 +0800 -> current
- Status: release candidate with external P2 follow-ups
- Version owner: AI-assigned based on actual development and verification evidence

## Current Focus

Close the `v0.4` project-PM product-output loop before opening connector-heavy work.

Priority order:

1. Current project PM outputs that can be used directly in daily project work.
2. Product Agent / product skill / design skill / documentation-output workflow.
3. Product Chief as review, governance, and escalation layer.
4. Engineering hardening only when it blocks the above demo and daily output path.

## Completed In v0.4

- Product Chief runtime analysis and governed output generation.
- Missing physical-world questions, learning guidance, and specialist engagement.
- Specialist Product Chief tasks with task records and artifacts.
- Deterministic multi-agent review loop for generated project PM outputs.
- Product skill surface for product/design/documentation-output mainline capabilities.
- External connectors surface for Notion, Figma, web fetch, and DingTalk meeting-note import.
- Roadmap, version plan, daily intelligence, weekly brief, demo script, user manual, learning memo, strategic radar, ecosystem scan, UI schema, and external capability evaluation outputs.
- Documentation normalization runtime, API, CLI, artifacts, and trace records.
- Requirement Desk and Version Desk operational loops.
- Capability registry lifecycle and evidence-based publish gate.
- Workflow Ops manual control and review/rework loop.
- Portfolio, Product Agents, Observability, DAG Impact, Retrieval Governance, Hermes Policy, and Capability Ops surfaces.
- DAG dirty-node rerun linked to workflow runtime.
- Retrieval governance linked to NotebookLLM.
- Docker Compose Chroma service and remote heartbeat verification.
- Chroma local fallback when remote embedding is unavailable.
- Claude design tooling status recorded.
- Requirement source attribution from non-chat sources:
  - `document-normalization` for normalization work items
  - `document` for extracted source requirements
  - `product-output` for Product Chief generated-output review requirements
  - `sourceRef` for entity/path/label context
- Evaluation history drill-down API and frontend view by requirement, version entry, capability, and version.
- Production API smoke on port `4178` for health, workflow, Product Chief reports, documentation normalization runs, retrieval governance, and evaluation history.

## v0.4 Task Checklist

Legend:

- `DONE`: completed and verified or already covered by accepted evidence.
- `IN PROGRESS`: active current-version work.
- `TODO`: not implemented or intentionally deferred.

### Product Office Runtime

- DONE - Project PM output queue exposed as the primary daily-use surface.
- DONE - Product Chief runtime analysis.
- DONE - Missing physical-world question generation.
- DONE - Learning and cognitive guidance generation.
- DONE - Product Agent manager/specialist hierarchy bootstrap.
- DONE - Product Agents frontend surface.
- DONE - Product skill registry API and frontend surface.
- DONE - Design skill visibility through design-system tooling and skill grouping.
- DONE - Documentation-output skill visibility.
- DONE - External connectors status API and frontend surface.
- DONE - Web page fetch to governed inbox source.
- DONE - DingTalk meeting-note manual import to inbox plus documentation normalization.
- DONE - Figma file inspection endpoint.
- IN PROGRESS - Notion database sync target configuration.
- TODO - <span style="color: gray">Automatic DingTalk desktop extraction; blocked until stable local source path or official export/API is available.</span>
- DONE - Governed project PM output generation.
- DONE - Specialist Product Agent task records.
- DONE - Specialist Product Agent task artifacts.
- DONE - Deterministic multi-agent review loop for generated project PM outputs.
- DONE - Product outputs linked to requirement records.
- DONE - Product outputs linked to version entries.
- DONE - Product output trace backfills artifact paths.
- DONE - Roadmap output generation.
- DONE - Version planning output generation.
- DONE - Daily intelligence report generation.
- DONE - Weekly product brief generation.
- DONE - Demo script generation.
- DONE - User manual generation.
- DONE - Learning upgrade memo generation.
- DONE - Strategic radar generation.
- DONE - Ecosystem/open-source scan generation.
- DONE - UI schema/business-block spec generation.
- DONE - External capability evaluation output generation.
- TODO - <span style="color: gray">Model-backed realtime specialist execution; v0.5+ unless needed for demo.</span>

### Requirement And Version Traceability

- DONE - Requirement creation.
- DONE - Requirement update.
- DONE - Requirement batch update.
- DONE - Chat-to-requirement ingestion.
- DONE - Requirement status management.
- DONE - Requirement priority management.
- DONE - Requirement trace links.
- DONE - Version release notes.
- DONE - Version diff summary.
- DONE - Version rollback linkage.
- DONE - Version approval metadata.
- DONE - Product-output version entity type.
- DONE - Document-normalization version entity type.
- DONE - Non-chat source attribution for document normalization.
- DONE - Non-chat source attribution for extracted document requirements.
- DONE - Non-chat source attribution for Product Chief output requirements.
- DONE - `sourceRef` entity/path/label context.

### Workflow, Review, And Capability Governance

- DONE - Workflow advance operation.
- DONE - Workflow run-until-blocked operation.
- DONE - Workflow resume operation.
- DONE - Manual approve gate.
- DONE - Manual rework gate.
- DONE - Review gate blocks missing open-source/build-vs-buy evidence.
- DONE - Capability registration.
- DONE - Capability evaluation dataset creation.
- DONE - Capability evaluation run execution.
- DONE - Capability publish.
- DONE - Capability invoke.
- DONE - Capability rollback.
- DONE - Capability publish derives approval from real evaluation evidence.
- DONE - Capability publish derives approval from linked workflow review evidence.
- DONE - Frontend publish booleans ignored for publish gating.
- DONE - Evaluation history API.
- DONE - Evaluation history filter by capability.
- DONE - Evaluation history filter by version.
- DONE - Evaluation history filter by requirement.
- DONE - Evaluation history filter by version entry.
- DONE - Evaluation history frontend drill-down.

### Console Surfaces

- DONE - Workflow Ops panel.
- DONE - Requirement + Version Desk.
- DONE - Capability Ops panel.
- DONE - Product Agents panel.
- DONE - Product Skills panel.
- DONE - External Connectors panel.
- DONE - Project PM Outputs panel backed by Product Chief governance.
- DONE - Multi-agent review status visible on generated project outputs.
- DONE - Portfolio panel.
- DONE - Observability filters.
- DONE - DAG Impact panel.
- DONE - Retrieval Governance panel.
- DONE - Hermes Policy panel.
- TODO - <span style="color: gray">Optional browser UI smoke across all panels.</span>

### Documentation Normalization

- DONE - DocumentationNormalizationService runtime.
- DONE - Documentation normalization run listing API.
- DONE - Documentation normalization run creation API.
- DONE - Documentation normalization CLI.
- DONE - Inbox scanning.
- DONE - Explicit source path normalization.
- DONE - Normalization artifacts.
- DONE - Normalization run records.
- DONE - Generated requirement records.
- DONE - Generated version entries.
- DONE - Requirement extraction from source-like lines.
- DONE - Real normalization run executed.

### DAG, Retrieval, Hermes, And Chroma

- DONE - DAG graph derivation from workflow definitions.
- DONE - DAG change events.
- DONE - DAG dirty node state.
- DONE - DAG run records.
- DONE - DAG dirty-node rerun connected to workflow runtime.
- DONE - Retrieval governance settings.
- DONE - Retrieval local-only mode.
- DONE - Retrieval prefer-remote mode.
- DONE - Retrieval remote-required mode.
- DONE - Retrieval indexing controls.
- DONE - Retrieval quality gate.
- DONE - Retrieval governed search API.
- DONE - NotebookLLM retrieval governance integration.
- DONE - Hermes policy TypeScript mainline service.
- DONE - Hermes enhance-only guardrails.
- DONE - Hermes policy report listing.
- DONE - Docker Compose Chroma service.
- DONE - Remote Chroma heartbeat verification.
- DONE - Chroma fallback to in-memory collection when remote embedding is unavailable.

### Tooling, Environment, And Verification

- DONE - Claude Code installation status recorded.
- DONE - `claude-design` package availability checked.
- DONE - `claude-design-system@1.0.7` installed.
- DONE - `design-system.cmd` verified.
- DONE - Version governance reset.
- DONE - Canonical PMAIOS version plan created.
- DONE - Daily progress snapshot created.
- DONE - Requirement change-control process created.
- DONE - Focused tests for changed v0.4 P1 scope.
- DONE - Full test suite.
- DONE - Production build.
- DONE - Production API smoke.
- DONE - GitHub remote configured for `https://github.com/RhyTsui/pmaios`.
- DONE - Local `main` pushed to GitHub without force-push.
- DONE - GitHub Actions CI rerun after cross-platform test-fixture fix.
- DONE - CI build artifact publication verified.
- TODO - <span style="color: gray">Broader external knowledge/internal system connectors.</span>
- TODO - <span style="color: gray">Real model-backed specialist execution.</span>
- TODO - <span style="color: gray">Living physical-world profile automation.</span>
- TODO - <span style="color: gray">UI schema to implementation-task loop.</span>

## In Progress

- Daily progress reporting process is active; continue updating this file after material changes.

## Open Items

| Priority | Item | Status | Notes |
| --- | --- | --- | --- |
| `P1` | Rich requirement source attribution | Completed | Implemented for document normalization, extracted documents, and Product Chief product outputs; schema supports broader source kinds. |
| `P1` | Evaluation history drill-down | Completed | API and frontend expose requirement/version-entry/capability/version linked evaluation history. |
| `P2` | Standard production smoke | Completed for API smoke | Port `4178` smoke verified core v0.4 endpoints; browser UI smoke remains optional/manual. |
| `P2` | CI artifact download verification | Completed for artifact publication | GitHub Actions run `24620263772` succeeded; artifact `pmaios-dist` id `6515418927`, digest `sha256:71efa237f588ed4e17f99555550009f914b6cc5acfdf7feca76edcafd797b44c`. Direct anonymous REST download returns `401`, so local download requires an authenticated GitHub browser/API session. |
| `P2` | GitHub push / CI artifact verification | Completed | Remote `origin` is `https://github.com/RhyTsui/pmaios.git`; local `main` was merged with the remote initial commit and pushed without force-push; latest pushed commit is `9e5cc4badebb6060f41b827f3ac36f7269ba3458`. |
| `P2` | External/internal data connectors | In progress | Notion/Figma credentials are local; web fetch and DingTalk manual import are implemented; Notion DB IDs and Figma file key are still needed. |

## Verification Evidence

Latest verified before the current version-governance cleanup:

- `npm run lint`
- `npm run test`
- `npm run build`
- `npm run cli -- documentation normalize`
- Product Chief focused tests
- Capability Registry focused tests
- Documentation Normalization focused tests
- NotebookLLM focused tests
- Chroma remote heartbeat
- Production API smoke on port `4177`

Latest verification after v0.4 P1 closure:

- `19` test files passed
- `70` tests passed
- `npm run lint` passed
- `npm run test -- capabilityRegistry documentationNormalizationService productChiefService` passed
- `npm run test` passed
- `npm run build` passed
- Production API smoke on port `4178` passed:
  - healthOk: `true`
  - workflowStatus: `completed`
  - productChiefReports: `0`
  - documentNormalizationRuns: `1`
  - retrievalMode: `prefer-remote`
  - evaluationHistoryRuns: `0`

Latest verification after project-PM output priority correction and multi-agent review loop:

- `npm run lint` passed
- `npm run test -- productChiefService` passed
- `npm run test -- capabilityRegistry documentationNormalizationService productChiefService` passed:
  - `3` test files passed
  - `9` tests passed
- `npm run test` passed:
  - `19` test files passed
  - `70` tests passed
- `npm run build` passed
- Production API smoke on port `4180` passed:
  - healthOk: `true`
  - productChiefReports: `0`
  - productChiefOutputs: `0`
  - multiAgentReviews: `0`

Latest verification after Product Skills surface:

- `npm run lint` passed
- `npm run build` passed
- `npm run test` passed:
  - `19` test files passed
  - `70` tests passed
- Production API smoke on port `4181` passed:
  - healthOk: `true`
  - skillTotal: `16`
  - productSkills: `12`
  - designSkills: `2`
  - documentationSkills: `3`
  - multiAgentReviews: `0`

Latest verification after External Connectors surface:

- `npm run lint` passed
- `npm run test -- externalConnectorService documentationNormalizationService` passed:
  - `2` test files passed
  - `3` tests passed
- `npm run test` passed:
  - `20` test files passed
  - `72` tests passed
- `npm run build` passed
- Production API smoke on port `4182` passed:
  - healthOk: `true`
  - notionConfigured: `true`
  - figmaConfigured: `true`
  - webFetchConfigured: `true`
  - dingtalkConfigured: `true`
  - skillTotal: `16`

Latest verification after GitHub push and CI portability fix:

- Remote `origin`: `https://github.com/RhyTsui/pmaios.git`
- Pushed merge commit: `4a24a939e34d1966bdc01daf0a3476cb4a7fdbc6`
- First GitHub Actions run: `24619899349`
  - result: failed
  - failing step: `npm run test`
  - cause: test fixtures read `E:/AI/ai-os/skills/registry.json` and `E:/AI/ai-os/config/product-management/agent-blueprints.json`, which do not exist on Linux runners.
- Local fix completed:
  - replaced hardcoded fixture reads with `path.resolve(process.cwd())`
  - updated package version to `0.4.0`
- Local verification after fix:
  - `npm run lint` passed
  - `npm run test` passed:
    - `20` test files passed
    - `72` tests passed
  - `npm run build` passed
- GitHub Actions rerun:
  - run: `24620263772`
  - commit: `9e5cc4badebb6060f41b827f3ac36f7269ba3458`
  - result: success
  - `verify` job: success
  - `build` job: success
  - artifact: `pmaios-dist`
  - artifact id: `6515418927`
  - artifact size: `189587` bytes
  - artifact digest: `sha256:71efa237f588ed4e17f99555550009f914b6cc5acfdf7feca76edcafd797b44c`
  - artifact expires: `2026-07-18T03:43:28Z`
  - direct anonymous REST download check returned `401`, so artifact download requires an authenticated GitHub session.

## New Requirement Changes Since Last Snapshot

- Version numbering must be assigned by actual accepted development state, not planning labels.
- Historical version labels must be consolidated for traceability.
- Current active work should be treated as `v0.4`.
- New requests must go through requirement change control and update the plan before implementation.
- A daily current-version progress snapshot must be available for quick reporting.
- Current project PM outputs that can be used directly every day have priority over Product Chief abstractions.
- Product Agent, product skill, design skill, and documentation output are the `v0.4` mainline.
- Product Chief is the review/governance layer.
- Deterministic multi-agent review for generated PM outputs is core `v0.4`; realtime/model-backed agents are future work.

## Next Execution Order

1. Use the Project PM Outputs panel to generate current-project product materials for the demo project.
2. Decide whether browser UI smoke is required before marking `v0.4` accepted.
3. Keep external/internal data connectors in future-version planning unless credentials and target systems are provided.
4. Keep this snapshot updated daily.

## Daily Report Template

Use this format when asked for current progress:

```text
PMAIOS current version: v0.4
Cycle: 2026-04-18 22:00 +0800 -> current
Status: in progress / release candidate

Completed:
- ...

In progress:
- ...

Open / blocked:
- ...

Verification:
- ...

Next:
1. ...
2. ...
```
