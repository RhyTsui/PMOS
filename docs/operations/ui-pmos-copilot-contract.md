# PMOS UI Copilot Contract

- status: active
- date: 2026-05-12
- scope: PMOS platform and governed subprojects

## Purpose

This document defines the PMOS-wide frontend contract for AI copilot pages, requirement / PRD / task surfaces, and decision / approval flows.

It exists to stop frontend output from drifting into:

- demo pages
- poster-style feature showcases
- Claude-style flat card walls
- generic AI SaaS shells

## Product Identity

PMOS is the platform truth and operating system layer.

Its outward-facing default chat product shell should be treated as `PMChat`.

Its UI should organize:

- context
- workflow stage
- evidence
- recommendations
- decisions
- approvals
- execution tracking

It should not organize the page around marketing copy or dashboard habits.

## Default Paradigm

`chat-first + agent-controlled frontend` is the default PMOS interaction paradigm.

Interpretation:

- PMOS should provide one unified and complete chat capability
- the default home shell should be treated as `PMChat`
- the PMOS home page should default to chat-first
- governed subprojects should also default to chat-first unless a task truly requires a dedicated structured page
- agents should control when frontend detail surfaces appear, expand, or switch state
- cards, drawers, side sheets, and dynamic surfaces should serve the chat flow instead of competing with it

## Default Interaction Model

The default governed PMOS home page is a chat-first surface.

Desktop default:

- single primary chat surface
- detail / review surfaces only when invoked

Mobile default:

- stacked chat flow
- compact review / approval flow

## Home Page Rule

The unified PMOS home page should use:

- primary region: one main chat
- secondary capabilities: hidden by default
- default state: focused, minimal, task-in-progress
- expansion model: drawer / side sheet / inline expansion only when needed

The unified home page should not use:

- dashboard-first layout
- full-panel control center as the first impression
- permanently expanded capability walls
- equal-weight multi-panel homepage composition
- visible homepage module matrix
- admin-console / CRUD workbench / command-center framing

## Current Delivery Rule

Current stage:

- new governed pages must define UISchema first
- React implementation comes after the UISchema contract is explicit
- pages must declare `screenType`, `layout`, `regions`, evidence / source refs, and decision / approval semantics

Future stage:

- PMOS may converge to a schema-renderer mainline
- this repository should not pretend that renderer chain is already complete

## Anti-Demo Rules

Do not generate:

- landing page
- hero section
- poster card
- feature grid
- feature showcase
- marketing CTA
- glassmorphism
- decorative gradient shell
- fake dashboard
- flat card wall without workflow semantics
- homepage-wide panel explosion
- control-plane-first homepage framing

## Decision And Audit Rules

Any high-impact action must carry:

- `riskLevel`
- `approvalPolicy` or `requiresApproval`
- `auditRequired`
- evidence / source references when applicable

Any block that claims a conclusion should link to:

- `evidenceRefs`
- `sourceRefs`
- `lastUpdatedAt` or explicit freshness information

## Design-System Baseline

- `x.ant.design / Ant Design X ecosystem` is the preferred AI copilot UI baseline
- `Ant Design` may be used as the foundational component layer
- `Ant Design Pro` is isolated-adapter only
- do not use generic `Ant Design Pro` dashboard templates as PMOS delivery output

This is not accidental.

The PMOS default paradigm is aligned with the Ant Design X design philosophy:

- chat-first interaction
- benchmark-chat interaction
- X Card / dynamic card surface
- governed AI conversation and agent action patterns

## Benchmark Chat Rule

The target is not a traditional admin workbench.

The target is a governed AI-native workspace centered on a benchmark chat that can later generate many governed derivative chats.

Therefore:

- prioritize one clean main chat over multi-panel composition
- prefer line separation over stacked framed boxes
- keep secondary surfaces invoked, folded, and typed
- do not let PMOS naming drag the visible shell back into platform-console aesthetics
- allow the shell to feel closer to an operating workspace than a classic enterprise page

## Standard Capability Rule

PMOS should standardize reusable frontend capability blocks for rapid invocation, including:

- unified chat shell
- agent action / control card
- dynamic surface card
- source / evidence expansion panel
- approval / review drawer

These should be treated as platform-standard components or schema blocks, not one-off page inventions.

Current default standard set should cover the Ant Design X family as completely as practical, including:

- main chat shell
- welcome / starter prompts
- conversations
- bubbles
- sender
- suggestion
- attachments
- actions
- think
- thought chain
- sources
- code highlighter
- file card
- folder
- mermaid
- browser notification
- X Markdown
- X SDK transport primitives
- X Card dynamic surfaces

PMOS should prefer building these once as governed defaults, then reusing them across the platform and subprojects.

## RICH Component Taxonomy

PMOS should organize Ant Design X components by RICH-native interaction stage instead of treating them as a flat toolbox.

Default mapping:

- common:
  - `Bubble`
  - `Conversations`
  - `Notification`
- wake-up:
  - `Welcome`
  - `Prompts`
- expression:
  - `Sender`
  - `Attachment`
  - `Suggestion`
- confirmation:
  - `Think`
  - `ThoughtChain`
- feedback:
  - `Actions`
  - `FileCard`
  - `Sources`
  - `CodeHighlighter`
  - `Mermaid`
  - `Folder`
- global:
  - `XProvider`

PMOS interpretation:

- homepage default is `Bubble + Sender + Suggestion`
- session navigation uses `Conversations`
- after a real user question, the assistant may expand `Think / ThoughtChain / Sources / Actions`
- typed result surfaces should then use `CodeHighlighter / Mermaid / FileCard / Folder`
- global theme, locale, and runtime shell consistency stay under `XProvider`

This means PMOS should not expose every capability at once.

The default chain is:

`wake-up -> expression -> confirmation -> feedback`

The user first enters through chat, then the agent decides whether to reveal evidence, actions, cards, code, diagrams, or file structures.

## Home Demo Rule

When the homepage exposes component demos or capability previews:

- they should be invoked through `Suggestion`
- they should render inside the active assistant reply
- they should not sit as permanently expanded surfaces below the chat
- `ThoughtChain` and `Sources` should stay collapsed by default and only appear after a real question

These previews are not throwaway demos.

They are part of PMOS platform capability:

- governed component discovery
- interaction review in context
- design/development alignment through real component invocation
- rapid validation of RICH interaction stages inside the main chat

## Module Exposure Rule

Requirement, PRD, task, review, runtime, and audit modules should be exposed progressively.

Default behavior:

- the chat stays visible
- secondary modules stay hidden unless invoked
- users open supporting modules only when the active task needs them

Do not flatten all modules onto the home page at once.

## Required Reading For Governed UI Tasks

1. `AGENTS.md`
2. `docs/operations/frontend-style-default.md`
3. `docs/operations/uiux-stack-baseline.md`
4. `docs/operations/product-workflow-total-design.md`
5. `docs/operations/pmos-ai-native-workspace-design-language.md`
6. this file
7. `docs/templates/ui_schema_spec_template.md`
8. `src/ui-schema/registry.ts`
