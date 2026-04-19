# Release Summary

## Scope

This delivery closes the PMAIOS local runtime loop across frontend, backend, CLI, workflow runtime, memory persistence, capabilities, and release-facing documentation.

## Related Docs

- `docs/operations/local-runbook.md`
- `docs/operations/module-roadmap.md`
- `docs/operations/ai-product-office-roadmap.md`

## What Changed

- Fixed repository-wide TypeScript breaks and restored `lint` to green.
- Restored the test suite and aligned old workflow/test inputs with the current schema layer.
- Added Chroma in-memory fallback so local testing does not depend on a running remote Chroma server.
- Normalized product-agent, memory, knowledge-reader, Notion, Gemini, and LangGraph compatibility edges.
- Enabled the backend to serve the built frontend in production mode from the same port.
- Aligned `Dockerfile`, `docker-compose.yml`, `.env.example`, `README.md`, and the local runbook with the real runtime entrypoints.
- Corrected `npm start` to use the built backend production entrypoint.
- Added an executable open-source-first review gate that blocks runs missing build-vs-buy evidence.
- Wired the frontend run inspector to display review gate decisions, blocking stage, and issue details.

## Verification

Executed successfully:

```bash
npm run lint
npm run test
npm run build
```

Observed results:

- `15` test files passed
- `57` tests passed
- frontend production assets emitted under `dist/`
- backend build emitted under `dist/backend/`
- smoke check passed for:
  - `GET /api/health`
  - `GET /`
- Docker Compose build and runtime smoke check passed:
  - image built successfully
  - container started successfully
  - `GET /api/health` returned `ok=true`
  - `GET /` returned `200`

## Runtime Endpoints

Development:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:4312`

Production-like local run:

- App + API: `http://localhost:4312`

Docker:

- App + API: `http://localhost:4312`

## Known Non-Blocking Items

- If Chroma is unavailable at `http://localhost:8000`, the app logs a warning and continues with in-memory vector collections.
- The `src/server/index.ts` entrypoint is still present as a legacy API surface, but the active runtime entrypoint is `src/backend/server.ts`.
- `docker-compose.yml` defaults `NODE_IMAGE` to `docker.m.daocloud.io/library/node:22-alpine` for environments where Docker Hub is not reliably reachable. Override it when upstream Docker Hub access is available.

## Suggested Commit Title

```text
feat: ship PMAIOS local runtime with passing build, tests, and release docs
```

## Suggested Commit Body

```text
- fix TypeScript, runtime, and schema compatibility issues across core services
- add offline Chroma fallback for local development and tests
- serve built frontend from backend in production mode
- align Docker, env template, README, and runbook with real entrypoints
- restore green verification across lint, test, build, and smoke checks
```

## Suggested PR Summary

```text
This PR turns the current PMAIOS repository into a locally shippable runtime:

- green lint / test / build
- backend-served production frontend
- aligned Docker and environment setup
- documented local runbook and release summary
- offline-safe Chroma behavior for local validation
```
