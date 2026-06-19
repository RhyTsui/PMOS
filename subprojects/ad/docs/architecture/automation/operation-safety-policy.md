# Operation Safety Policy

Status: P0.7 minimal protocol.

Operation safety classifies whether an MCP-backed operation may proceed automatically or must wait for approval.

## Levels

- `read_only`
- `low_risk_write`
- `medium_risk_operation`
- `high_risk_operation`
- `blocked_operation`

## Runtime Rule

High-risk operations must surface `approval_required` or `waiting_for_input`. Chat Core must not execute or continue the operation only because a user message mentions the desired action.
