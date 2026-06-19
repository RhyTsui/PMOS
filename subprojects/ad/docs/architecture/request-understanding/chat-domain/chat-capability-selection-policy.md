# Chat Capability Selection Policy

Status: P0.6/P0.7 architecture refresh.

Capability Discovery must run before Query Contract blocking, final required slots, and parameter completion.

## Policy

- Discover candidate capabilities from Request Understanding output: user goal, domain signals, constraints, and ambiguity/missing information.
- Select capability by coverage and tool contract, not by hardcoded business examples.
- Resolve parameters from Capability/Tool Contract required inputs, not from Request Understanding prefilled Query Contract.
- Ask clarification only when required tool input cannot be resolved from user message, current project, context, defaults, or when exact/alias/synonym resolution has low confidence or multiple candidates.
- `metric`, `time`, and `dimension` are not universal required fields for all report questions.
- Media exact/alias/synonym unique match must auto-fill `media_id` into tool input.

## Tool-First Query Rule

```txt
User Requirement
-> Capability Discovery
-> Capability/Tool Contract required slots
-> Parameter Resolution
-> Clarification only for unresolved required inputs
```
