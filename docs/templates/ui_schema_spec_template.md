# UI Schema Spec Template

## Scope

- functional spec source:
- target page family:
- target operator roles:
- screenType:
- workflowStage:
- delivery mode:
- design system / ui spec source:
- component baseline (`x.ant.design / Ant Design X` / approved custom):
- `Ant Design Pro` decision (`not used` / `reference only` / `isolated adapter layer` / `blocked by compatibility`):
- design owner:
- frontend owner:

## Document Quality Contract

This document is not allowed to stop at page structure only.

It must explicitly cover:

- typography
- color semantics
- spacing
- radius
- border / shadow
- component sizing
- state semantics
- page-level layout rules
- component mapping
- implementation guardrails

## PMOS UISchema Contract

- `screenId`:
- `screenType`:
- `workflowStage`:
- `productContext`:
- `layout.desktop`:
- `layout.mobile`:
- `regions` or `blocks`:
- `evidenceRefs`:
- `sourceRefs`:
- `lastUpdatedAt` / `freshness`:
- `decisionPolicy`:
- `approvalPolicy`:
- `riskLevel`:
- `auditRequired`:
- `aiAssistanceMode`:
- `recommendedActions`:

## Chat Capability Contract

If the page follows the PMOS default paradigm, also define:

- unified chat entry:
- chat shell type:
- agent-controlled expansions:
- dynamic card surfaces:
- what is rendered inline in chat:
- what is rendered in side sheet / drawer:
- what is promoted into a dedicated page only after escalation:

## Home Page Interaction Contract

If the page is the unified PMOS home page, also define:

- `homepageMode`: `chat-first`
- primary chat region:
- hidden secondary modules:
- expansion triggers:
- drawer / side-sheet / inline expansion policy:
- what stays always visible:
- what stays hidden until expanded:

## Business Block Inventory

| Block | Purpose | Inputs | Outputs | States | Notes |
| --- | --- | --- | --- | --- | --- |
| To define | To define | To define | To define | To define | To define |

## Page Structure DSL

### Page 1

- page name:
- page purpose:
- route / entry:
- page schema id:
- layout shell:
- blocks in order:
- block interaction rules:
- empty / loading / error / permission states:
- key events:
- key data dependencies:
- state transitions:
- backend-coupled feedback:

## Frontend Implementation Mapping

- design token source:
- component library mapping:
- per-block component bindings:
- reusable component candidates:
- page-specific custom component candidates:
- anti-drift rules for implementation:

## Review Checklist

- Does the spec declare `screenType`, `layout`, and governed regions / blocks explicitly?
- Does the spec declare evidence / source semantics for conclusion surfaces?
- Does the spec declare decision / approval / audit semantics for risky actions?
- Are empty / loading / error / permission states explicit?
- Can frontend implement without secondary clarification?
