# PMOS Operator Guide

- version: `v1.0`
- date: `2026-05-09`
- status: `active`

## Purpose

这份文档给第一次接手 `PMOS product repo` 的操作者使用。

## First Reading Order

1. `README.md`
2. `docs/operations/pmaios-introduction.md`
3. `docs/operations/platform-truth-source-index.md`
4. `docs/operations/current-version-progress.md`
5. `docs/deployment/first-run.md`
6. `docs/deployment/environment-variables.md`
7. `docs/deployment/api-overview.md`
8. `docs/operations/pmos-prompts-skills-agents-tools-zh-index.md`

## Daily Startup Path

1. 用 `.env.example` 创建 `.env`
2. 运行 `npm install`
3. 运行 `npm run lint`
4. 运行 `npm run build`
5. 运行 `npm run dev` 或 `npm start`
6. 检查 `/api/health`

## First Runtime Checks

1. `GET /api/health`
2. `GET /api/mcp-context/state`
3. `GET /api/task-ssot/state`
4. `GET /api/workflow`
5. `GET /api/proof-of-work/bundle`

## When PMOS v1.0 Moves Forward

如果另一会话继续推进 `v1.0`，产品仓建议按这个顺序回写：

1. `current-version-progress`
2. `direction / acceptance / gap`
3. `README / introduction / changelog`
4. `deployment / api / operator docs`
5. `prompts / skills / agents / tools` 中文索引和手册

## Common Trouble Spots

### 页面打不开

先查：

1. `npm run build`
2. `npm start`
3. `/api/health`

### 页面能开但状态空白

先查：

1. `GET /api/mcp-context/state`
2. `GET /api/task-ssot/state`
3. 当前 truth docs 是否已同步

### 不知道当前还差什么

先看：

1. `docs/operations/current-version-progress.md`
2. `docs/operations/v1.0-gap-list.md`
3. `CHANGELOG.md`

### 不知道运行资产在哪里

先看：

1. `docs/operations/pmos-prompts-skills-agents-tools-zh-index.md`
2. `docs/operations/pmos-prompt-zh-manual.md`

## Release Prep Read Order

1. `docs/operations/github-release-readiness-checklist.md`
2. `docs/operations/github-final-verification-checklist.md`
3. `docs/operations/github-repo-cutover-sequence.md`
4. `docs/operations/release-steps.md`
5. `CHANGELOG.md`
