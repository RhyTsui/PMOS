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
3. Confirm `/api/portfolio` returns data in the network panel

Workflow:

1. Initialize a run from the UI or `POST /api/runs`
2. Advance the run
3. Confirm artifacts, review, and metrics endpoints return data

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
