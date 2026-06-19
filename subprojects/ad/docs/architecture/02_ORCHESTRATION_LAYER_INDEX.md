# Orchestration Layer Index

> Parent: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
>
> Layer: `Request Understanding & Capability Orchestration System`

## Purpose

This layer standardizes how the system understands a request, discovers capabilities, selects a capability, invokes tools, assembles results, and records routing traces.

## Execution Order

1. `request-understanding`
2. `capability-orchestration`
3. `business-semantics`
4. `context-memory`
5. `mcp-governance`
6. `result-assembly`
7. `observability`
8. `prompting`

## Core Files

- `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC_ORCHESTRATION_PATCH.md`
- `frontend/src/src/contracts/request-understanding/user-requirement-contract.ts`
- `frontend/src/src/contracts/capability/capability-manifest.ts`
- `frontend/src/src/contracts/business-semantics/dimension-catalog.ts`
- `frontend/src/src/contracts/business-semantics/metric-catalog.ts`
- `frontend/src/src/contracts/business-semantics/dataset-authority.ts`
- `frontend/src/src/contracts/observability/routing-trace.ts`
- `frontend/src/src/contracts/result-assembly/semantic-result-assembly.ts`
- `frontend/src/src/lib/request-understanding.ts`
- `frontend/src/src/lib/capability-orchestration.ts`

## Policy

- Intent belongs to request understanding, not to a parallel system.
- Capability selection must be based on requirement coverage, not tool-name hardcoding.
- `material` is a business dimension, not a special system module.
- Fallback must be explicit and visible in the routing trace.

## P0.6 / P0.7 Refresh

Rules:

1. Request Understanding only emits user goal, domain signals, constraints, and ambiguity; it must not pre-build final Query Contract.
2. Capability Discovery must happen before Query Contract blocking, final required slots, and parameter completion.
3. Capability/Tool Contract drives required slots and Parameter Resolution.
4. Clarification is allowed only for unresolved required tool inputs or low-confidence/multi-candidate resolution.
5. `metric`, `time`, and `dimension` are not universal required fields.
6. MCP is the capability integration standard.
7. Chat Core must not hardcode concrete business MCP tool names.
8. MCP Workflow may carry integration, diagnosis, report, and automation status.
9. Current stage does not introduce a heavy Workflow Engine.
10. Main message displays results; side surfaces display process details.

Additional source files:

```txt
docs/architecture/request-understanding/chat-domain/
docs/architecture/business-semantics/business-semantics-protocol.md
docs/architecture/interaction-system/product-execution-principles.md
docs/architecture/runtime/trace-fail-open-policy.md
docs/architecture/runtime/tool-first-query-runtime.md
docs/architecture/runtime/business-outcome-state-model.md
docs/architecture/automation/
frontend/src/src/contracts/automation/
frontend/src/src/lib/mcp-tool-output-adapter.ts
```
