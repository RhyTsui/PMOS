---
name: pmos-code-review
description: Use this skill whenever PMOS work needs governed incremental code review before acceptance, including correctness, regression, complexity, architecture conformance, requirement traceability, and review finding triage.
---

# PMOS Code Review Skill

## Goal

Make code review a first-class governed lane between implementation and testing acceptance.

## Scope

Use this skill when the task includes:

- review of the current implementation diff
- pre-acceptance code review
- regression and correctness review
- architecture conformance review
- requirement-trace review
- test-gap review

## Non-goals

Do not use this skill for:

- historical whole-repo audits
- broad refactoring ideas without a concrete change set
- final QA acceptance in place of testing

## Required Reading

1. `AGENTS.md`
2. `docs/operations/startup-whoami.md`
3. `docs/operations/product-workflow-total-design.md`
4. `docs/operations/pmos-fullstack-and-testing-agent-baseline.md`
5. relevant architecture / handoff / requirement truth
6. the actual changed code

## Workflow

1. Review the actual change set first, not the entire repo.
2. Check for:
   - correctness
   - behavioral regression
   - architecture drift
   - missing tests
   - requirement mismatch
   - complexity or maintainability risk
3. Separate findings into:
   - blocker
   - should-fix
   - optional follow-up
4. Prefer concrete file/line references and explicit failure modes.
5. Pass only when no blocker remains for current scope.

## Review Rule

Incremental code review is not historical debt review.

It should answer:

- is this change safe
- is this change correct
- does this change respect architecture and product contract
- what must be fixed before testing acceptance closes the work

## Output Contract

Every review should make explicit:

- reviewed scope
- blocker findings
- should-fix findings
- residual risks
- testing expectations
- pass / rework recommendation

## Output Classification

At close-out, report:

1. what was reviewed
2. blocker findings
3. non-blocking findings
4. residual risks
5. whether testing acceptance may proceed
