# ADR-0005 Product Workflow Gate Governance

- status: accepted
- date: 2026-04-19

## Context

The repository already defines a Virtual Product Chief operating model, product-management roles, and governed workflow execution.
However, product work could still jump from raw input or partial discussion directly into downstream design or implementation output before research, planning, requirements, and functional definition were complete.

This created a recurring failure mode:
- candidate directions were presented as final decisions
- subproject product structure could be fixed before platform architecture was confirmed
- open-source selection and competitor comparison were skipped or under-documented
- agent prompts had no mandatory downgrade rule when evidence was incomplete

## Decision

PMAIOS adopts mandatory product-management stage gates for product work that depends on platform capability or unresolved architecture boundaries.

The required stage order is:
1. 调研文档
2. 规划文档
3. 需求文档
4. 功能文档
5. 前端页面（简单版）
6. 前端页面（UI/UX版）
7. 数据表
8. 后端接口
9. 前后端联调

The following rules are now active:
- Formal UI, data, API, and integration work must not proceed before 调研、规划、需求、功能 这些上游文档完成 when platform capability, base selection, competitor route choice, or shared ownership is involved.
- If those stages are incomplete, outputs must be downgraded to candidate directions, risks, missing information, and chief confirmation questions.
- Changes that alter platform vs subproject scope or shared capability ownership must re-enter 功能文档 or earlier upstream stages as applicable.
- Changes that introduce new base selection, competitor route analysis, or platform capability assumptions must re-enter 调研文档.
- `前后端联调` is the built-in final review gate and may trigger rework back to real upstream delivery stages instead of a detached generic review phase.

## Source Of Truth

The rule is implemented through:
- `workflows/product-management.md`
- `workflows/execution.md`
- `prompts/product-management/virtual_workflow_pm_prompt.md`
- `prompts/product-management/virtual_review_pm_prompt.md`
- `docs/operations/requirement-change-control.md`
- `docs/templates/business_confirmation_template.md`
- `docs/templates/architecture_confirmation_template.md`
- `docs/templates/workflow_gate_review_template.md`

## Consequences

Positive:
- product work now has explicit stage gates before solution output
- the built-in runtime chain now matches product delivery reality from research through integration
- platform and subproject boundary decisions must be confirmed in writing
- agent outputs are less likely to overstate confidence or skip research
- requirement changes can force re-entry into earlier stages with traceable governance

Tradeoffs:
- early-stage delivery is slower because research and architecture packages are now mandatory for some work
- operators must maintain additional documents and gate reviews
- some previously informal product discussions now require explicit downgrade and escalation

## Follow-up

- align subproject-level workflows with this ADR
- extend templates and prompts for specialist PM roles where missing
- review whether `PMAIOS_product_management_agent_operating_model.md` should be upgraded from draft to accepted baseline
