# ADR-0005 Product Workflow Gate Governance

- status: accepted
- date: 2026-04-19

## Context

The repository already defines a Virtual Product Chief operating model, product-management roles, and governed workflow execution.
However, product work could still jump from raw input or partial discussion directly into Product Solution, PRD, or prototype output before research and architecture decisions were complete.

This created a recurring failure mode:
- candidate directions were presented as final decisions
- subproject product structure could be fixed before platform architecture was confirmed
- open-source selection and competitor comparison were skipped or under-documented
- agent prompts had no mandatory downgrade rule when evidence was incomplete

## Decision

PMAIOS adopts mandatory product-management stage gates for product work that depends on platform capability or unresolved architecture boundaries.

The required stage order is:
1. Problem Definition
2. Research Analysis
3. Architecture Confirmation
4. Product Solution
5. PRD And Prototype
6. Delivery Planning

The following rules are now active:
- Product Solution, PRD, and prototype work must not proceed before Research Analysis and Architecture Confirmation are complete when platform capability, base selection, competitor route choice, or shared ownership is involved.
- If those stages are incomplete, outputs must be downgraded to candidate directions, risks, missing information, and chief confirmation questions.
- Changes that alter platform vs subproject scope or shared capability ownership must re-enter Architecture Confirmation.
- Changes that introduce new base selection, competitor route analysis, or platform capability assumptions must re-enter Research Analysis.

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
