# Product Workflow Total Design

- version: v0.3
- date: 2026-05-12
- status: active
- scope: platform and all subprojects

## Purpose

This document defines the platform-level product workflow truth for PMOS.
It explains how product work moves from raw input to governed delivery so multiple PM / specialist roles can work in parallel without letting frontend output drift into demos or confirmation drafts.

It complements:

- `docs/memory/global-rules.md`
- `workflows/product-management.md`
- `docs/operations/sdd-superpowers-testing-protocol.md`

## Core Principle

Product work must follow this chain:

`information input -> research/interviews -> brainstorming -> cognition integration -> key point extraction -> decision -> output -> proactive sync`

The system must not jump directly from raw input to PRD or implementation.

## Workflow Mainline

The mandatory platform stage gates are:

1. research document
2. planning document
3. requirement document
4. functional specification
5. design document
6. frontend page
7. data schema
8. backend API
9. integration and acceptance

Detailed gate contracts are governed by `workflows/product-management.md`.

## Frontend Final-Delivery Rule

The platform no longer treats `simple version`, `UI/UX version`, or `static HTML confirmation draft` as the default frontend mainline.

The governed default is:

`requirement -> functional spec -> design -> ui-schema -> final delivery page`

Hard rules:

1. frontend output must be a final delivery page contract, not a demo or confirmation object
2. each production page must carry route, layout shell, target roles, and source/evidence refs when applicable
3. each governed page block must map to a concrete component binding
4. global frontend framework baseline defaults to `x.ant.design / Ant Design X`
5. foundational `Ant Design` components may still be used through governed bindings where needed
6. PMOS pages must define UISchema before React implementation work continues
7. PMOS pages must carry decision / approval / audit semantics when the page includes conclusions or risky actions

## PMOS UI Guardrail Layer

The platform treats anti-demo UI governance as part of the workflow itself.

Required method:

`UI contract -> UISchema -> registry-governed block selection -> implementation -> lint / schema checks`

This is a PMOS-wide method, not a vertical-project-only pattern.

Hard rules:

1. do not create demo workbenches, feature-showcase pages, flat card walls, or homepage workspace shells
2. do not use `Ant Design Pro` dashboard templates as delivery output
3. every governed page must declare `screenType`, `layout`, `regions`, and block semantics
4. pages with conclusions must carry evidence/source references
5. pages with risky actions must carry decision / approval / audit semantics
6. the unified PMOS home page must default to a single main chat, not dashboard-first control center or workbench shell

## Unified Home Page Direction

The PMOS unified home page should be treated as a chat-first surface.

Required shape:

- one main chat as the homepage body
- context, source, task, review, and runtime modules invoked only when needed
- no always-open secondary panel set on the home page
- agent actions can control those modules and their expansion path

Forbidden shape:

- equal-weight control-plane panels
- homepage-as-dashboard
- capability wall exposed before user intent is established

## Platform Chat Capability Rule

PMOS should provide a unified chat capability as a platform baseline.

This means:

- the platform home page defaults to chat-first
- governed subproject home pages also default to chat-first unless a stronger task-specific page is justified
- secondary surfaces should be invoked through the chat flow and agent actions
- standard chat-shell and dynamic-card building blocks should be reusable across platform and subprojects

## Artifact Rule

For planning, research, architecture, workflow, and confirmation work, the default chief-facing artifact is:

`SVG first, Markdown second`

For runtime-facing or human-reading delivery surfaces that need layout, interaction, live state, review, approval, dashboards, trace views, or workflow views, the default rendered surface is:

`HTML first, generated from schema / PMOS DSL / registered renderer`

For final frontend delivery, the governed object is a delivery-ready page contract plus executable implementation package. Raw HTML is not a production source of truth unless it has been converted into governed schema, component bindings, and verification evidence.

## SDD Testing Rule

The platform treats strict testing as a default delivery mechanism rather than an optional follow-up step.

Hard rule:

`spec -> implementation -> automated checks -> real browser regression -> final-state validation -> user review`

## Default Agent Completion Rule

PMOS should not stop at product and design lanes.

The default governed completion chain now needs six explicit lanes:

1. product governance
2. design / UI schema governance
3. architecture
4. fullstack builder
5. code review
6. testing acceptance

Interpretation:

- Product Chief and specialist product agents define the problem and output contracts.
- Design / UI agents define the UI/schema and experience contract.
- Architecture agents define implementation boundaries, irreversible decisions, and integration seams before coding starts.
- Fullstack builder turns those contracts into runnable implementation.
- Code review agents validate the change set against architecture, requirement traceability, and regression risk.
- Testing acceptance blocks incomplete work before user review.

## Submission Contract

Every stage artifact should include:

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
