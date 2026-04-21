# Subproject Product Workflow Adoption Checklist

- version: v0.4
- date: 2026-04-20
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
- project execution workflow doc: yes
- PM task sheet: yes
- proactive sync rule: yes
- research vs solution separation: yes
- review/governance evidence: partial
- evidence:
  - `subprojects/chokonu/README.md`
  - `subprojects/chokonu/subproject.json`
  - `subprojects/chokonu/docs/workflow/ChoKoNu项目执行工作流.md`
  - `subprojects/chokonu/docs/workflow/ChoKoNu产品经理任务单.md`
  - `subprojects/chokonu/docs/requirements/ChoKoNu首版总规划.md`
  - `subprojects/chokonu/docs/requirements/ChoKoNu首版需求清单.md`
  - `subprojects/chokonu/docs/review/ChoKoNu版本评审输入稿.md`
  - `subprojects/chokonu/docs/memory/ChoKoNu文档验收状态清单.md`
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

### data-service

- status: `not-adopted`
- current stage: repository registration only
- inbox flow: no visible evidence
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

- status: `unknown`
- current stage: unknown
- evidence:
  - no checked project docs in this pass
- current blockers:
  - not reviewed in the current implementation round
- next actions:
  - inspect project docs and classify in the next checklist update

### mcp

- status: `unknown`
- current stage: unknown
- evidence:
  - not reviewed in the current implementation round
- current blockers:
  - not reviewed in the current implementation round
- next actions:
  - inspect project docs and classify in the next checklist update

## Cross-Project Findings

### What Is Already Working

1. platform-level stage gates already exist in `workflows/product-management.md`
2. `inbox` is already defined as the raw input source in `docs/memory/global-rules.md`
3. `knowledge-base` already demonstrates a workable project-level extension of the platform rules

### What Is Still Missing

1. most subprojects do not yet have their own execution workflow document
2. most subprojects do not yet have a PM task sheet or equivalent submission contract
3. proactive sync is not yet consistently enforced outside `knowledge-base`
4. workflow adoption is currently document-fragmented rather than platform-unified

## Required Follow-Up

To move from partial adoption to real platform rollout:

1. decide which subprojects need full product-workflow adoption versus lighter governance
2. create project execution workflow docs for the next high-priority subprojects
3. create PM task sheets for those same projects
4. update this checklist whenever a subproject adds or changes workflow governance
