# MCP Workflow Status Contract

Status: P0.7 minimal protocol.

This contract defines the workflow status shape that Chat Core consumes from business MCP results. It does not change MCP tool schemas and does not require Chat Core to know concrete business tool names.

## Principle

- MCP remains the capability boundary.
- A business MCP may run an internal workflow for integration, diagnosis, reporting, configuration checks, or automation.
- Chat Core consumes only status, progress, steps, artifacts, blocking requirements, evidence refs, and source refs.
- Main message renders the business outcome. Process details are available to side panels or runtime disclosure.
- Current phase does not introduce a heavy Workflow Engine.

## Runtime Shape

The frontend type source is `frontend/src/src/contracts/automation/mcp-workflow-status.ts`.

Required fields:

- `workflowRunId`
- `workflowType`
- `status`
- `businessOutcome`

Optional fields:

- `progress`
- `steps`
- `artifacts`
- `blockingRequirements`
- `evidenceRefs`
- `sourceRefs`
- `metadata`

## Status Semantics

- `running` and `pending` mean the workflow is not complete.
- `success` and `failed` are terminal execution states.
- `waiting_for_input` means user-provided context is needed.
- `approval_required` means the operation must not continue without manual approval.
