# Chat Response Binding

Status: P0.6/P0.7 architecture refresh.

Response binding maps execution output to user-visible surfaces.

## State Fields

- `business_outcome`: business result or blocking outcome.
- `step_status`: runtime step state.
- `tool_execution_status`: whether a real tool execution happened.
- `blocking_requirements`: backend-normalized user or capability requirements.

## Rule

Result state must not be used as a route classifier. Routing is owned by Request Understanding and Route Governance. SemanticResultContract is for final business result rendering.
