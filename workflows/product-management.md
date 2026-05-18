# Product Management Workflow

## Purpose

This workflow defines the built-in delivery chain for platform and subproject product work.

It prevents teams from:

- jumping straight to UI or code
- producing low-fidelity page placeholders as if they were delivery outputs
- inventing data/API semantics only after pages are already drawn

## Mandatory Stages

1. research document
2. planning document
3. requirement document
4. functional specification
5. design document
6. frontend page
7. data schema
8. backend API
9. integration and acceptance

## Stage Contract

### 1. research document

- objective: collect facts before proposing product structure or implementation
- gate_to_next:
  - problem is clearly defined
  - at least one research round is completed
  - build-vs-buy evidence is recorded

### 2. planning document

- objective: turn research into version scope, milestones, and dependency order
- gate_to_next:
  - scope and milestone path are explicit
  - delivery chain order is visible

### 3. requirement document

- objective: convert planning into governed user and product requirements
- gate_to_next:
  - key requirements are traceable
  - every important requirement is decomposed to function-level granularity

### 4. functional specification

- objective: define modules, flows, states, and capability boundaries
- gate_to_next:
  - downstream design and engineering can use the same contract
  - each core function is decomposed to executable interface actions

### 5. design document

- objective: define page inventory, information architecture, user flow, interaction flow, state design, and component constraints before frontend delivery
- gate_to_next:
  - core user path is represented
  - downstream frontend work can implement from this package without re-guessing page meaning

### 6. frontend page

- objective: produce delivery-grade, user-facing, interactive frontend output instead of low-fidelity placeholder pages
- gate_to_next:
  - requirement, route, target role, and source/evidence refs are explicit
  - every governed block is bound to the `x.ant.design / Ant Design X` ecosystem or approved custom semantics
  - the page is implementable and integration-ready, not a document-like static layout

### 7. data schema

- objective: convert product and page state into durable data structures

### 8. backend API

- objective: define API contracts against functionality and data schema

### 9. integration and acceptance

- objective: close the loop with integration verification and acceptance review

## Hard Rules

### PMOS UI Guardrail Rule

The workflow must treat anti-demo UI governance as a first-class delivery rule.

Minimum rule:

- frontend work must define UISchema before React implementation
- governed pages must declare `screenType`, `layout`, `regions`, and block semantics
- conclusion blocks must include `evidenceRefs` or `sourceRefs`
- risky actions must include `riskLevel`, `approvalPolicy` or `requiresApproval`, and `auditRequired`
- `Ant Design Pro` templates must not be used as default PMOS workbench output

### Frontend Delivery Gate

The frontend page stage must be judged as a user-facing delivery output, not as a design placeholder.

Minimum rule:

- it must expose layout correctness
- it must expose module responsibility
- it must expose user flow
- it must expose dynamic interaction
- it must expose loading / empty / error / success feedback
- it must expose route / layout shell / target roles / source / evidence refs when applicable
- it must expose governed component bindings
- it must carry an acceptance matrix and repeated real-browser regression evidence
