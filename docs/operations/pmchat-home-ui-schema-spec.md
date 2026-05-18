# PMChat Home UI Schema Spec

## Scope

- functional spec source: `docs/operations/pmos-ai-native-workspace-design-language.md`
- target page family: PMOS unified home shell
- target operator roles: `product-manager`, `operator`, `reviewer`
- screenType: `pmchat-home`
- workflowStage: `design`
- delivery mode: governed AI-native workspace
- design system / ui spec source:
  - `docs/operations/frontend-style-default.md`
  - `docs/operations/ui-pmos-copilot-contract.md`
  - `docs/operations/pmchat-ant-design-x-capability-matrix.md`
  - `docs/operations/pmos-ai-native-workspace-design-language.md`
- component baseline (`x.ant.design / Ant Design X` / approved custom): `x.ant.design / Ant Design X`
- `Ant Design Pro` decision (`not used` / `reference only` / `isolated adapter layer` / `blocked by compatibility`): `not used`
- design owner: Codex
- frontend owner: pending implementation handoff

## Document Quality Contract

This document defines the home-shell contract, not only page structure.

It explicitly fixes:

- typography: modern sans, compact hierarchy, code-friendly companion style
- color semantics: dark-first neutral shell with restrained blue/cyan accents for active AI states
- spacing: dense workspace spacing, avoid oversized breathing gaps
- radius: restrained, not soft oversized cards
- border / shadow: weak borders + soft layered shadow
- component sizing: compact conversation controls, medium-height sender, dense secondary surfaces
- state semantics: loading, streaming, thinking, running, waiting approval, failed, completed
- page-level layout rules: center-first chat, collapsible context, invoked inspectors
- component mapping: governed by Ant Design X + PMOS registry blocks
- implementation guardrails: no dashboard grid, no summary-card wall, no hero section

## PMOS UISchema Contract

- `screenId`: `pmchat-home`
- `screenType`: `pmchat-home`
- `workflowStage`: `design`
- `productContext`: PMOS platform default AI-native workspace shell
- `layout.desktop`: `chat-first`
- `layout.mobile`: `stacked-decision-flow`
- `regions`:
  - `contextRail`: collapsible session / scope / runtime summary
  - `main`: main chat plus inline execution / decision / dynamic output
  - `evidencePanel`: evidence refs, source refs, freshness
  - `sidePanel`: agent control and expandable structured surface
  - `approvalPanel`: risky action approval gate
  - `auditTrail`: execution / approval / state trace
- `evidenceRefs`:
  - `workspace-design-language`
  - `home-shell-evidence`
- `sourceRefs`:
  - `docs/operations/pmos-ai-native-workspace-design-language.md`
  - `docs/operations/frontend-style-default.md`
  - `docs/operations/ui-pmos-copilot-contract.md`
  - `docs/operations/pmchat-ant-design-x-capability-matrix.md`
- `lastUpdatedAt` / `freshness`: `2026-05-13T00:00:00+08:00`
- `decisionPolicy`: `review`
- `approvalPolicy`: `human-review`
- `riskLevel`: `medium`
- `auditRequired`: `true`
- `aiAssistanceMode`: `copilot`
- `recommendedActions`:
  - continue home-shell implementation against this schema
  - keep secondary modules hidden until invoked
  - treat agent state and structured output as first-class inline conversation surfaces

## Chat Capability Contract

- unified chat entry: homepage itself
- chat shell type: single dominant PMChat shell
- agent-controlled expansions:
  - evidence drawer
  - approval drawer
  - trace drawer
  - structured side-sheet
- dynamic card surfaces:
  - inline `x-card`
  - inline execution block
  - side-sheet structured result surface
- what is rendered inline in chat:
  - streaming reply
  - think / thought chain
  - sources
  - actions
  - markdown
  - code
  - mermaid
  - structured result cards
- what is rendered in side sheet / drawer:
  - extended evidence
  - approval details
  - audit logs
  - agent control details
- what is promoted into a dedicated page only after escalation:
  - long-lived task execution boards
  - deep review flows
  - full artifact comparison / remediation surfaces

## Home Page Interaction Contract

- `homepageMode`: `chat-first`
- primary chat region: always visible center-stage conversation
- hidden secondary modules:
  - evidence
  - approval
  - audit
  - structured side-sheet
- expansion triggers:
  - agent action
  - risky recommendation
  - source inspection
  - execution trace request
- drawer / side-sheet / inline expansion policy:
  - inline first
  - side-sheet second
  - dedicated page last
- what stays always visible:
  - active chat
  - sender
  - lightweight suggestion entry
  - minimal session/scope context
- what stays hidden until expanded:
  - full evidence body
  - approval details
  - audit logs
  - deep task board

## Business Block Inventory

| Block | Purpose | Inputs | Outputs | States | Notes |
| --- | --- | --- | --- | --- | --- |
| `ContextRail` | Show active scope, session, runtime status | session, scope, model/runtime | compact context items | normal, warning, critical | collapsible by default |
| `ChatShell` | Carry the main PMChat interaction | user prompts, agent replies | streaming conversation | loading, streaming, idle | primary page body |
| `WorkflowStatusPanel` | Surface current execution state inline | run status, current step | visible state chip + step text | running, waiting_approval, failed, completed | inline not dashboard |
| `DecisionCard` | Surface current AI recommendation | evidence refs, summary | recommended actions | normal, warning | must keep evidence refs |
| `EvidencePanel` | Show evidence and freshness | evidence refs, source refs | evidence list | loading, empty | hidden until invoked |
| `AgentControlCard` | Surface agent role and actions | role, summary, actions | controlled next steps | normal, warning | supports action launch |
| `DynamicSurfaceCard` | Carry structured interactive payload | agent payload refs | inline / drawer / side-sheet result | empty, loading, ready | chat-first escalation surface |
| `ApprovalPanel` | Carry risky action approval | actions, policy | approve / reject controls | waiting_approval | audit required |
| `AuditLog` | Show operator and agent trace | event log | trace list | normal, warning | drawer / trail usage |

## Page Structure DSL

### Page 1

- page name: `PMChat Home`
- page purpose: use one governed AI-native conversation surface as the PMOS platform entry
- route / entry: `/workspace`
- page schema id: `pmchat-home`
- layout shell: collapsible context rail + main conversation + invoked inspectors
- blocks in order:
  - `ContextRail`
  - `ChatShell`
  - `WorkflowStatusPanel`
  - `DecisionCard`
  - `EvidencePanel`
  - `AgentControlCard`
  - `DynamicSurfaceCard`
  - `ApprovalPanel`
  - `AuditLog`
- block interaction rules:
  - chat remains primary
  - evidence / approval / audit stay hidden until invoked
  - structured outputs render inline first
  - risky actions require approval panel handoff
- empty / loading / error / permission states:
  - empty: welcome + starter prompts
  - loading: active streaming / skeleton thinking state
  - error: message-level failure with retry
  - permission: risky action disabled with approval hint
- key events:
  - submit prompt
  - agent starts running
  - tool result arrives
  - evidence expanded
  - approval requested
  - action approved / rejected
- key data dependencies:
  - sessions
  - messages
  - execution runs
  - source refs
  - approval tasks
- state transitions:
  - `idle -> thinking -> running -> reviewing -> completed`
  - `running -> waiting_approval -> completed`
  - `running -> failed -> retry`
- backend-coupled feedback:
  - runtime status
  - source freshness
  - approval result
  - artifact sync feedback

## Frontend Implementation Mapping

- design token source: local PMOS tokens aligned to AI-native workspace baseline
- component library mapping:
  - `ChatShell` -> Ant Design X chat shell composition
  - `WorkflowStatusPanel` -> lightweight inline governed block
  - `DecisionCard` -> governed recommendation card
  - `DynamicSurfaceCard` -> `X Card` / inline drawer / side-sheet carrier
  - `EvidencePanel` / `ApprovalPanel` / `AuditLog` -> governed drawer / panel surfaces
- per-block component bindings:
  - `ChatShell`: `Conversations`, `Bubble`, `Sender`, `Suggestion`, `Think`, `ThoughtChain`, `Sources`, `Actions`
  - `DynamicSurfaceCard`: `X Card`, `XMarkdown`, `CodeHighlighter`, `Mermaid`, `FileCard`, `Folder`
  - `ApprovalPanel`: Ant Design base controls through governed binding
- reusable component candidates:
  - PMChat shell
  - runtime state ribbon
  - evidence drawer
  - approval drawer
  - audit drawer
- page-specific custom component candidates:
  - inline execution strip
  - structured result side-sheet
- anti-drift rules for implementation:
  - no dashboard-first split
  - no static panel wall
  - no admin-console visual language
  - no detached tool playground below the conversation

## Review Checklist

- Does the spec declare `screenType`, `layout`, and governed regions / blocks explicitly?
- Does the spec declare evidence / source semantics for conclusion surfaces?
- Does the spec declare decision / approval / audit semantics for risky actions?
- Are empty / loading / error / permission states explicit?
- Can frontend implement without secondary clarification?
