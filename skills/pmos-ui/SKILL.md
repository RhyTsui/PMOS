---
name: pmos-ui
description: Use this skill whenever implementing PMOS frontend, page layout, UISchema, benchmark chat surfaces, requirement/PRD/task/approval pages, AI copilot interaction areas, or governed component mappings. Do not use it for generic landing pages.
---

# PMOS UI Skill

## Goal

Implement PMOS UI through governed contracts instead of free-form demo composition.

## Non-goals

Never implement:

- landing page
- hero section
- poster card
- feature grid
- showcase page
- Claude-style card wall
- fake AI SaaS dashboard
- standalone demo app

## Required Reading

1. `AGENTS.md`
2. `docs/operations/frontend-style-default.md`
3. `docs/operations/uiux-stack-baseline.md`
4. `docs/operations/product-workflow-total-design.md`
5. `docs/operations/ui-pmos-copilot-contract.md`
6. `docs/templates/ui_schema_spec_template.md`
7. `src/ui-schema/registry.ts`

## Workflow

1. Identify the target `screenType`.
2. Define or update UISchema first.
3. Use only registry-governed PMOS blocks.
4. If a block is missing, propose a component contract before implementation.
5. Keep `x.ant.design / Ant Design X ecosystem` as the preferred host baseline.
6. Use foundational `Ant Design` only through governed bindings.
7. Keep `Ant Design Pro` behind the isolated adapter boundary.
8. Run `npm run ui:schema:check` and `npm run ui:lint`.

## RICH Default Mapping

Treat Ant Design X as a staged interaction system, not a bag of widgets.

Default PMOS mapping:

- common: `Bubble`, `Conversations`, `Notification`
- wake-up: `Welcome`, `Prompts`
- expression: `Sender`, `Attachment`, `Suggestion`
- confirmation: `Think`, `ThoughtChain`
- feedback: `Actions`, `FileCard`, `Sources`, `CodeHighlighter`, `Mermaid`, `Folder`
- global: `XProvider`

Execution rule:

- homepage default starts from `Bubble + Sender + Suggestion`
- `ThoughtChain` and `Sources` should be collapsed by default
- code, diagram, file, and folder surfaces should render inside the active assistant reply
- do not place a permanent demo playground below the main chat unless a task explicitly requires it

## Naming Rule

- do not frame the home page as a workspace, workbench, or control plane
- treat the outward-facing benchmark chat surface as `PMChat`
- keep PMOS as the platform / repo truth name, not the homepage product shell name

## Current-Stage Rule

This repository is not yet fully schema-renderer-driven.

So for now:

- UISchema must come before React
- React must explicitly map back to `screenType`, regions, block semantics, and evidence / source / decision / approval contracts
