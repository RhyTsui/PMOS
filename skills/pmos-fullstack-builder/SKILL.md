---
name: pmos-fullstack-builder
description: Use this skill whenever work moves from governed requirement/design outputs into real implementation, including frontend mother-repo scaffolding, CRUD package generation, API client wiring, service config, mock fallback, backend hookup preparation, and GitLab CI delivery closure.
---

# PMOS Fullstack Builder Skill

## Goal

Turn governed PMOS outputs into real, runnable implementation packages instead of stopping at PRD, design, or handoff.

## Scope

Use this skill when the task includes:

- frontend mother-repo setup
- CRUD feature package generation
- React + Ant Design + Ant Design X implementation
- API client / service-config / mock integration
- real API hookup preparation
- GitLab CI / delivery scripts
- repo bootstrapping for product validation

## Non-goals

Do not use this skill for:

- pure product planning with no implementation ask
- pure visual exploration with no delivery intent
- generic landing/demo generation

## Required Reading

1. `AGENTS.md`
2. `docs/operations/startup-whoami.md`
3. `docs/operations/product-workflow-total-design.md`
4. `docs/operations/ui-pmos-copilot-contract.md`
5. `docs/operations/frontend-style-default.md`
6. `docs/templates/ui_schema_spec_template.md`
7. `skills/pmos-ui/SKILL.md`

## Workflow

1. Confirm the upstream truth exists:
   - requirement
   - functional intent
   - UI/schema contract when frontend is involved
2. Identify the implementation lane:
   - frontend-only
   - frontend + API-ready
   - fullstack validation package
3. Build real code, not just docs.
4. Keep API boundaries explicit:
   - api-client
   - config
   - mock fallback
   - backend integration seam
5. Prefer reusable package structure over page-local hacks.
6. Preserve PMOS `chat-first + agent-controlled frontend` when building default entry surfaces.
7. Run delivery checks before treating implementation as complete.

## Delivery Rule

Implementation is not complete unless the current repo can show:

- runnable code
- stable scripts
- verification commands
- explicit unresolved blockers

## Required Verification

Run the strongest available subset of:

```bash
npm run lint
npm run typecheck
npm run test
npm run build
npm run ui:schema:check
npm run ui:lint
```

If a repo uses `pnpm`, adapt to `pnpm`.

## Output Contract

When closing a build task, report:

1. what runnable package was produced
2. what commands passed
3. what still blocks full closure
4. whether the original user requirement is solved / partial / unsolved

