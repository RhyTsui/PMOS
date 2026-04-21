# Product Management Workflow

## Purpose

This workflow defines the mandatory product-management stage gates for platform and subproject work.
It exists to prevent premature product solution output before research and architecture decisions are complete.

## Mandatory Stages

1. Problem Definition
2. Research Analysis
3. Architecture Confirmation
4. Product Solution
5. PRD And Prototype
6. Delivery Planning

## Stage Contract

### 1. Problem Definition
- objective: define the actual problem before discussing solution shape
- required_inputs:
  - raw source materials
  - operator request
  - current project context
- required_outputs:
  - problem definition note
  - user and scenario summary
  - initial scope and risks
  - open questions list
- owner: Virtual Product Chief or assigned requirements PM
- gate_to_next:
  - problem is clearly defined
  - missing research topics are explicitly listed

### 2. Research Analysis
- objective: collect facts before proposing product structure
- required_inputs:
  - problem definition outputs
  - open-source candidates
  - competitor set
  - internal capability context
- required_outputs:
  - research report
  - competitive comparison
  - internal capability inventory
  - candidate directions with tradeoffs
  - issues requiring chief confirmation
- owner: assigned specialist PMs under Virtual Product Chief
- gate_to_next:
  - at least one research round is completed
  - open-source / buy-before-build analysis is recorded
  - unresolved platform questions are escalated

### 3. Architecture Confirmation
- objective: confirm service boundaries before solution design
- required_inputs:
  - research outputs
  - dependency list
  - platform capability assumptions
- required_outputs:
  - architecture confirmation note or architecture diagram
  - module ownership and scope table
  - in-scope / out-of-scope list
  - chief or architect decisions
- owner: Real Product Chief with Virtual Product Chief support
- gate_to_next:
  - architecture boundary is confirmed in writing
  - platform vs subproject responsibilities are clear
  - blocking ownership questions are resolved or explicitly deferred

### 4. Product Solution
- objective: define product shape within confirmed architecture boundaries
- required_inputs:
  - architecture confirmation outputs
  - approved scope
- required_outputs:
  - product positioning
  - information architecture
  - module plan
  - version path
  - major risks and dependencies
- owner: assigned PMs
- gate_to_next:
  - no critical assumptions remain unacknowledged
  - solution stays within confirmed architecture boundaries

### 5. PRD And Prototype
- objective: convert product solution into executable product definition
- required_inputs:
  - approved product solution
- required_outputs:
  - PRD
  - key user flows
  - page list
  - prototype or prototype scope
  - acceptance criteria
- owner: assigned PMs
- gate_to_next:
  - acceptance criteria are explicit
  - upstream decisions are traceable

### 6. Delivery Planning
- objective: convert approved product definition into execution plan
- required_inputs:
  - PRD and prototype outputs
- required_outputs:
  - delivery plan
  - dependency plan
  - review and launch checklist
  - risk mitigation plan
- owner: delivery PM / chief
- gate_to_next:
  - scope, dependencies, and review gates are visible

## Hard Rules

### Research Gate
The workflow must not enter Product Solution directly when any of the following apply:
- open-source base selection is involved
- competitor route comparison is involved
- platform capability or control-plane boundary is unclear
- multiple systems share responsibility for the final product
- permissions, prompts, knowledge, evaluation, runtime, or gateway capability boundaries are still assumptions

### Architecture Gate
The workflow must not enter Product Solution until written architecture confirmation exists when:
- the subproject depends on platform capabilities
- menu structure or module ownership is affected by platform architecture
- the project reuses shared permissions, prompt, knowledge, MCP, evaluation, gateway, or release capability

### Output Downgrade Rule
If Research Analysis or Architecture Confirmation is incomplete, product agents may only output:
- candidate directions
- risks
- missing information
- research recommendations
They may not present:
- final product architecture
- fixed first-level menu decisions
- final PRD
- final version commitments

## Required Templates
- docs/templates/business_confirmation_template.md
- docs/templates/architecture_confirmation_template.md
- docs/templates/workflow_gate_review_template.md
- docs/templates/workflow_handoff_template.md

## Applies To
- platform-level product work
- subproject product work that depends on platform capability
- any work routed by the Virtual Product Chief
