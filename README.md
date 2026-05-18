# PMAIOS v1.0

PMAIOS is a file-driven local AI operating system for product management and software delivery. It keeps workflow definitions, project memory, requirements, capabilities, review outputs, product-agent skills, and subproject state inside the repository, then exposes them through a local backend, frontend, and CLI.

The platform-level active product version is now `v1.0`. The current runtime baseline is a landed `v0.7` governed runtime that is being pushed into a deployable, collaborative, product-grade PM Agent system.

## PMAIOS Introduction

PMAIOS is not only a chat workspace. It is a repository-native product operating system that turns requirement intake, research, solution design, review, visual delivery, and documentation into governed assets.

The current design-delivery baseline is:

- use `image2` for visual design delivery
- require page-by-page prompt coverage before final image generation
- keep design, schema, handoff, and frontend contracts governable in repo truth sources

## Current Platform State

The landed `v0.7` runtime baseline already includes:

- SchedulerRun minimum automation
- Gate Runtime actionable controls
- requirement backwrite and design landing guardrails
- machine-readable UI schema contracts
- Hermes compare/promote minimum loop
- proof-of-work evidence bundles

To understand the current platform truth, start with:

1. `docs/operations/platform-truth-source-index.md`
2. `docs/operations/current-version-progress.md`
3. `docs/operations/pmaios-v1.0-direction.md`
4. `docs/operations/v1.0-product-version-program.md`
5. `docs/operations/v1.0-acceptance-standard.md`
6. `docs/operations/v0.7-minimum-loop-summary.md`

## What Is In This Repo

- `src/backend`: Express API for workflow runs, chats, capabilities, requirements, versions, observability, providers, product skills, connectors, and MCP metadata.
- `src/frontend`: React console for inspecting runs, artifacts, chat context, review gates, project PM outputs, skills, and connector status.
- `src/cli`: local CLI entrypoint for repository-native operations.
- `src/core`: workflow runtime, persistence, provider routing, review logic, memory, product-agent services, external connectors, and Product Chief orchestration.
- `workflows`, `prompts`, `docs`, `skills`, `config`: repository source-of-truth artifacts.
- `subprojects`: business project overlays with isolated memory and workflow outputs.

## Current Delivery Status

- PMAIOS has an active platform-level `v1.0` product narrative on top of a landed `v0.7` runtime baseline.
- Product, design, and documentation workflows are governed through repository truth sources.
- Design / schema / handoff / frontend downstream work is no longer intended to depend on screenshots or prose alone.
- Workspace surfaces already expose runtime, gates, proof-of-work, and related governance signals at minimum-loop level.
- The repository still contains older version docs and release snapshots, but they should be treated as historical or reference-only unless the platform truth index says otherwise.

## Local Development

Requirements:

- Node.js 22+
- npm

Install and validate:

```bash
npm install
npm run lint
npm run test
```

Run the dev stack:

```bash
npm run dev
```

This starts the active PMAIOS frontend and backend runtime. The legacy API entrypoint remains available via `npm run dev:api` and `npm run start:legacy-api` when you explicitly need it.

Default dev URLs:

- Frontend: `http://localhost:5174`
- Backend API: `http://localhost:4312`

The Vite dev server proxies `/api` to the backend automatically.

## Production-Like Local Run

Build everything:

```bash
npm run build
```

Run the built backend plus static frontend:

```bash
npm start
```

Default runtime URL:

- App + API: `http://localhost:4312`

## Docker

Build and run:

```bash
docker compose up --build
```

Container runtime URL:

- App + API: `http://localhost:4312`

The container builds the frontend, compiles the backend, and serves the static app from the backend process.

## Environment Variables

Create `.env` from `.env.example` when you need external integrations.

Common keys:

- `PORT`
- `AI_OS_ROOT`
- `GEMINI_API_KEY`
- `GEMINI_MODEL`
- `GOOGLE_AI_STUDIO_API_KEY`
- `AI_STUDIO_API_KEY`
- `ANTHROPIC_API_KEY`
- `ANTHROPIC_AUTH_TOKEN`
- `ANTHROPIC_BASE_URL`
- `NOTION_API_KEY`
- `NOTION_DATABASE_ID`
- `NOTION_PRD_DATABASE_ID`
- `NOTION_MEETING_NOTES_DATABASE_ID`
- `FIGMA_API_KEY`
- `WEB_FETCH_USER_AGENT`
- `DINGTALK_MEETING_IMPORT_MODE`

## Verification

Minimum acceptance commands:

```bash
npm run lint
npm run test
npm run build
```

Basic backend health check after startup:

```bash
curl http://localhost:4312/api/health
```

For the last documented local-runtime release snapshot, read:

- `docs/operations/release-summary.md`

## Operations Docs

- `docs/operations/platform-truth-source-index.md`: platform truth entry index
- `docs/operations/current-version-progress.md`: active platform runtime snapshot
- `docs/operations/pmaios-v1.0-direction.md`: current version direction
- `docs/operations/v1.0-product-version-program.md`: current product-version program
- `docs/operations/v1.0-acceptance-standard.md`: current product-version acceptance denominator
- `docs/operations/v0.7-minimum-loop-summary.md`: landed minimum-loop closeout
- `docs/operations/pmaios-version-plan.md`: accepted timeline and version discipline
- `docs/operations/module-roadmap.md`: module priorities and recommended continuation order
- `docs/operations/local-runbook.md`: local startup and smoke-check steps

## Notes

- `src/server/index.ts` is an older API surface kept in the repo, but the active runtime entrypoint used by `npm start`, `npm run dev:backend`, and the production build is `src/backend/server.ts`.
- Chroma remote mode is optional. If `http://localhost:8000` is unavailable, the project continues with in-memory vector collections for local testing.
- Platform version identity should be taken from the operations truth documents, not from subproject state or old release summaries.
