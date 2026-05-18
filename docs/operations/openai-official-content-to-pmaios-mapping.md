# OpenAI Official Content To PMAIOS Mapping

- version: v0.1
- date: 2026-04-30
- status: active
- owner: product office

## Purpose

这份文档把与 `PMAIOS v0.6` 高相关的 OpenAI 官方内容压成可吸收映射表。

目标不是做资料收藏，而是明确：

1. 哪些是 OpenAI 官方主线
2. 对 PMAIOS 哪一层有结构性价值
3. 应该吸收什么
4. 不该误学什么

## Officiality Judgment

### 1. `openai/symphony`

- officiality: `OpenAI official`
- current status: `engineering preview`
- source:
  - `https://github.com/openai/symphony`

Key official signal:

- repository owner is `openai`
- README states Symphony turns project work into isolated autonomous implementation runs
- README explicitly marks it as a low-key engineering preview for trusted environments

### 2. `RightNow-AI/openfang`

- officiality: `not OpenAI official`
- current status: `external reference`
- source:
  - `https://github.com/RightNow-AI/openfang`
  - `https://www.openfang.sh/`

Key non-official signal:

- repository owner is `RightNow-AI`
- site states it is built and maintained by `RightNow Labs`

## Mapping Table

| OpenAI official content | PMAIOS layer | What to absorb | What not to mislearn |
| --- | --- | --- | --- |
| `Agents SDK` | `Kernel / Agent Runtime / Handoff / Trace` | handoff, tools, streaming, state, observability, guardrails | do not reduce PMAIOS into a thin SDK wrapper |
| `Agents / AgentKit` | `Product workbench / workflow composition / deploy surface` | workflow builder logic, deploy mindset, optimize loop | do not equate PMAIOS with OpenAI-hosted UI products |
| `Agent evals` | `Final-State Validation / Hermes / Gate` | reproducible evals, trace grading, datasets, prompt optimizer | do not treat eval as model-score-only testing |
| `Evals API` | `Hermes compare/promote / regression automation` | run structure, reports, webhooks, repeatable optimization flywheel | do not keep eval isolated from runtime governance |
| `Symphony` | `SchedulerRun / work orchestration / proof-of-work` | isolated autonomous runs, work-level management, proof-of-work artifacts | do not copy it as a coding-only orchestration shell |
| `Swarm` | `multi-agent conceptual baseline` | lightweight handoff mental model | do not treat it as the production mainline because OpenAI replaced it with Agents SDK |

## Priority Order For PMAIOS

Recommended absorption order:

1. `Agents SDK`
2. `Agent evals`
3. `Evals API`
4. `Symphony`
5. `Cookbook eval patterns`
6. `Swarm` as a conceptual reference only

## Concrete Absorption Plan

### A. `Agents SDK` -> PMAIOS Kernel

Absorb into:

- `Task SSOT`
- `AgentAssignment`
- `HandoffContract`
- `Execution trace`
- `Guardrail / Gate runtime`

Why:

- PMAIOS now has Task / Gate / Scheduler / Validation shells
- Agents SDK provides a stronger official baseline for stateful handoff and trace-oriented agent execution

### B. `Agent evals` + `Evals API` -> PMAIOS Validation And Hermes

Absorb into:

- `Final-State Validation`
- `Hermes compare / keep / replace / promote`
- regression testing for prompt / routing / workflow changes

Why:

- PMAIOS should not rely on taste or one-off judgment
- OpenAI evals provide the closest official methodology for repeatable workflow-level quality checks

### C. `Symphony` -> PMAIOS SchedulerRun / Proof-Of-Work

Absorb into:

- isolated run model
- run-level proof-of-work bundle
- work management above single-agent supervision

Why:

- PMAIOS v0.6 already has `SchedulerRun`
- Symphony is the closest official reference for pushing from "agent execution" to "work execution"

### D. `Swarm` -> PMAIOS Concept Layer

Absorb only:

- minimal handoff intuition
- simple multi-agent decomposition language

Do not absorb as:

- production orchestration standard
- future default runtime baseline

## Not From OpenAI But Still Worth Watching

`OpenFang` is not OpenAI official, but it is useful as an external contrast class for:

- agent-OS packaging
- runtime primitives
- channels / protocols / security bundling

Use it as:

- reference
- comparison target

Do not use it as:

- PMAIOS official baseline
- evidence of OpenAI direction

## v0.6 Relevance

This mapping should directly inform `v0.6` in three ways:

1. `Hermes Global`
   - latest-information integration must prefer official sources
   - OpenAI official agent/runtime/eval content becomes a named primary source class

2. `SchedulerRun`
   - Symphony becomes the official-reference input for future proof-of-work and isolated run upgrades

3. `Final-State Validation`
   - OpenAI eval methodology becomes the preferred reference for turning validation from taste into repeatable judgment

## User-Requirement Backcheck

- "Symphony / OpenFang 是否官方": `solved`
- "它们对 PMAIOS 有没有价值": `solved`
- "还有哪些 OpenAI 官方内容对我有系统性帮助": `solved`
- "直接接入 v0.6": `solved` once this mapping is linked into v0.6 truth sources
