# Implementation handoff package

- reportId: product-chief-e96a58e5-78e8-4724-937a-2657867c0f07
- type: implementation-handoff
- priority: P1
- generatedAt: 2026-04-28T01:40:26.465Z
- templatePath: docs/templates/workflow_handoff_template.md
- dependsOn: product-definition-baseline, requirement-baseline, ui-schema-spec
- autoBackfillOnSkip: true
- specialistAgentIds: product-agent-1dc558d0-aac8-4236-a6c3-f35c5994e61a, product-agent-28e18ebb-7b16-42cb-aa45-c1d64f447be2, product-agent-cf87d426-355e-40fb-a76f-0d72c2a87389

## Brief

请为一个 AI 埋点平台同时准备页面设计图和前端实现交付包，重点覆盖首页、需求中心、事件字典。先要设计图，但最终还要给前端落地。

## Why This Output Is Required

Frontend or implementation work must receive a governed handoff package instead of depending on conversational design drift.

## Missing Physical-World Questions

- target-users: Who are the exact users or stakeholders affected by this work?
- success-metrics: What measurable outcome proves this work succeeded?
- timeline: Is there a real deadline, launch window, or external dependency?
- ownership: Who owns the final decision, and which teams must coordinate?

## Learning Guidance

- Separate solution complexity from coordination complexity: Estimate the work using AI-first effort, coordination load, external dependency, and confidence.
- Apply build-vs-buy before custom implementation: Run open-source and external-pattern scouting before approving strategic build work.
- Use schema-first UI thinking: Define business blocks, state contracts, and interaction rules before screen-level implementation.

## Recommended Skills

- 5W2H (five-w-two-h): integrated; keyword:ai, integrated
- Persona (persona): integrated; keyword:ai, integrated
- Requirement Pool Operations (requirement-pool-operations): integrated; keyword:ai, integrated
- System Boundary (system-boundary): integrated; keyword:ai, integrated
- Version Repository Operations (version-repository-operations): integrated; keyword:ai, integrated
- Claude Design System (claude-design-system): installed; keyword:ai, installed
- Follow Builders (follow-builders): installed; keyword:ai, installed
- Committee Gate (committee-gate): integrated; integrated

## Backfill Status

- Auto-backfilled product-definition-baseline (product-output-3b564395-a43d-4fc7-8235-5bcff56425c9) because implementation-handoff was requested before prerequisite truth-source artifacts were generated.
- Auto-backfilled requirement-baseline (product-output-279e1daf-08ed-4845-87c0-fe1b99d5a380) because implementation-handoff was requested before prerequisite truth-source artifacts were generated.
- Auto-backfilled ui-schema-spec (product-output-baf8afcb-eb1c-40db-b633-0eb0d7ab2cbb) because implementation-handoff was requested before prerequisite truth-source artifacts were generated.

## Handoff Rule

- Implementation must consume governed requirement, product-definition, and UI-schema artifacts instead of relying on chat memory or image interpretation only.
- If any prerequisite artifact is missing, it must be backfilled before coding continues.

## Required Inputs

- Product definition baseline
- Requirement baseline package
- UI schema / business-block spec
- Approved design or prompt-pack artifacts when visual fidelity matters

## Frontend Alignment Checklist

- Every screen/module maps to a named requirement.
- Every visual block maps to a governed domain block or interaction contract.
- Any deviation from design is recorded as a product decision, not a silent implementation choice.
- Missing constraints are escalated back into requirements before continuing implementation.

## Delivery Contract

- Engineering receives artifact links, not only narrative instructions.
- Acceptance criteria must be testable against governed documents.
- Output must record unresolved gaps, waivers, and follow-up product decisions.
