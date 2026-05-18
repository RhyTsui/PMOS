---
name: pmos-testing-acceptance
description: Use this skill whenever PMOS work needs strict automated verification, acceptance gating, browser regression, anti-demo checks, CRUD flow validation, or CI-grade release readiness before user review.
---

# PMOS Testing Acceptance Skill

## Goal

Make testing and acceptance a first-class PMOS delivery lane instead of a manual afterthought.

## Scope

Use this skill when the task includes:

- lint / typecheck / test / build gating
- browser verification
- frontend anti-demo validation
- CRUD flow regression
- acceptance blocking / release readiness
- CI gate tightening

## Non-goals

Do not use this skill only to describe how testing should work.

It should produce:

- executable checks
- real failures
- concrete fixes or blockers

## Required Reading

1. `AGENTS.md`
2. `docs/operations/startup-whoami.md`
3. `docs/operations/product-workflow-total-design.md`
4. `docs/operations/sdd-superpowers-testing-protocol.md`
5. `docs/operations/ui-pmos-copilot-contract.md`
6. `skills/pmos-ui/SKILL.md`

## Workflow

1. Identify the acceptance target:
   - page
   - feature package
   - implementation handoff
   - release candidate
2. Run static gates first:
   - lint
   - typecheck
3. Run unit/integration tests next.
4. Run browser or workflow regression when relevant.
5. Fail closed:
   - if checks fail, do not treat the work as delivered
   - either fix or report the exact blocker

## Default Gate Chain

Use this order by default:

`spec -> implementation -> static checks -> behavior tests -> browser regression -> acceptance summary`

## Frontend Acceptance Rule

When frontend is involved, verify:

- not a landing/demo page
- UI contract is still respected
- critical CRUD flows really work
- empty/error/loading states are present
- risky actions are not silently ungated

## Preferred Commands

Run the strongest available subset of:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run ui:schema:check
npm run ui:lint
npm run verify:frontend-browser
npm run verify:frontend-delivery
```

If a repo uses `pnpm`, adapt to `pnpm`.

## Output Contract

Always report:

1. what was tested
2. what passed
3. what failed
4. whether user review should be blocked

