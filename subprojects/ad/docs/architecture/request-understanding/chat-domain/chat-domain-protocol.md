# Chat Domain Protocol

Status: P0.6/P0.7 architecture refresh.

Chat Domain Protocol defines how Chat Core separates user intent, execution planning, and response binding.

## Principles

- Request Understanding decides what the user wants.
- Request Understanding only emits user goal, domain signals, constraints, and ambiguity/missing information; it must not pre-build the final Query Contract or required slots.
- Capability Discovery must happen before final required slots and parameter completion; Tool/Capability Contract decides required slots, then Resolver Chain fills parameters.
- Execution Planning decides how the system should satisfy the request.
- Response Binding decides how the result should be presented.
- Domain signals may provide evidence, but must not override the top-level service intent.
- `body.intent` is a client hint, not an authoritative route decision.
- Chat Core must not hardcode concrete business MCP tool names.

## Runtime Boundary

```txt
User Message
-> Request Understanding
-> Service Intent / User Requirement
-> Capability Discovery
-> Tool/Capability Contract required slots
-> Resolver Chain / Parameter Resolution
-> Execution
-> SemanticResultContract / ResponseContract
-> Renderer
```
