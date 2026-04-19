# Local Runbook

## Goal

Bring up PMAIOS locally, validate the main surfaces, and confirm the repository is in a shippable state.

## 1. Install And Validate

```bash
npm install
npm run lint
npm run test
npm run build
```

Expected result:

- `lint` passes
- `test` passes
- `build` emits frontend assets under `dist/` and backend JS under `dist/backend/`

## 2. Development Mode

```bash
npm run dev
```

This starts only the active frontend plus `src/backend/server.ts`. The older `src/server/index.ts` API surface is intentionally not part of the default web-console startup path.

Endpoints:

- Frontend: `http://localhost:5174`
- Backend: `http://localhost:4312`

## 3. Production-Like Mode

```bash
npm run build
npm start
```

Endpoint:

- Combined app and API: `http://localhost:4312`

## 4. Smoke Checks

API:

```bash
curl http://localhost:4312/api/health
```

UI:

1. Open `http://localhost:4312`
2. Confirm the React console loads
3. Confirm the `Workflow Ops` panel shows the current workflow run
4. Confirm the `Requirement + Version Desk` can ingest or manually create requirements
5. Confirm the `Portfolio` panel returns platform and subproject summaries
6. Confirm the `Product Agents` panel can bootstrap and display the current management hierarchy
7. Confirm the `Observability` panel filters timeline entries by source, status, stage, and search text
8. Confirm the `Capability Ops` panel can edit publish notes and roll back to a prior publishable version
9. Confirm the `DAG Impact` panel can refresh the graph, register a change event, and show dirty nodes plus run history
10. Confirm the `DAG Impact` panel can `Rerun Dirty` after a dirty-node change and that the workflow stage state advances
11. Confirm the `Retrieval Governance` panel can update mode, collection, topK, quality gate settings, trigger indexing, run governed search, and show gate pass/block details
12. Confirm the `Hermes Policy` panel shows enhance-only guardrails and policy checks for the current workflow run

Workflow:

1. Initialize a run from the UI or `POST /api/runs`
2. Advance the run
3. Confirm artifacts, review, and metrics endpoints return data
4. Confirm `Workflow Ops` can `Advance`, `Run Until Blocked`, `Resume`, and apply manual gate actions
5. Confirm the review panel shows gate status and blocks runs that do not include an open-source-first / build-vs-buy assessment

DAG and retrieval APIs:

```bash
curl http://localhost:4312/api/dag/graph
curl http://localhost:4312/api/dag/runs
curl http://localhost:4312/api/dag/changes
curl http://localhost:4312/api/retrieval/governance
curl http://localhost:4312/api/hermes/policy-reports
```

Governed retrieval search:

```bash
curl -X POST http://localhost:4312/api/retrieval/governance/search \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"workflow\"}"
```

DAG dirty-node rerun:

```bash
curl -X POST http://localhost:4312/api/dag/runs/<dagRunId>/rerun \
  -H "Content-Type: application/json" \
  -d "{\"workflowRunId\":\"<workflowRunId>\",\"runUntilBlocked\":true}"
```

Hermes current-run policy:

```bash
curl http://localhost:4312/api/runs/<workflowRunId>/hermes-policy
```

## 5. Docker

```bash
docker compose up --build
```

Endpoint:

- `http://localhost:4312`

If Docker Hub is unstable in your environment, compose defaults `NODE_IMAGE` to `docker.m.daocloud.io/library/node:22-alpine`. Override it when needed:

```bash
NODE_IMAGE=node:22-alpine docker compose up --build
```

## 6. Optional Integrations

Create `.env` from `.env.example` when enabling:

- Google AI Studio / Gemini
- Anthropic
- Notion
- custom provider base URLs

## 7. Known Non-Blocking Behavior

- If Chroma is not running at `http://localhost:8000`, PMAIOS logs a warning and uses in-memory vector collections instead.
