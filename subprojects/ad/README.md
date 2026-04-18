# ad

Local Ads Flow Insight prototype.

## Stack

- Backend: FastAPI
- Frontend: React + Vite + ECharts
- Data: mock data only

## Backend

From `ad/`:

```bash
pip install -e .
ad
```

Backend runs at `http://127.0.0.1:8020`.

Useful endpoints:

- `GET /api/v1/health`
- `GET /api/v1/flow`
- `GET /api/v1/nodes/click/users`
- `GET /api/v1/users/u1/trace`

## Frontend

From `ad/frontend/`:

```bash
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5180`.

The Vite dev server proxies `/api` requests to the backend at `http://127.0.0.1:8020`.

## Docker Compose

From `ad/`:

```bash
docker compose up
```

## Notes

- The repo/package name stays `ad`.
- The UI title is `Ads Flow Insight`.
- Sankey nodes use canonical ids such as `click`, `filter`, `install`, `new_user`, and `old_device`.
