# Historical Artifact Immutability Policy

- date: 2026-05-11
- status: active
- owner: product office

## Purpose

This policy defines which historical artifacts must remain immutable even after
the active PMOS runtime has migrated away from Claude-era contracts.

The goal is:

1. keep audit history honest
2. keep active truth clean
3. avoid rewriting past generated outputs just to remove old naming

## Immutable Historical Artifact Sets

The following paths are historical evidence, not active execution truth:

1. `docs/product-office/outputs/**`
2. `docs/memory/product-chief/reports/**`
3. `docs/memory/product-chief/outputs/**`
4. `docs/memory/mcp-context/session-state.json`
5. `docs/memory/chats/**`
6. `docs/memory/events/**`
7. `docs/memory/runs/**`

## Handling Rule

For these artifact sets:

1. do not rewrite old content just to rename historical `Claude` references
2. do not treat embedded old skill/provider names as active truth
3. do add directory-level or policy-level notes clarifying their historical status
4. do migrate active rules, active skills, and active startup paths elsewhere

## Current Claude-era Interpretation Rule

If a historical artifact still contains:

- `claude-design-system`
- `.claude/commands/*`
- `defaultProvider = claude`
- `toolIdentity = claude`

that should be read as:

`historical execution evidence from an old runtime phase, not a current PMOS instruction`

## Active Truth Override

Current active truth for executor/runtime/design baseline is:

1. `AGENTS.md`
2. `docs/operations/startup-whoami.md`
3. `docs/operations/current-version-progress.md`
4. `docs/operations/pmaios-ant-design-family-frontend-design.md`
5. `docs/operations/claude-to-codex-cutover-and-removal.md`

## User Requirement Back-Check

- original user requirement: 迁移到 Codex 后删掉 Claude
  - current state: `partial-strong`
  - why: active chain has been cut over and Claude local state deleted, while immutable historical artifacts are intentionally preserved as audit evidence
