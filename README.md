# PMAIOS v0.4

PMAIOS is a file-driven local AI operating system for product management and software delivery. It keeps workflow definitions, project memory, requirements, capabilities, review outputs, product-agent skills, and subproject state inside the repository, then exposes them through a local backend, frontend, and CLI.

The current v0.4 focus is a Product Management AI OS / product-agent runtime: daily project PM outputs, product skills, design/documentation skills, external source intake, and governed Product Chief review.

## What Is In This Repo

- `src/backend`: Express API for workflow runs, chats, capabilities, requirements, versions, observability, providers, product skills, connectors, and MCP metadata.
- `src/frontend`: React console for inspecting runs, artifacts, chat context, review gates, project PM outputs, skills, and connector status.
- `src/cli`: local CLI entrypoint for repository-native operations.
- `src/core`: workflow runtime, persistence, provider routing, review logic, memory, product-agent services, external connectors, and Product Chief orchestration.
- `workflows`, `prompts`, `docs`, `skills`, `config`: repository source-of-truth artifacts.
- `subprojects`: business project overlays with isolated memory and workflow outputs.

## Current Delivery Status

- Project PM outputs are generated through governed Product Chief workflows with specialist tasks and deterministic multi-agent review artifacts.
- Product, design, and documentation skills are surfaced through the backend and frontend for daily product work.
- External intake supports Notion/Figma status checks, web page fetch into the source inbox, and DingTalk meeting-note paste/import with normalization.
- TypeScript frontend and backend build successfully.
- Vitest suite passes: `20` files, `72` tests.
- Backend can serve the built frontend from the same port in production mode.
- Chroma falls back to in-memory collections when the remote server is unavailable.

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

This starts only the active PMAIOS frontend and backend runtime. The legacy API entrypoint remains available via `npm run dev:api` and `npm run start:legacy-api` when you explicitly need it.

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
`docker-compose.yml` defaults `NODE_IMAGE` to `docker.m.daocloud.io/library/node:22-alpine` for environments where Docker Hub is unreliable. Override it if you want the standard upstream image:

```bash
NODE_IMAGE=node:22-alpine docker compose up --build
```

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

## Repository Layout

- `docs/`: architecture, decisions, implementation notes, templates, memory, and generated outputs
- `knowledge/`: weekly reports, meeting notes, and OKR source material
- `mcp/`: MCP contracts and examples
- `infra/`: infrastructure manifests
- `tests/`: unit and integration tests

## Operations Docs

- `docs/operations/local-runbook.md`: local startup and smoke-check steps
- `docs/operations/current-version-progress.md`: active v0.4 progress, acceptance status, and remaining work
- `docs/operations/pmaios-version-plan.md`: accepted version timeline and roadmap
- `docs/operations/external-connectors-status.md`: connector configuration and operational status
- `docs/operations/release-summary.md`: current delivery and verification summary
- `docs/operations/module-roadmap.md`: module ownership, priorities, and recommended completion order
- `docs/operations/ai-product-office-roadmap.md`: target operating model for the Virtual Product Chief and specialist product agents

## Notes

- `src/server/index.ts` is an older API surface kept in the repo, but the active runtime entrypoint used by `npm start`, `npm run dev:backend`, and the production build is `src/backend/server.ts`.
- Chroma remote mode is optional. If `http://localhost:8000` is unavailable, the project continues with in-memory vector collections for local testing.
- The frontend review inspector surfaces review gate status, blocking stage, and issue details for the selected run.
- `docs/templates/` includes AI-first product output templates for intelligence briefs, roadmap/version docs, manuals, demos, learning guidance, ecosystem scans, and UI schema specs.
