# Current Version Progress

## Snapshot

- Date: 2026-04-22
- Timezone: Asia/Shanghai
- Current product version: `v0.4`
- Version cycle: 2026-04-18 22:00 +0800 -> current
- Status: release candidate with carry-over legacy items allowed
- Version owner: AI-assigned based on actual development and verification evidence

## Current Focus

尽可能把 `v0.4` 的项目 PM 产品输出闭环收口，然后不要再被顽固的外部阻塞项拖住，把它们显式带入下一版本。

优先顺序：

1. 先保证当前项目 PM 产物已经能直接服务日常项目工作。
2. 再收 Product Agent / product skill / design skill / documentation-output workflow。
3. Product Chief 作为评审、治理和升级层。
4. 工程加固只在它阻塞前面几条链路时才优先。
5. 对明显外部、凭证阻塞、或更适合下一版本的项，不继续拖住 `v0.4`。

## Long-Goal Denominator

### v0.4

- total tracked items: `11`
- solved: `9`
- partial: `2`
- parked/carry-over with reason: `3`
- still missing placement: `0`

Current counted set:

1. current-version truth convergence
2. do-mode runtime visibility
3. workspace shared-context visibility
4. minimal human-reading surface
5. current-version progress upgraded to the new protocol
6. subproject workflow rollout
7. Notion database target decision
8. Figma token/team decision
9. DingTalk auto extraction decision
10. browser UI smoke
11. carry-over governance alignment

### v0.5

- total tracked items: `20`
- solved: `7`
- partial: `4`
- parked/rejected with reason: `0`
- still missing placement: `0`

Current counted set:

1. checklist / backlog / implementation index convergence
2. requirement-loss prevention mechanism
3. dual-layer user/product requirement rule
4. denominator-style progress protocol
5. user-scenario backcheck closure rule
6. async progress template
7. user-requirement backcheck template
8. mode architecture
9. intent amplifier / delivery ladder / cognition mirror
10. daily conversation digestion
11. human-reading access surface
12. project standard entry contract
13. human-facing / AI-facing strong links
14. knowledge graph integration
15. AI product-development collaboration loop runtime
16. aicoding -> AI testing -> regression chain
17. Hermes reusable-skill leverage
18. Word / Excel / DOCX compatibility loop
19. Obsidian-style knowledge navigation
20. Web UI productization

## User Requirements Back-Check

- original user requirement: 不要总漏需求、漏计划 -> `partial`
- original user requirement: 不要只报完成了什么，要按长目标分母报进度 -> `partial`

## User-Facing Closure

- product-side change made:
  - requirement-loss prevention mechanism
  - dual-layer requirement rule
  - denominator-style progress protocol
  - user-scenario backcheck protocol
  - reusable async-status and backcheck templates
  - v0.4 carry-over governance doc
  - Workspace denominator-progress and user-backcheck panel
  - execution checklist summary now reads from `docs/operations/v0.4-v0.5-execution-checklist.md`
  - minimal daily conversation digestion automation
- mapping back to user-demand scenario:
  - “漏需求 / 漏计划”现在已有显式防漏、晋升与回查机制
  - “不要只报完成项，要看长目标分母”现在已有清单真源、Workspace 摘要和回查面
- whether the user-demand scenario is actually closed:
  - not yet, because the default daily reporting path is still being switched over and not every runtime surface uses the new protocol yet

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
- Installed external Codex skills `follow-builders` and `fireworks-tech-graph`, and registered them as platform-visible candidate skills.
- Requirement source attribution from non-chat sources:
  - `document-normalization` for normalization work items
  - `document` for extracted source requirements
  - `product-output` for Product Chief generated-output review requirements
  - `sourceRef` for entity/path/label context
- Evaluation history drill-down API and frontend view by requirement, version entry, capability, and version.
- Production API smoke on port `4178` for health, workflow, Product Chief reports, documentation normalization runs, retrieval governance, and evaluation history.
- Platform-level product workflow total design documented.
- Subproject product-workflow adoption checklist documented.
- Restart-safe startup `whoami` bootstrap documented and wired into `AGENTS.md`.
- Repo-level default-language rule added so startup/tool-switch recovery defaults to Chinese instead of drifting back to English.
- Platform SVG reading surface strengthened with `boards/index.svg`, company-facing overview boards, and updated `v0.5` planning board; this already improves current v0.4 daily reading and communication even though the broader human-reading surface remains future-version scope.
- `v0.5` implementation entrance has been consolidated through `docs/operations/v0.5-implementation-index.md`, covering mode architecture, cognition ladder, AI product-development loop, and governed templates.
- Backend now exposes a minimal unified human-reading surface:
  - `/pmaios/boards/*`
  - `/pmaios/docs/*`
  - `/pmaios/subprojects/*`
  - `/api/human-reading/manifest`
  This is a real functional step toward the fixed `IP + port + path` reading surface, not only a documentation convention.
- `mcp-context` now carries runtime collaboration mode state instead of leaving `{do}` only in documents:
  - CLI read: `npm run cli -- mcp-context mode`
  - CLI switch: `npm run cli -- mcp-context mode-set <default|plan|deep|do>`
  - API read: `/api/mcp-context/mode`
  - API history: `/api/mcp-context/mode-history`
- Workspace UI now surfaces the shared collaboration mode state and recent mode history, so `{do}`/`plan`/`deep` are visible in the daily operating console instead of only in backend state.
- Workspace UI now auto-refreshes collaboration mode, in-progress shared tasks, and recent checkpoints, so long-running work no longer depends on one-shot page load for state visibility.
- Workspace UI now exposes recent shared `mcp-context` events, so shared execution traces are visible in the daily console.
- Workspace UI now supports direct mode switching for `default / plan / deep / do`, instead of requiring CLI-only mode changes.
- Workspace UI now surfaces `v0.4 / v0.5` denominator progress and original user-requirement backcheck results, so the daily operating console can start reflecting long-goal closure state instead of only recent execution traces.
- Daily conversation digestion and methodology distillation has entered formal `v0.5` scope as a governed capability draft, covering both real-time identification and nightly consolidation.
- A minimal daily digestion automation path now exists through `npm run cli -- mcp-context digest-day YYYY-MM-DD --tool codex`, and today's first generated artifact is `docs/operations/daily-digests/2026-04-21.md`.
- The root path `/` now serves a stable direct-entry homepage, while the SPA workspace is mounted at `/workspace`, so local access no longer defaults to a white-screen landing page.
- The direct-entry homepage at `/` now directly surfaces version denominator progress and user-requirement backcheck summaries, so the root reading surface itself starts from long-goal closure instead of only acting as a link hub.
- The direct-entry homepage at `/` now also surfaces recent daily digests and project-linked evidence sources, while the human-reading manifest exposes the digest route, so the root reading surface covers version state, user backchecks, project entries, evidence links, and methodology digests together.
- `mcp-context` now normalizes `currentTaskId` against the latest in-progress task instead of reverting to stale older tasks during repair.
- The human-reading manifest now includes the direct-entry homepage, workspace entry, execution checklist, and user-requirement backcheck sample, so key reading assets are discoverable from one runtime index.
- Runtime project entries now expose not only human-facing boards and change logs, but also linked README / governance / memory / workflow / PRD / architecture sources, so human-facing entry assets can immediately drill back into the underlying AI-facing and governance evidence layer.
- Runtime project entry views now also expose missing standard assets per subproject, so `knowledge-base / ad / chokonu / server` rollout gaps are visible from the reading surface instead of hidden in manual audits.
- Runtime workspace and direct-entry reading surfaces now also show aggregate project-entry coverage, so rollout completion is visible as a denominator instead of only per-project missing-file lists.
- Latest repository sync has been pushed to GitHub `main` at commit `c66a358`, so the current v0.4/v0.5 reading-surface and version-governance state is no longer only local.
- `docs/operations/project-entry-rollout-status.md` now records the real rollout denominator:
  - `project-board.svg`: `3 / 5`
  - `roadmap-board.svg`: `0 / 5`
  - `decision-board.svg`: `0 / 5`
  - `change-log.md`: `0 / 5`

## v0.4 Task Checklist

Legend:

- `DONE`: completed and verified or already covered by accepted evidence.
- `IN PROGRESS`: active current-version work.
- `TODO`: not implemented or intentionally deferred.

### Product Office Runtime

- DONE - Project PM output queue exposed as the primary daily-use surface.
- DONE - Platform-level product workflow total design.
- DONE - Subproject workflow adoption checklist.
- DONE - Startup `whoami` bootstrap for restart recovery.
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
- IN PROGRESS - Notion database sync target configuration; provided Notion URL is a page, not a database.
- IN PROGRESS - Figma team id configuration; provided team URL is stored, but current local Figma token returns `403 Invalid token`.
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
- DONE - `follow-builders` skill installed and registered as a candidate research skill.
- DONE - `fireworks-tech-graph` skill installed and registered as a candidate diagram skill.
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
- Roll platform product workflow from `knowledge-base` sample into other active subprojects starting with `ad` and `chokonu`.
- `v0.4` close-out cleanup is active: complete fast-close items now, and explicitly carry blocked items into `v0.5` instead of waiting.
- Today-delivered planning/communication assets should be split clearly:
  - keep current-version operational value in `v0.4`
  - carry longer-horizon human-reading surface and collaboration-system ambitions into `v0.5`
- Experimental fast-route execution is now documented through `docs/architecture/mode-architecture.md` and `docs/operations/do-mode-execution-protocol.md`; it is a candidate collaboration contract for next-version hardening, not a redefinition of default `v0.4` behavior.
- `docs/operations/v0.4-v0.5-transition-2026-04-21.md` is the formal transition snapshot for today鈥檚 close-out and next-version handoff.

## Open Items

| Priority | Item | Status | Notes |
| --- | --- | --- | --- |
| `P1` | Rich requirement source attribution | Completed | Implemented for document normalization, extracted documents, and Product Chief product outputs; schema supports broader source kinds. |
| `P1` | Evaluation history drill-down | Completed | API and frontend expose requirement/version-entry/capability/version linked evaluation history. |
| `P2` | Standard production smoke | Completed for API smoke | Port `4178` smoke verified core v0.4 endpoints; browser UI smoke remains optional/manual. |
| `P2` | CI artifact download verification | Completed for artifact publication | GitHub Actions run `24621458060` succeeded; artifact `pmaios-dist` id `6515788105`, digest `sha256:ccc33b3e4ce274f52afc855a60d4eb21dae318fafaac3ba96e3cf728d3e19938`. Direct anonymous REST download returns `401`, so local download requires an authenticated GitHub browser/API session. |
| `P2` | GitHub push / CI artifact verification | Completed | Remote `origin` is `https://github.com/RhyTsui/pmaios.git`; local `main` was merged with the remote initial commit and pushed without force-push; latest pushed verification commit is `ba35577ccbc533d0aa8555ce81a9c887762d1fb9`. |
| `P2` | External/internal data connectors | In progress | Notion token connects but provided URL is a page, not a database; Figma team id is configured but token remote check returns `403`; web fetch and DingTalk manual import are implemented; internal system connectors are skipped for now. |
| `P1` | Platform workflow rollout across subprojects | In progress | `knowledge-base` is the current sample; `ad`, `chokonu`, and `server` are only partially aligned; `data-service` is not yet adopted. |
| `P1` | v0.4 close-out snapshot freshness | In progress | Current-version progress should stay aligned with the actual 2026-04-21 repository state instead of freezing at older snapshots. |
| `P1` | v0.5 unification planning | In progress | `v0.6` has been merged into `v0.5`; next-version scope now includes collaboration, Hermes strengthening, extend-thinking insertion, office-format loops, multimodal/design hardening, intelligence ingestion, and Web UI productization. |

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
  - run: `24621458060`
  - commit: `ba35577ccbc533d0aa8555ce81a9c887762d1fb9`
  - result: success
  - `verify` job: success
  - `build` job: success
  - artifact: `pmaios-dist`
  - artifact id: `6515788105`
  - artifact size: `189587` bytes
  - artifact digest: `sha256:ccc33b3e4ce274f52afc855a60d4eb21dae318fafaac3ba96e3cf728d3e19938`
  - artifact expires: `2026-07-18T05:02:35Z`
  - direct anonymous REST download check returned `401`, so artifact download requires an authenticated GitHub session.

## New Requirement Changes Since Last Snapshot

- 2026-04-19 update: CLI provider fallback, shared Codex/Claude context handoff, skill auto-find, Claude Design visibility, Product Chief recommended skills, manager-agent bootstrap, and deterministic multi-agent review are now connected to runnable CLI/API paths.
- Latest local verification:
  - `npm.cmd run lint` passed.
  - `npm.cmd run test -- productChiefService workflowEngine cli providerRegistry llmRouter mcpContextSync` passed: 6 files, 34 tests.
  - `npm.cmd run cli -- provider routing text` shows runtime order `claude -> gemini -> minimax -> qwen-company -> qwen-self-paid`; GPT browser login is excluded from runtime routing.
  - `npm.cmd run cli -- skill find "schema UI workflow Claude Design manager agent" operations-surface ui-schema-spec` returns `schema-driven-ui-design`, `product-chief-manager-agent`, and `claude-design-system`.
  - `npm.cmd run cli -- skill list` reports 19 enabled/auto-triggerable skills, 18 integrated and 1 installed external design-system tool.
  - `npm.cmd run cli -- product-chief analyze "Build schema UI workflow with Claude Design manager agent"` passed in a temporary `AI_OS_ROOT`; the report engaged 8 specialists and recommended schema UI, manager-agent, and Claude Design skills.
  - `npm.cmd run build` passed.
  - Production server started on `http://localhost:4312`; `/api/health`, `/api/skills`, and `/api/skills/find` smoke checks passed.
- Version numbering must be assigned by actual accepted development state, not planning labels.
- Historical version labels must be consolidated for traceability.
- Current active work should be treated as `v0.4`.
- New requests must go through requirement change control and update the plan before implementation.
- A daily current-version progress snapshot must be available for quick reporting.
- Current project PM outputs that can be used directly every day have priority over Product Chief abstractions.
- Product Agent, product skill, design skill, and documentation output are the `v0.4` mainline.
- Product Chief is the review/governance layer.
- Deterministic multi-agent review for generated PM outputs is core `v0.4`; realtime/model-backed agents are future work.
- New top-level direction:
  - finish `v0.4` aggressively but do not wait on blocked items
  - merge former `v0.5` and `v0.6` into one stronger `v0.5`
  - `v0.5` must cover collaboration model, Hermes strengthening, reusable skill evolution, extend-thinking research, global-rule persistence, Word/Excel loops, multimodal/design hardening, intelligence-source ingestion, harness-engineering research, and Web UI productization
- 2026-04-21 iteration additions:
  - formal `v0.4 -> v0.5` transition snapshot created
  - formal `v0.4 -> v0.5` transition board created and linked into `boards/index.svg`
  - 2026-04-21 iteration asset index created for same-day reading and handoff
  - `v0.5` implementation entrance consolidated further with mode architecture, `{do}` task-start contract, and human-machine collaboration research
  - detailed Chinese mode-architecture SVG created and linked into the board directory
  - `pmaios-version-plan` and `v0.5-research-and-execution-backlog` rewritten into stable Chinese version truth
  - backend human-reading routes added for `boards`, `docs`, `subprojects`, and manifest output
  - runtime collaboration mode state added to `mcp-context`, with CLI and backend endpoints for current mode and mode history
  - frontend workspace sidebar now exposes current collaboration mode and recent mode switches from shared `mcp-context`
  - frontend workspace sidebar now auto-refreshes shared mode/task/checkpoint state during long-running execution
  - `{do}` false-stop pattern refined from symptom-level rule into root-cause rule:
    - direct-question completion bias
    - final-tone drift
    - lost mode continuity when the main target did not change

## Next Execution Order

1. Finish remaining `v0.4` items that are locally actionable without waiting on external blockers.
2. Reclassify blocked connector/credential/system items as carried legacy items.
3. Use `docs/operations/v0.5-research-and-execution-backlog.md` to drive the next-version preparation.
4. Keep this snapshot updated daily.

## Daily Report Template

Use this format when asked for current progress:

```text
PMAIOS current version: v0.4
Cycle: 2026-04-18 22:00 +0800 -> current
Status: in progress / release candidate

Long-goal denominator:
- total tracked items: ...
- solved: ...
- promoted into plan/backlog: ...
- parked/rejected with reason: ...
- still missing placement: ...

User requirements back-check:
- original user requirement A -> solved / partial / unsolved
- original user requirement B -> solved / partial / unsolved

User-facing closure:
- what product-side change was made
- how it maps back to the user-demand scenario
- whether the user-demand scenario is now actually closed

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
