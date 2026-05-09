# Product Management Workflow

## Purpose

This workflow defines the built-in delivery chain for platform and subproject product work.

It prevents teams from:

- jumping straight to UI or code
- producing low-fidelity page placeholders as if they were delivery outputs
- inventing data/API semantics only after pages are already drawn

## Mandatory Stages

1. 调研文档
2. 规划文档
3. 需求文档
4. 功能文档
5. 设计文档
6. 前端页面
7. 数据表
8. 后端接口
9. 联调与验收

## Stage Contract

### 1. 调研文档

- objective: collect facts before proposing product structure or implementation
- required_inputs:
  - raw source materials
  - operator request
  - current project context
  - open-source and competitor candidates
- required_outputs:
  - research report
  - problem and scenario summary
  - open-source-first / build-vs-buy conclusion
  - risks and open questions
- owner: Research PM
- gate_to_next:
  - problem is clearly defined
  - at least one research round is completed
  - build-vs-buy evidence is recorded

### 2. 规划文档

- objective: turn research into version scope, milestones, and dependency order
- required_inputs:
  - research outputs
  - current project constraints
- required_outputs:
  - version plan
  - scope and out-of-scope definition
  - milestone and dependency plan
  - priority ordering
- owner: Planning PM
- gate_to_next:
  - scope and milestone path are explicit
  - delivery chain order is visible

### 3. 需求文档

- objective: convert planning into governed user and product requirements
- required_inputs:
  - planning outputs
  - user scenarios
  - stakeholder corrections
- required_outputs:
  - requirement document
  - user requirement vs product requirement mapping
  - acceptance criteria
  - requirement-pool landing or update
  - requirement-to-function breakdown matrix
- owner: Requirements PM
- gate_to_next:
  - key requirements are traceable
  - active corrections are absorbed into project rules when applicable
  - every important requirement is decomposed to function-level granularity

### 4. 功能文档

- objective: define modules, flows, states, and capability boundaries
- required_inputs:
  - approved requirements
  - scope and dependency decisions
- required_outputs:
  - functional specification
  - module responsibility definition
  - state and flow description
  - boundary and exception notes
  - core object model draft
  - function-to-api mapping
- owner: Solution PM
- gate_to_next:
  - downstream design and engineering can use the same contract
  - core entities, relationships, key states, and main input/output objects are already exposed before design work starts
  - each core function is decomposed to executable interface actions

### 5. 设计文档

- objective: define page inventory, information architecture, user flow, interaction flow, state design, and component constraints before frontend delivery
- required_inputs:
  - functional specification
- required_outputs:
  - page list
  - page responsibility breakdown
  - navigation and information architecture
  - key interaction flow and state design
  - design constraints and UI spec references
- owner: Product Designer
- gate_to_next:
  - core user path is represented
  - layout and navigation responsibility are visible
  - downstream frontend work can implement from this package without re-guessing the page meaning

### 6. 前端页面

- objective: produce delivery-grade, user-facing, interactive frontend page output instead of low-fidelity placeholder pages
- required_inputs:
  - design document
  - active UI spec or design-system baseline when available
- required_outputs:
  - delivery-grade page package
  - interaction state notes
  - component semantics
  - multimodal delivery manifest
- owner: Frontend Delivery Designer
- gate_to_next:
  - layout correctness is reviewable
  - module responsibility is reviewable
  - user flow and dynamic interaction are explicit
  - UI spec is actively applied, not only referenced
  - the page is implementable and integration-ready, not a document-like static layout

### 7. 数据表

- objective: convert product and page state into durable data structures
- required_inputs:
  - functional specification
  - frontend page state needs
- required_outputs:
  - entity and field definition
  - relation and index definition
  - audit / lifecycle notes
- owner: Data Architect
- gate_to_next:
  - data semantics support both frontend and backend contracts
  - this stage formalizes previously exposed object/state semantics; it is not the first time data is being designed

### 8. 后端接口

- objective: define API contracts against functionality and data schema
- required_inputs:
  - functional specification
  - data schema
  - frontend state expectations
- required_outputs:
  - API contract
  - error and permission semantics
  - integration preconditions
- owner: Backend Engineer
- gate_to_next:
  - core interfaces are ready for integration
  - this stage formalizes previously exposed interaction semantics; it is not the first time request/response behavior is being designed

### 9. 联调与验收

- objective: close the loop with integration verification and acceptance review
- required_inputs:
  - frontend page outputs
  - data schema
  - backend API contract
- required_outputs:
  - integration report
  - blocked item summary
  - acceptance review output
  - next-step or handoff conclusion
- owner: Delivery PM
- gate_to_next:
  - major flows are integrated
  - review can conclude pass or rework with traceable evidence

## Hard Rules

### Stage-Agent Orchestration Rule

The workflow must not treat all product stages as if they should be handled by the same generic operating mode.

Minimum rule:

- research stage prioritizes fact gathering and tradeoff discovery
- planning stage prioritizes scope, order, dependency, and milestone clarity
- requirements stage uses question-driven clarification and requirement-pool governance
- design stage prioritizes page structure, user flow, information architecture, and interaction/state contract
- frontend-page stage must output delivery-grade interactive pages instead of low-fidelity placeholders
- data-schema and backend-api stages must stay consistent with upstream functional semantics
- integration stage must prioritize real end-to-end closure rather than local document completeness

### Frontend Delivery Gate

The frontend page stage must be judged as a user-facing delivery output, not as a design placeholder.

Minimum rule:

- it must expose layout correctness
- it must expose module responsibility
- it must expose user flow
- it must expose dynamic interaction
- it must expose loading / empty / error / success feedback
- it must not stop at flat explanatory blocks or static documentation-like layouts

### UI Spec Activation Gate

If a project has an active UI specification or design-system baseline, frontend-page output and page rectification must read and apply that specification before modification work begins.

Minimum rule:

- active UI specs may not remain reference-only
- missing spec activation must be treated as a workflow warning, not a silent omission

### Repeat-Correction Absorption Rule

Repeated user corrections in the same project must not remain only inside chat history.

Minimum rule:

- repeated corrections should be promoted into project-level default rules or candidate platform rules
- same-class page and component work should inherit already-confirmed fixes by default

### Requirement Pool Gate

The workflow must not treat stakeholder feedback, meeting minutes, or user corrections as formally promoted unless they have first entered a project-level requirement-pool artifact.

Minimum rule:

- every active project must maintain a governed requirement-pool document
- important feedback must land there before it is considered accepted into plan, backlog, truth-source, or delivery tasks

### Research Gate

The workflow must not enter planning, requirements, or functional definition directly when any of the following apply:

- open-source base selection is involved
- competitor route comparison is involved
- platform capability or control-plane boundary is unclear
- multiple systems share responsibility for the final product
- permissions, prompts, knowledge, evaluation, runtime, or gateway capability boundaries are still assumptions

### Architecture / Functional Gate

The workflow must not enter design, frontend, data, or backend delivery until written functional definition exists when:

- the subproject depends on platform capabilities
- menu structure or module ownership is affected by platform architecture
- the project reuses shared permissions, prompt, knowledge, MCP, evaluation, gateway, or release capability

### Requirement Decomposition Rule

Requirements must be decomposed down to function level before the workflow may continue into design, frontend, data, or backend delivery.

Minimum rule:

- each important requirement must map to one or more concrete functions
- each function must have an explicit owner module or page responsibility
- each function must have an acceptance condition instead of only a business slogan
- requirement documents that stop at user-story or business-goal level are incomplete

### Function-To-API Decomposition Rule

Functions must be decomposed down to interface level before the workflow may present backend contract readiness.

Minimum rule:

- each core function must identify its trigger action, required data, and resulting system response
- each function must map to one or more API, event, or service contract candidates
- functions that cannot explain read/write action, error semantics, and permission semantics are not yet delivery-ready
- backend API output may formalize or refine that mapping, but must not invent core function semantics from scratch

### Output Downgrade Rule

If 调研文档、规划文档、需求文档、或功能文档 is incomplete, product agents may only output:

- candidate directions
- risks
- missing information
- research recommendations

They may not present:

- final frontend-page delivery decisions
- final data schema
- final backend contract
- final launch commitments

### Data And API Semantic Front-Loading Rule

Data semantics and API semantics must be exposed early and finalized later; they must not first appear only after pages are already drawn.

Minimum rule:

- 功能文档 must already expose the core object model:
  - entities
  - relationships
  - key states
  - main input/output objects
- design / frontend-page stages must already expose:
  - key data dependencies
  - interaction states
  - data-changing actions
  - empty / error / exceptional states that need backend cooperation
- 数据表 is for formal schema finalization, not first-pass data thinking
- 后端接口 is for formal contract finalization, not first-pass response thinking

## Required Templates

- docs/templates/business_confirmation_template.md
- docs/templates/architecture_confirmation_template.md
- docs/templates/workflow_gate_review_template.md
- docs/templates/workflow_handoff_template.md

## Applies To

- platform-level product work
- subproject product work that depends on platform capability
- any work routed by the Virtual Product Chief
