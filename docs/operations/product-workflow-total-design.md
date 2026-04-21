# Product Workflow Total Design

- version: v0.1
- date: 2026-04-20
- status: active
- scope: platform and all subprojects

## Purpose

This document is the platform-level product workflow source of truth for PMAIOS.
It defines how product work must move from raw input to formal output so multiple project PMs can work in parallel while the product chief provides top-level support and final convergence.

It complements, not replaces:

- `docs/memory/global-rules.md`
- `workflows/product-management.md`

Related implementation-oriented documents:

- `docs/operations/project-entry-contract.md`
- `docs/operations/ai-product-development-collaboration-loop.md`
- `docs/operations/cognition-ladder-and-intent-amplifier.md`
- `docs/operations/sidecar-deep-research-mechanism.md`
- `docs/operations/v0.5-implementation-index.md`

## Core Principle

Product work must follow this chain:

`information input -> research/interviews -> brainstorming -> cognition integration -> key point extraction -> decision -> output -> proactive sync`

The system must not jump directly from raw input to PRD or fixed solution design.

In addition, every project and every PM role must include a fixed questioning phase with the real product chief before major convergence.

## Primary Artifact Rule

For planning, research, architecture, workflow, and confirmation work, the default chief-facing artifact is now:

`SVG first, Markdown second`

This means:

- use SVG as the primary review artifact
- use Markdown as the detailed appendix or AI-readable companion
- prefer clickable SVG boards over long prose for convergence and confirmation
- default all AI product manager chief-facing outputs to SVG boards unless another delivery format is explicitly required

Authoritative visual policy:

- `docs/operations/svg-first-artifact-policy.md`

## Input Governance

## Idea-To-Implementation Rule

User ideas must not be converted directly into implementation by default.

Before implementation work starts, the responsible PM or agent should first convert the idea into a stronger working proposal through:

1. domain-driven refinement
2. industry best-practice scan
3. relevance and impact evaluation
4. boundary, dependency, and constraint clarification

Required outputs before execution:

- refined problem statement
- candidate implementation direction
- why this direction is relevant now
- expected impact
- known dependencies and risks

Hard rule:
Human-machine collaboration should not collapse into `idea -> immediate implementation`.
The correct path is:

`idea -> refinement -> assessment -> sync -> execution`

### Single Raw Input Source

`docs/sources/inbox/` is the only raw manual input source.

The following materials must enter `inbox` first:

- meeting notes
- interview notes
- business drafts
- external research
- manual conclusions
- user-provided documents

If a conclusion is not grounded in `inbox` or in a governed follow-up document, it must be treated as inference rather than fact.

### Input Weight

Inputs should be weighted in this order:

1. real interviews and confirmed business communication
2. meeting notes and user-provided source documents
3. external research and competitor/open-source materials
4. brainstorming outputs
5. model-generated suggestions without source backing

Brainstorming is allowed and encouraged, but only after real inputs exist.

## Standard Workflow

### 1. Information Input

Goal:
Collect raw materials without forcing premature conclusions.

Required outputs:

- input intake note or inbox registration
- source list
- initial problem framing

### 2. Research And Interviews

Goal:
Expand understanding before solution definition.

Required outputs:

- research note
- interview summary when applicable
- competitor and open-source comparison
- internal capability inventory when applicable

Hard rule:
If the project involves platform boundary, open-source selection, shared capability reuse, or uncertain product scope, research is mandatory before solution work.

### 3. Brainstorming

Goal:
Use existing inputs to expand possibilities, surface blind spots, and produce candidate directions.

Required outputs:

- candidate directions
- open questions
- assumptions to validate

Hard rule:
Brainstorming is not a substitute for research.

### 4. Cognition Integration

Goal:
Organize fragmented inputs into a coherent understanding of the problem space.

Required outputs:

- integrated understanding note
- domain map, capability map, or structured summary
- conflict list between sources

### 5. Key Point Extraction

Goal:
Extract the few issues that will actually affect product decisions.

Required outputs:

- key decision points
- boundary questions
- risk list
- fact / judgment / candidate / unknown classification

### 5.5 Fixed Questioning Phase

Goal:
Use a bounded written Q&A round to confirm understanding, expose hidden assumptions, and avoid silent guessing.

When it must happen:

1. after initial research but before major solution convergence
2. when project scope changes materially
3. when architecture or boundary is still ambiguous
4. when the PM or agent has more than a small number of unresolved assumptions

Required outputs:

- question list
- answers or pending answers
- what changed after confirmation
- remaining unknowns

Hard rule:
Every project PM, specialist PM, and virtual chief may have a fixed questioning round with the real product chief.
This is not optional politeness; it is part of the workflow.

Questioning rules:

1. questions must be written, not scattered in chat memory
2. questions should be grouped by theme
3. questions should distinguish:
   - confirmation question
   - open question
   - decision request
4. answers should be folded back into governed documents

Suggested default categories:

1. goal confirmation
2. boundary confirmation
3. priority confirmation
4. architecture or data constraints
5. non-goals
6. decision points needing chief judgment

### 5.6 Sidecar Deep Research

Goal:
Keep the main delivery line moving while allowing large topics to deepen through a linked research sidecar.

When it should happen:

1. the topic is likely to recur
2. the topic spans multiple subprojects or versions
3. the topic is strategic enough to benefit from deeper comparison
4. the user is likely to inject more physical-world information later

Required outputs:

- sidecar deep research note or document
- why it exists
- how it links back to the main flow
- what remains outside the current task

Hard rule:
Deep research should enrich the main flow, not freeze it.

### 6. Decision

Goal:
Let the chief or assigned reviewer make bounded written decisions.

Allowed decision statuses:

- `accepted`
- `accepted-with-constraints`
- `needs-more-research`
- `blocked-by-architecture`
- `rejected`

Decision outputs:

- decision note
- constraints
- next-stage permission or refusal

### 7. Output

Goal:
Convert approved decisions into governed product artifacts.

Possible outputs:

- research package
- architecture confirmation
- product solution comparison
- PRD
- page list
- user flow
- delivery plan
- AI product-development collaboration package when the project is moving through demo -> implementation -> testing -> release loop

Default presentation rule for early and mid-stage outputs:

- produce an SVG primary artifact first
- then add Markdown only if detailed backup is necessary

Examples:

- `project-board.svg`
- `roadmap-board.svg`
- `decision-board.svg`
- version-scoped requirement package
- AI product-development collaboration package

- research summary -> `research-map.svg`
- project overview -> `project-board.svg`
- architecture confirmation -> `planning-board.svg` or `architecture-board.svg`
- chief confirmation -> `decision-board.svg`
- workflow design -> `workflow-board.svg`

Hard rule:
If research or architecture confirmation is incomplete, outputs must stay at:

- candidate directions
- risks
- missing information
- research recommendations

They must not be presented as final solution, final architecture, or final PRD.

### 8. Proactive Sync

Goal:
Ensure work is visible without waiting for the user to ask.

Required sync behavior:

- sync once after receiving a task and clarifying planned outputs
- sync after every first draft or major update
- sync blockers if no draft is ready within a reasonable working window

Each sync must state:

- what has been produced
- what is still missing
- current blockers
- what decision or input is needed next

Work that is not documented and synced is not considered submitted.

## Stage Gates

The mandatory platform stage gates remain:

1. Problem Definition
2. Research Analysis
3. Architecture Confirmation
4. Product Solution
5. PRD And Prototype
6. Delivery Planning

Detailed gate contracts are governed by `workflows/product-management.md`.

This total design adds the human/agent operating rules around those gates:

- all project work starts from `inbox`
- all early-stage work must tolerate uncertainty
- all product documents must distinguish `fact / judgment / candidate / unknown`
- all subprojects must support proactive sync and written review
- all planning and confirmation flows should prefer SVG-first visual artifacts

## Roles And Responsibilities

### Real Product Chief

Responsible for:

- platform-level principles
- business direction and top-level support
- architecture and boundary judgment
- final convergence on cross-project questions

Not responsible for:

- routinely writing every project first draft

### Virtual Product Chief / Product Chief

Responsible for:

- workflow governance
- stage judgment
- task distribution
- review and rejection
- escalation of cross-boundary issues

### Project Product Manager / Specialist PM

Responsible for:

- project research execution
- first drafts
- requirement organization
- issue lists
- proactive sync

## Parallel Execution Rules

To allow multiple project PMs to work simultaneously:

1. the platform defines one common workflow
2. each subproject maintains its own project execution sheet or equivalent
3. project PMs produce first drafts in parallel
4. the chief reviews, constrains, and converges instead of rewriting everything
5. takeover happens only when a project remains blocked or submission quality repeatedly fails

## Submission Contract

Every stage artifact should include, at minimum:

1. core conclusion
2. evidence sources
3. uncertainty
4. impact scope
5. questions needing higher-level decision

Early-stage documents must explicitly separate:

- fact
- judgment
- candidate
- unknown

## Document-First Rule

Formal results must be delivered as documents first, not only as terminal replies.

Preferred artifact forms:

- markdown documents
- PDF-ready markdown source documents
- governed templates under `docs/`

Terminal replies are summaries, not the authoritative record.

For AI PM work, the preferred entry artifact is now a governed SVG board whenever the task is about planning, research, workflow, confirmation, or status review.

### Internal vs Delivery Layering

Documents must be layered by audience.

#### Internal Process Documents

These may be detailed and are meant for:

- research
- reasoning
- tradeoff recording
- issue surfacing
- intermediate alignment

They may contain:

- detailed source mapping
- long-form rationale
- unresolved branches
- alternative options

#### Delivery Documents

These are for downstream developers, managers, or users.
They must be concise and only carry the core content needed for action or decision.

They should emphasize:

- goal
- scope
- final conclusion
- action items
- risks
- decisions needed

They should avoid:

- long background narrative
- internal reasoning trails
- duplicated research detail

When a delivery document is required, it should still be paired with a concise SVG overview whenever practical.

Hard rule:

1. internal process documents may be detailed
2. delivery documents must be brief
3. delivery documents should be derived from internal documents, not written as unrelated parallel drafts

## New-Domain vs Existing-Domain Routing

Projects should be judged before workflow intensity is selected.

### New-Domain Work

Characteristics:

- best practice is still unclear
- product boundary is still unclear
- open-source and competitor landscape still matters
- user or business assumptions are still unstable

Default mode:

- research-heavy
- multi-angle analysis
- candidate directions only

### Existing-Domain Work

Characteristics:

- stable context already exists
- only incremental planning or scoped extension is needed

Default mode:

- faster movement toward solution, PRD, and delivery

If there is doubt, route to research first.

## Multi-Angle Analysis Requirement

Before major decisions, product work should examine as many relevant angles as needed, such as:

- industry best practices
- competitors and open-source
- user and business scenarios
- architecture boundaries
- organization and collaboration
- data and metrics
- governance and risk

The goal is not to maximize the number of opinions, but to maximize decision quality through broader视野 and fuller context.

## Relationship To Sample Projects

`knowledge-base` is the current workflow sample project because it already has:

- project execution workflow
- PM task sheet
- proactive sync requirement
- research-first gating

Other subprojects should be checked against this platform design and gradually aligned.

## Enforcement

A subproject is not considered aligned unless it can answer these questions in writing:

1. where raw input enters
2. what stage it is currently in
3. who owns first drafts
4. who owns review
5. what counts as a submission
6. what sync is required
7. what gate must be passed before solution or PRD work

The platform adoption state for each subproject is tracked separately in:

- `docs/operations/subproject-product-workflow-adoption-checklist.md`
