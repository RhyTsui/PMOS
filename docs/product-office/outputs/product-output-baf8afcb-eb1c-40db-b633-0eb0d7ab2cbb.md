# Schema-driven UI and business-block spec

- reportId: product-chief-e96a58e5-78e8-4724-937a-2657867c0f07
- type: ui-schema-spec
- priority: P0
- generatedAt: 2026-04-28T01:40:26.458Z
- templatePath: docs/templates/ui_schema_spec_template.md
- dependsOn: product-definition-baseline, requirement-baseline
- autoBackfillOnSkip: true
- specialistAgentIds: product-agent-1dc558d0-aac8-4236-a6c3-f35c5994e61a, product-agent-cf87d426-355e-40fb-a76f-0d72c2a87389

## Brief

请为一个 AI 埋点平台同时准备页面设计图和前端实现交付包，重点覆盖首页、需求中心、事件字典。先要设计图，但最终还要给前端落地。

## Why This Output Is Required

UI work should start from reusable business blocks and interaction contracts.

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

- No prerequisite artifact had to be backfilled for this output.

## Schema-Driven UI / Business Blocks

### Domain Blocks

- ProductChiefReportBlock
- MissingQuestionListBlock
- SpecialistEngagementBlock
- GovernedOutputQueueBlock

### State Contract

```json
{
  "reportId": "product-chief-e96a58e5-78e8-4724-937a-2657867c0f07",
  "missingQuestions": "ProductChiefQuestion[]",
  "engagedSpecialists": "ProductChiefSpecialistEngagement[]",
  "requiredGovernedOutputs": "GovernedOutputSpec[]"
}
```

### Interaction Rules

- User can generate governed outputs from required output specs.
- Generated artifacts must link back to the Product Chief report.
- Specialist engagement must remain auditable.
