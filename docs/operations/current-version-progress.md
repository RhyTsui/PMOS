# Current Version Progress

## Snapshot

- Date: 2026-05-09
- Timezone: Asia/Shanghai
- Current product version: `v1.0`
- Current runtime baseline: `v0.7`
- Current status: `v0.7` runtime baseline landed, `v1.0` product version in progress
- Previous product version narrative: `v0.7`
- Next focus: push the landed runtime baseline into a deployable, collaborative, product-grade PM Agent system

## Active Truth Role

This document is the platform-level current snapshot for PMAIOS.

It answers:

1. what product version the platform is actually pursuing now
2. what runtime baseline has already landed
3. what remains the highest-priority `v1.0` continuation work

It does not replace:

1. `docs/operations/pmaios-v1.0-direction.md` for version direction
2. `docs/operations/pmaios-version-plan.md` for timeline discipline
3. `docs/operations/v1.0-acceptance-standard.md` for final acceptance denominator

## Current Focus

The platform is no longer in `v0.7-only` narrative mode.

The current focus is:

1. keep `v0.7` as the single landed runtime baseline
2. treat `v1.0` as the active product version
3. push the platform from "governed runtime exists" to "a deployable product-manager Agent product exists"

## Long-Goal Denominator

### v1.0

- total tracked tracks: `10`
- solved: `0`
- partial: `10`
- unsolved: `0`

Tracked set:

1. Product-manager Agent identity and unified entry
2. Multi-role work intake and differentiated outputs
3. Requirement -> function -> API -> task deep decomposition
4. Specialist review committee + Hermes governance closure
5. Delivery-grade frontend page production
6. Document lifecycle governance
7. Dataki knowledge grounding and system-state context
8. Deployment / operation / release / GitHub sharing readiness
9. Cloud knowledge sync layer
10. PMOS vs codex spec boundary

## What Is Already Landed

The following are already landed and should be treated as `v1.0` baseline assets rather than open design assumptions:

1. `v0.7 runtime baseline`
   - SchedulerRun automation baseline
   - Gate Runtime traceability baseline
   - Hermes compare / promote / watch / writeback / closure baseline
   - proof-of-work acceptance-package baseline
2. `workflow mainline baseline`
   - `调研文档 -> 规划文档 -> 需求文档 -> 功能文档 -> 设计文档 -> 前端页面 -> 数据表 -> 后端接口 -> 联调与验收`
3. `review baseline`
   - Solution-Optimality Review
   - Development Review
   - Design Review
   - Research Review
   - Delivery Review
   - Hermes Governance
4. `frontend anti-drift baseline`
   - `hero + summary-card + explanation-first` ban
   - auditable workbench anti-pattern rule
   - visual default is now `AI Native Workspace`
   - PMOS global frontend baseline is now `x.ant.design / Ant Design X + X SDK + X Markdown + X Card`
   - normal functional pages no longer default to raw `Ant Design`; they start from the Ant Design X ecosystem baseline
   - Ant Design family governance is now documented as active truth, including `Ant Design Pro` isolated-adapter rules instead of root-force installation
   - `Ultramodern Playground` is the default page-template reference for AI workspace surfaces
   - PMOS home shell is now explicitly judged as a governed AI-native conversational workspace rather than an enterprise delivery chat page
   - strict frontend testing now has an explicit `SDD + Superpowers` protocol: spec refs, acceptance matrix, automated acceptance, and repeated real-browser regression are the expected delivery path
   - final-state / proof-of-work now include typed `frontend browser verification` checks against ui-schema coverage, interaction/state coverage, anti-pattern residue, and browser-evidence anchors
   - `frontend-page` workflow output now defaults to `docs/review/frontend-browser-verification-*.json`, and runtime `stageRunners/orchestrator` already auto-generate this artifact with regression coverage
   - real Playwright browser execution is now runnable through `npm run verify:frontend-browser -- --subproject ad --out docs/review/playwright-browser-verification-ad.json`, and a first live `ad` verification report + screenshot have been generated
   - Playwright verification is now also exposed as a task-level platform action: backend exposes `POST /api/task-ssot/tasks/:taskId/frontend-browser-verification/run`, and the unified entry final-state panel can trigger it directly
   - Playwright verification now writes back into workflow-run stage/task artifacts and `artifact_written` events, so browser evidence has entered the default task lifecycle
   - frontend browser verification is now also a final-page contract gate: it can block delivery when `linkedRequirementIds`, `route/layout shell/target roles/data refs`, or governed `Ant Design X ecosystem` component bindings are missing
5. `knowledge baseline`
   - Dataki connector available
   - default knowledge-base context supported
   - `docs/sources/inbox/` incremental normalization and background-digest generation available
   - Notion inbox-digest publication supports both `database` and `page` target mode
   - locally verified `inbox -> background digest -> Notion page` writeback; downstream Dataki sync can consume the published Notion layer
   - project/platform-tag background routing now lands under `docs/context/project/by-tag/`
   - Dataki downstream auto-refresh is not yet observed on `版本库`; current state remains partial
6. `subproject rollout sample`
   - `ad` has been aligned to the new delivery chain and aiocoding truth-source package
7. `document governance mechanism baseline`
   - truth-source registry now lands under `docs/memory/document-governance/truth-sources.json`
   - latest audit now lands under `docs/memory/document-governance/latest-audit.json`
   - CLI and API can now register truth sources and run lifecycle conflict audits
   - current seed covers the platform v1.0 core truth set; workflow-wide merge-back enforcement is still partial
8. `eight carryover capability debt closure slice`
   - `ContextInjectionBundle` schema/service/API landed for task-level context injection
   - `L0-L3` collaboration level is now runtime-derived inside `task-ssot`
   - `Pipeline Launcher` readiness plans landed for downstream stage-chain launch
   - `asset-backwrite-gate` is now hard for `ready_for_delivery / completed` tasks without `final-delivery` artifacts
   - `Outbox` now exposes `targetCategory/topicKey` plus runtime summary
   - `SchedulerRun` now exposes explicit `recoveryPolicy` plus runtime summary
   - evidence: `docs/operations/v1.0-runtime-capability-closure-2026-05-11.md`
9. `executor cutover baseline`
   - active frontend/design baseline no longer routes through legacy executor-specific design tooling
   - active PMOS runtime default no longer points at a legacy executor-specific provider alias
   - Anthropic capability is retained only as a generic provider compatibility layer
   - evidence: `docs/operations/claude-to-codex-cutover-and-removal.md`

## Highest-Priority Continuation

The next safe continuation is to build `v1.0` on top of the landed runtime baseline, not reopen kernel-definition work.

Priority order:

1. lock the `v1.0` product identity, user map, and acceptance standard
2. force requirement -> function -> API -> task decomposition across real project work
3. deepen specialist-agent enforcement and make review non-optional at workflow stages
   - `reviewCommittee` now emits `activationTrace` with `active / assumed / missing` specialist states instead of a single fake pass state
   - runtime review builders now try to resolve real activated specialist roles from both specialist evidence artifacts and prior workflow review-signal metadata before committee evaluation
   - `proof-of-work` now treats `specialist activation` as a formal required evidence item; implicit defaults downgrade to `warn`, explicit missing roles become `block`
   - workflow `review_recorded` / review-block events now write `activated / assumed / missing specialist roles` into event metadata
   - `task-ssot` now hydrates reviewer assignments such as `specialist-role:Research Review` from workflow review activation metadata
   - runtime `stage_started / stage_resumed / run_initialized` events now also publish assigned `taskAssignmentRoles` for review-required stages, so `task-ssot` can expose expected specialist reviewers before review is complete
   - review-required workflow tasks now also expose a direct `specialist-activation-gate` in `task-ssot`: missing roles block, implicit/defaulted roles also block, and only runtime-backed activation passes
   - `proof-of-work currentAttention` now directly prompts operators to replace implicit specialist activation defaults or backfill missing specialist evidence, instead of forcing manual review of the committee payload
   - `ReviewPanel` now surfaces specialist activation status instead of hiding role activation behind generic committee labels
4. finish frontend production quality at the system level, after Playwright/browser execution has already entered proof/task lifecycle
5. make document lifecycle governance strong enough to stop supplement-document drift
6. deepen Hermes into broader cross-project default governance and lower-operator unattended closure
7. make Dataki/system-state grounding default across more projects and more stages
8. make `inbox -> Notion -> Dataki -> agent retrieval` the default governed knowledge refresh loop
9. formalize a deployment-ready `PMOS product repo` boundary and stop mixing business subprojects into the public product package
10. establish a governed `GitHub + Notion` cloud sync layer with `latest-state` mirror objects for ChatGPT retrieval
11. migrate PMOS product-behavior specs out of codex-local private context and back into PMOS repo truth
12. finish deployable product packaging, docs, release discipline, and GitHub sharing path
13. turn the new eight-debt closure slice into defaults instead of optional APIs
   - inject `ContextInjectionBundle` into workflow / specialist / review packets by default
   - upgrade `Pipeline Launcher` from planner to trigger
   - expose `L0-L3`, outbox runtime, and scheduler runtime in operator-facing surfaces

## v1.0 Acceptance Boundary

The active `v1.0` acceptance boundary is explicitly defined by:

1. `docs/operations/pmaios-v1.0-direction.md`
2. `docs/operations/v1.0-product-version-program.md`
3. `docs/operations/v1.0-acceptance-standard.md`
4. `docs/operations/v1.0-gap-list.md`

These should now be treated as the real denominator instead of continuing to create intermediate version branches.

## User Requirements Back-Check

- original user requirement: 直接做 v1.0，以完整高质量验收标准推进
  - current state: `partial`
  - why: version truth and acceptance boundary are now explicit, but product-grade completion is not yet reached

- original user requirement: 做一个能干活、能部署的产品经理 Agent 产品
  - current state: `partial`
  - why: runtime baseline exists, but deployable product-grade packaging and multi-role quality closure are still incomplete

- original user requirement: 测试、UI、算法、前后端、运营都能用
  - current state: `partial`
  - why: role coverage is now part of the official denominator, but differentiated output and productized usage flows still need deeper closure

- original user requirement: 不要只停在平台机制，要能真实交付
  - current state: `partial`
  - why: delivery chain and review chain are landed, but large parts of the final product-grade acceptance remain open

## Active Truth Sources

Read these first when resuming platform work:

1. `docs/operations/platform-truth-source-index.md`
2. `docs/operations/current-version-progress.md`
3. `docs/operations/pmaios-v1.0-direction.md`
4. `docs/operations/v1.0-product-version-program.md`
5. `docs/operations/v1.0-acceptance-standard.md`
6. `docs/operations/v1.0-gap-list.md`
7. `docs/operations/v1.0-product-repo-and-cloud-sync-plan.md`
8. `docs/operations/pmaios-version-plan.md`
9. `docs/operations/v0.7-p0-execution-definition-stage-agent-ui-spec-repeat-correction.md`
10. `docs/operations/hermes-current-effectiveness-assessment-2026-05-07.md`

## Current Product Judgment

`PMAIOS` should now be judged as:

`a product-manager Agent platform pursuing v1.0 productization on top of a landed v0.7 governed runtime baseline.`

## Version Transition Delta

This cycle changed the platform narrative in a concrete way:

1. `v0.7` is no longer treated as the active outward product version
2. `v0.7` is now treated as the landed runtime baseline for `v1.0`
3. `v1.0` is now the active product-version narrative
4. `v0.8 / v0.9` are no longer used as standalone active version branches
5. acceptance is no longer `feature exists` but `deployable collaborative product exists`

## 2026-05-11 Delta

This cycle added one concrete `v1.0` runtime closure slice for the eight carryover capability debts.

What landed in this slice:

1. `ContextInjectionBundle` is now a real schema/service/API instead of hidden task context.
2. `L0-L3` collaboration level is now runtime-derived in `task-ssot` from workflow/review/specialist signals.
3. `Pipeline Launcher` now exposes explicit downstream readiness plans instead of staying a naming placeholder.
4. `Asset Backwrite Contract` now hard-blocks `ready_for_delivery / completed` tasks that still lack `final-delivery` backwrite.
5. `Outbox` and `SchedulerRun` now both expose runtime summaries, and the scheduler also exposes explicit `recoveryPolicy`.

User requirement back-check for this slice:

- original user requirement: 补上被挂起的 8 条能力债
- current state: partial-strong
- why: a unified runtime closure slice is landed, compiled, and tested, but it is not yet the full default operator path or fully surfaced in UI
