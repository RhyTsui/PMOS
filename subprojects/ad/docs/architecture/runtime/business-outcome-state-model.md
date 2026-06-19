# Business Outcome State Model

Status: P0.6 architecture refresh.

The runtime separates business outcome, step status, and tool execution status.

## Fields

- `business_outcome`: `success`, `empty`, `partial_success`, `need_clarification`, `blocked`, or `failed`.
- `step_status`: execution step state such as running, waiting for user, success, or failed.
- `tool_execution_status`: `not_called`, `called_success`, or `called_failed`.
- `blocking_requirements`: backend-normalized missing inputs, approvals, or capability gaps.

## Display Rule

Main message displays result, conclusion, or necessary blocking action. Runtime details are disclosed through runtime panels or side surfaces.
