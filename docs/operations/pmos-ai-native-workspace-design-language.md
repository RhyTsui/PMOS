# PMOS AI Native Workspace Design Language

- status: active
- date: 2026-05-13
- scope: PMOS platform home shell, governed chat surfaces, agent workspaces, and derivative subproject AI-native pages

## Purpose

This document defines the current PMOS design-language truth for AI-native workspace surfaces.

It exists to resolve a recurring drift:

- `chat-first` gets implemented as a plain enterprise page with a chat area
- `workspace` gets misunderstood as an admin dashboard
- AI execution states stay hidden behind generic cards
- tool results escape the conversation flow and become a panel wall

PMOS should now be read as:

`an AI-native conversational workspace with governed product semantics`

not as:

- Ant Design Pro admin panel
- CRUD backend shell
- generic SaaS dashboard
- card-heavy enterprise console

## Refined Problem Statement

User requirement:

- PMOS should feel like a next-generation AI operating workspace
- the main interaction should be conversation
- agent execution, tool usage, approvals, evidence, and structured outputs should appear naturally around the conversation

Product requirement:

- keep the existing PMOS governance semantics
- keep `UISchema-first`, `evidence/source refs`, `approval/audit`, and `Ant Design X` baseline
- avoid regressing into dashboard-first, card-wall, or template-style admin delivery

Design judgment:

- `chat-first` remains correct
- but `enterprise delivery chat page` is no longer enough as the default visual target
- the new default is `AI Native Workspace`

## Product Position

PMOS default shell is:

`PMChat`

PMChat is:

- an intelligent operating interface
- a conversation-centered workspace
- an agent orchestration surface
- a structured AI output carrier
- a governed execution and approval environment

PMChat is not:

- a homepage dashboard
- a CRUD console
- a multi-card admin overview
- a visual poster for AI capability explanation

## Core Principles

### 1. Chat First

Conversation is the primary interaction layer.

Everything should be able to happen inside or directly around the chat stream:

- agent execution
- tool invocation
- workflow state
- approval gates
- human review
- structured outputs
- forms
- tables
- charts
- previews

The page should never feel like:

`an admin dashboard with a chat box`

It should feel like:

`an intelligent workspace powered by conversation`

### 2. Workspace, Not Dashboard

Avoid:

- dashboard grids
- summary-card walls
- heavy side menus
- equal-weight multi-panel first screens

Prefer:

- layered workspace composition
- contextual side panels
- floating or docked tool surfaces
- inline message expansion
- adaptive inspectors

The reference feel is closer to:

- ChatGPT Desktop
- Cursor
- Linear
- Notion AI
- Raycast
- Vercel AI Console

### 3. AI-Native Interaction

The UI must make AI activity visible:

- streaming responses
- thinking state
- planning state
- running state
- waiting state
- reviewing state
- failed state
- completed state
- tool calling
- realtime updates
- memory references
- task checkpoints

Agent actions are first-class UI entities, not hidden logs.

### 4. Componentized Output In Conversation

AI output is not plain text only.

Supported structured inline surfaces should include:

- workflow cards
- approval cards
- trace panels
- task trees
- charts
- tables
- code blocks
- markdown documents
- forms
- upload zones
- preview panels
- playground widgets
- `Ant Design X` capability blocks

Default rule:

- render them inline in the active conversation flow first
- escalate to drawer / side-sheet / inspector only when scope grows

### 5. Minimal But Dense

Avoid:

- oversized cards
- giant rounded shells
- low-information spacing

Prefer:

- compact density
- clear typography hierarchy
- soft separators
- layered depth
- readable contrast
- high information yield

### 6. Dark-First Visual Language

Default preferred direction:

- dark mode first
- soft contrast
- translucent layers
- weak borders
- restrained shadows
- blurred surfaces where useful
- restrained accent colors
- motion-based hierarchy

Avoid:

- bright enterprise blue dashboard styling
- colorful SaaS admin look
- generic Ant Design Pro visual residue

### 7. Context-Driven Layout

Recommended default layout:

- collapsible context sidebar
- central conversational workspace
- adaptive bottom input/composer
- dynamic right-side inspector
- inline expandable execution blocks
- floating tool panels only when needed

Desktop should feel like an operating system / creative IDE hybrid.

Mobile should stay conversation-first with stacked detail reveal.

### 8. Governance Must Stay Visible

AI-native does not cancel PMOS governance.

Any risky recommendation or action must still expose:

- `summary`
- `recommendedActions`
- `evidenceRefs` or `sourceRefs`
- `riskLevel`
- `approvalPolicy` or `requiresApproval`
- `auditRequired`

## Layout Contract

### Desktop

- left: collapsible context rail / session navigator
- center: primary conversation stream
- right: contextual inspector for evidence, approvals, traces, artifacts, or runtime state
- bottom: adaptive sender/composer

### Mobile

- primary chat flow
- inline status and actions
- bottom composer
- drawer-based evidence / approval / trace reveal

## Token Direction

Minimum token expectations for this design language:

- typography: modern sans stack, compact hierarchy, strong code/readability pairing
- spacing: dense but breathable, no oversized empty padding
- radius: restrained, avoid bloated rounded-rectangle styling
- border: weak separators over hard framing
- shadow: subtle depth, not floating marketing cards
- motion: short, purposeful transitions tied to streaming, expansion, and state change

## Hard Restrictions

Do not generate:

- admin dashboard
- CRUD-first layout
- summary-card wall
- feature grid
- hero section
- marketing CTA
- poster-style capability page
- template SaaS backend shell
- `Ant Design Pro` clone

## Priority And Tradeoff Judgment

Priority:

1. keep `chat-first`
2. upgrade shell identity to `AI Native Workspace`
3. preserve governance semantics
4. keep `Ant Design X` as implementation baseline

Tradeoff:

- PMOS should become more workspace-like and darker by default
- but it must not lose auditability, evidence visibility, or approval semantics
- therefore the target is not a pure consumer chat clone and not a traditional enterprise admin shell
- it is a governed AI-native workspace

## User Requirement Back-Check

- original user requirement: PMOS Chat Workspace Design Style / AI Native Workspace Design Language
- current result: `solved`
- why: the platform now has an explicit design-language truth that defines product identity, interaction model, visual direction, layout, restrictions, and governance compatibility
