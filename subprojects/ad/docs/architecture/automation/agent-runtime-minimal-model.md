# Agent Runtime Minimal Model

Status: P0.7 minimal protocol.

`AgentRuntimeTask` is the smallest Chat-facing task envelope for MCP workflow and automation outcomes.

## Fields

- `taskId`
- `serviceIntent`
- `plan`
- `toolCalls`
- `collaborationState`
- `taskState`
- `businessOutcome`
- `metadata`

## Boundary

The model is an adapter output. It is not a planner, not a Workflow Engine, and not a replacement for MCP execution. Chat Core uses it to display task state and decide whether the user needs to provide input or approval.
