# Execution Rules

## Principles

- PMAIOS executes as a file-driven, repository-native workflow system.
- Every stage must produce traceable outputs, not just conversational summaries.
- Workflow runs must remain observable, reviewable, and resumable.
- The active `v0.7` baseline is a governed delivery runtime, not a loose demo workflow.

## v0.7 Scope

- The active baseline covers: `Execution + Requirement + Version + Observability + Governance`.
- File-based persistence remains the default storage model for local operation.
- LangGraph, Hermes, Dify, n8n, and Meta Layer are not assumed to be the active control plane unless explicitly integrated into the current runtime.

## Execution Guards

- Stage outputs must be written to repository files.
- Provider failures must be surfaced as explicit blocked states or warnings, not hidden in free-form logs.
- Review gates must be able to stop progression and trigger rework.
- Telemetry must preserve stage events, provider events, artifacts, and review decisions.

## Gate And Rework Rules

- A stage cannot be considered complete if required outputs are missing.
- `Reject` blocks downstream progress.
- `Conditional` requires explicit follow-up or bounded rework.
- `needs-rework` must preserve trace, gate rationale, and recovery target stage.

## Trace And Telemetry Scope

- Runs must preserve workflow state, event logs, artifact paths, and provider execution signals.
- Review, metrics, and observability are first-class runtime outputs.
- Capability, requirement, and version links should be visible through traceable records rather than implicit assumptions.

## Open-source-first Rule

- Before implementation, first evaluate mature open-source tools, open-source components, or managed services that already solve the problem.
- Do not default to handwritten bespoke code for common infrastructure, workflow plumbing, integrations, dashboards, or operator tooling.
- Custom implementation is allowed only when existing options clearly fail on license, cost, maintainability, integration boundary, performance, or security requirements.
- If a ready-made solution is rejected, the reason and build-vs-buy comparison must be recorded as part of the delivery decision.

## Product Management Gate Rules

- Product work that involves platform capability, base selection, competitor route choice, or shared ownership must follow `workflows/product-management.md`.
- Formal downstream outputs must be downgraded to research / planning / requirement conclusions if `调研文档 / 规划文档 / 需求文档 / 功能文档` has not been completed.
- The built-in delivery chain is:
  - `调研文档`
  - `规划文档`
  - `需求文档`
  - `功能文档`
  - `设计文档`
  - `前端页面`
  - `数据表`
  - `后端接口`
  - `联调与验收`
- `联调与验收` carries the final review gate and may send rework back to real upstream delivery stages.
- Data and API semantics must be front-loaded:
  - `功能文档` must already expose the core object model before design and frontend work advance
  - `设计文档 / 前端页面` must already expose key data states and interaction states
  - `数据表` is formal schema finalization, not first-pass data thinking
  - `后端接口` is formal contract finalization, not first-pass interaction thinking
- Business confirmation, architecture confirmation, and gate review should use the templates under `docs/templates/`.
