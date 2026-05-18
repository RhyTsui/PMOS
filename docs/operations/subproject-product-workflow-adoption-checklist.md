# Subproject Product Workflow Adoption Checklist

- version: v0.5
- date: 2026-05-07
- status: active snapshot
- basis: current repository evidence only

## Purpose

This document records whether each major subproject has actually connected to the platform-level product workflow.

Status definitions:

- `adopted`: project has explicit workflow, role ownership, sync expectations, and stage gating
- `partial`: project has some governed product assets but lacks one or more core workflow controls
- `not-adopted`: project only has raw documents or minimal registration, without workflow governance
- `unknown`: not enough evidence yet

## Checklist Fields

Each subproject is checked on:

- raw input flow from `docs/sources/inbox/`
- requirement pool artifact
- stage-agent-orchestration adoption
- question-driven requirement clarification usage
- UI spec activation evidence
- repeat-correction absorption evidence
- project execution workflow document
- PM task sheet or equivalent submission contract
- proactive sync rule
- explicit research vs solution separation
- evidence of review/governance
- current visible stage
- blockers to full adoption

## Adoption Snapshot

### knowledge-base

- status: `partial`
- current stage: research analysis
- inbox flow: yes
- requirement pool artifact: partial
- stage-agent-orchestration adoption: no visible evidence
- question-driven requirement clarification usage: partial
- UI spec activation evidence: no visible evidence
- repeat-correction absorption evidence: no visible evidence
- project execution workflow doc: yes
- PM task sheet: yes
- proactive sync rule: yes
- research vs solution separation: yes
- review/governance evidence: yes
- evidence:
  - `subprojects/knowledge-base/docs/` workflow document
  - `subprojects/knowledge-base/docs/` PM task sheet
  - `subprojects/knowledge-base/docs/WeKnora...md`
- current blockers:
  - competitor and open-source comparison still incomplete
  - internal capability inventory still incomplete
  - chief decision issue list still incomplete
  - project is not yet proven to run fully through the common platform workflow end to end
- next actions:
  - finish the remaining research package
  - keep using this project as the platform sample

### ad

- status: `partial`
- current stage: problem/solution reset around month-end demo
- inbox flow: not explicitly governed in project docs
- requirement pool artifact: no visible evidence
- stage-agent-orchestration adoption: no visible evidence
- question-driven requirement clarification usage: partial
- UI spec activation evidence: no visible evidence
- repeat-correction absorption evidence: no visible evidence
- project execution workflow doc: yes
- PM task sheet: yes
- proactive sync rule: yes
- research vs solution separation: partial
- review/governance evidence: partial
- evidence:
  - `subprojects/ad/docs/` execution workflow
  - `subprojects/ad/docs/` PM task sheet
  - `subprojects/ad/docs/` month-end demo reset doc
- current blockers:
  - raw input path is still not explicitly tied back to the platform `inbox` rule inside ad project docs
  - long-term PRD and short-term demo execution are still split across multiple documents
- next actions:
  - align raw input path to the platform `inbox` rule
  - use the new workflow and task sheet to drive actual demo submissions

### chokonu

- status: `partial`
- current stage: active planning-and-execution package established
- inbox flow: yes
- requirement pool artifact: partial
- stage-agent-orchestration adoption: no visible evidence
- question-driven requirement clarification usage: yes
- UI spec activation evidence: no visible evidence
- repeat-correction absorption evidence: no visible evidence
- project execution workflow doc: yes
- PM task sheet: yes
- proactive sync rule: yes
- research vs solution separation: yes
- review/governance evidence: partial
- evidence:
  - `subprojects/chokonu/README.md`
  - `subprojects/chokonu/subproject.json`
  - `subprojects/chokonu/docs/workflow/...`
  - `subprojects/chokonu/docs/requirements/...`
- current blockers:
  - first-version platform scope is still not yet fully converged
  - several older analysis and product docs still need convergence against the new total-planning baseline
  - review/governance is documented, but not yet proven through repeated actual submission cycles
- next actions:
  - continue converging active outputs to the ChoKoNu framing
  - keep historical `tracking-acceptance` material in legacy/background only
  - run the first real review cycle on the new active workflow baseline

### server

- status: `partial`
- current stage: mature product documentation exists, workflow adoption unclear
- inbox flow: no visible evidence
- requirement pool artifact: no visible evidence
- stage-agent-orchestration adoption: no visible evidence
- question-driven requirement clarification usage: weak
- UI spec activation evidence: no visible evidence
- repeat-correction absorption evidence: no visible evidence
- project execution workflow doc: no
- PM task sheet: no
- proactive sync rule: no visible evidence
- research vs solution separation: weak
- review/governance evidence: partial
- evidence:
  - `subprojects/server/docs/...`
- current blockers:
  - product requirements and version content exist, but not under the platform workflow model
  - no explicit project execution workflow
  - no project PM submission contract
  - no proactive sync rule
- next actions:
  - evaluate whether server should adopt the full product workflow or only a lighter governance subset
  - if full adoption is required, add workflow and task-sheet documents

### cozeloop

- status: `partial`
- current stage: first planning-and-deployment baseline established
- inbox flow: no visible evidence
- requirement pool artifact: no visible evidence
- stage-agent-orchestration adoption: no visible evidence
- question-driven requirement clarification usage: partial
- UI spec activation evidence: no visible evidence
- repeat-correction absorption evidence: no visible evidence
- project execution workflow doc: no
- PM task sheet: no
- proactive sync rule: no visible evidence
- research vs solution separation: yes
- review/governance evidence: partial
- evidence:
  - `subprojects/cozeloop/README.md`
  - `subprojects/cozeloop/subproject.json`
  - `subprojects/cozeloop/docs/product/...`
- current blockers:
  - no explicit project execution workflow
  - no PM task sheet or submission contract
  - no explicit inbox-linked raw input path
  - product decisions exist, but adoption into the common project workflow is still incomplete
- next actions:
  - decide whether `cozeloop` should adopt the full product workflow or a lighter deployment-governance subset
  - if it stays active, add workflow and task-sheet documents before deeper continuation

### tracking-acceptance

- status: `adopted`
- current stage: governed product chain established and runtime governance slice landed
- inbox flow: yes
- requirement pool artifact: yes
- stage-agent-orchestration adoption: yes
- question-driven requirement clarification usage: yes
- UI spec activation evidence: yes
- repeat-correction absorption evidence: yes
- project execution workflow doc: yes
- PM task sheet: yes
- proactive sync rule: yes
- research vs solution separation: yes
- review/governance evidence: yes
- evidence:
  - `subprojects/tracking-acceptance/README.md`
  - `subprojects/tracking-acceptance/AGENTS.md`
  - `subprojects/tracking-acceptance/docs/operations/startup-whoami.md`
  - `subprojects/tracking-acceptance/docs/product/AI埋点平台-详细需求真源-v2.md`
  - `subprojects/tracking-acceptance/docs/product/AI埋点平台-05-06会议反馈转需求池-v1.md`
  - `subprojects/tracking-acceptance/docs/product/AI埋点平台-需求池总表-v1.md`
  - `subprojects/tracking-acceptance/docs/design/AI埋点平台-前端交互文档-v2.md`
  - `subprojects/tracking-acceptance/docs/review/AI埋点平台-测试验收标准-v1.md`
- current blockers:
  - standard-base, historical import/version inheritance, query-scheme/mature-board, and AI writeback contracts are defined but not yet platform-templated
  - the runtime slice is landed, but cross-project automatic reuse still needs broader rollout
- next actions:
  - promote the validated governance patterns into platform rules and templates
  - keep the requirement pool as a mandatory active artifact instead of a one-off meeting conversion
  - use this project as the sample for subproject minimum runtime contract and truth-source governance rollout

### data-service

- status: `not-adopted`
- current stage: repository registration only
- inbox flow: no visible evidence
- requirement pool artifact: no visible evidence
- stage-agent-orchestration adoption: no visible evidence
- question-driven requirement clarification usage: no visible evidence
- UI spec activation evidence: no visible evidence
- repeat-correction absorption evidence: no visible evidence
- project execution workflow doc: no
- PM task sheet: no
- proactive sync rule: no
- research vs solution separation: no
- review/governance evidence: no
- evidence:
  - `subprojects/data-service/docs/README.md`
- current blockers:
  - no project product workflow artifacts
  - no governed requirements or review path
- next actions:
  - determine whether the subproject needs active product management
  - if yes, create baseline workflow, task sheet, and inbox-linked intake

### ad-intelligence

- status: `not-adopted`
- current stage: runnable skeleton plus historical version drafts
- evidence:
  - `subprojects/ad-intelligence/README.md`
  - `subprojects/ad-intelligence/subproject.json`
  - `subprojects/ad-intelligence/docs/developer-guide.md`
  - `subprojects/ad-intelligence/docs/memory/project-memory.md`
- current blockers:
  - no project execution workflow
  - no PM task sheet
  - no explicit review/governance path
  - many historical version drafts exist, but not under a common active truth chain
- next actions:
  - if the project is reactivated, create a fresh active truth baseline instead of continuing from version-history drafts
  - decide whether it needs full workflow adoption or should stay as an engineering skeleton

### mcp

- status: `partial`
- current stage: active support-layer subproject with registration and memory baseline
- evidence:
  - `subprojects/mcp/README.md`
  - `subprojects/mcp/subproject.json`
  - `subprojects/mcp/docs/README.md`
  - `subprojects/mcp/docs/memory/project-memory.md`
- current blockers:
  - no project execution workflow
  - no PM task sheet
  - capability boundary and input/output contract are still only loosely stated
  - unclear whether this project should use full workflow adoption or a lighter governance subset
- next actions:
  - clarify whether `mcp` is a support-layer project or an independently productized project
  - if independent product work continues, add workflow and task-sheet documents

## Cross-Project Findings

### What Is Already Working

1. platform-level stage gates already exist in `workflows/product-management.md`
2. `inbox` is already defined as the raw input source in `docs/memory/global-rules.md`
3. `knowledge-base` already demonstrates a workable project-level extension of the platform rules
4. subproject secondary-development workflow now has a platform-level truth in `docs/operations/subproject-secondary-development-workflow.md`
5. `tracking-acceptance` has now proven that requirement-pool, staged design chain, and page-rectification checklist can work end to end on a real project

### What Is Still Missing

1. most subprojects do not yet have their own execution workflow document
2. most subprojects do not yet have a PM task sheet or equivalent submission contract
3. proactive sync is not yet consistently enforced outside `knowledge-base`
4. workflow adoption is currently document-fragmented rather than platform-unified
5. stage-agent orchestration, UI spec activation, and repeat-correction absorption are now runtime-visible in the tracking-acceptance sample, but still need broader cross-project rollout

## Required Follow-Up

To move from partial adoption to real platform rollout:

1. decide which subprojects need full product-workflow adoption versus lighter governance
2. create project execution workflow docs for the next high-priority subprojects
3. create PM task sheets for those same projects
4. use `docs/operations/subproject-secondary-development-workflow.md` when a subproject starts from an external/open-source/legacy base
5. update this checklist whenever a subproject adds or changes workflow governance
