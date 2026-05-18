---
name: pmos-architecture-designer
description: Use this skill whenever PMOS work reaches pre-implementation architecture decisions, including boundary design, ADR-ready tradeoff analysis, integration seams, data ownership, irreversible choices, and architecture prerequisites before coding starts.
---

# PMOS Architecture Designer Skill

## Goal

Make architecture a governed pre-implementation lane instead of an implicit side effect of product or design work.

## Scope

Use this skill when the task includes:

- architecture prerequisites before implementation
- system boundary design
- service / module split
- integration seams
- data ownership and state ownership
- irreversible technical choices
- ADR-ready tradeoff documentation
- platform-vs-subproject placement decisions

## Non-goals

Do not use this skill for:

- pure visual design exploration
- straightforward coding tasks with no boundary or dependency decision
- post-hoc code review after implementation is already complete

## Required Reading

1. `AGENTS.md`
2. `docs/operations/startup-whoami.md`
3. `docs/operations/product-workflow-total-design.md`
4. `docs/operations/pmos-fullstack-and-testing-agent-baseline.md`
5. `docs/templates/workflow_handoff_template.md`
6. upstream requirement / functional / UI schema truth that triggered the work

## Workflow

1. Clarify the architecture decision surface:
   - what is being decided
   - what becomes expensive to change later
   - what external or cross-module dependencies exist
2. Define boundaries explicitly:
   - responsibility ownership
   - data ownership
   - API / event / contract seams
   - platform vs subproject placement
3. Compare at least one credible alternative.
4. Record tradeoffs:
   - complexity
   - operational cost
   - migration cost
   - testability
   - rollback difficulty
5. Produce an architecture-ready conclusion before builder execution starts.

## Default Output Contract

Architecture output should make these explicit:

- decision statement
- context and constraints
- chosen option
- rejected options
- module / service / runtime boundary
- integration contract
- known risks
- follow-up review points

## Rule

If architecture prerequisites are unclear, implementation-handoff is not ready for fullstack execution.

## Output Classification

At close-out, report:

1. what architecture decision was made
2. what boundaries were fixed
3. what alternatives were rejected
4. what remains uncertain
5. whether builder work may proceed
