# ad

Local Android integration PoC workbench for the first-round `巨量 × 指间山海` path.

## Stack

- Backend: FastAPI
- Frontend: React + Vite
- Data: mock PoC data only

## Backend

From `ad/`:

```bash
pip install -e .
ad
```

Backend runs at `http://127.0.0.1:8021`.

Useful endpoints:

- `GET /api/v1/health`
- `GET /api/v1/integration-poc`

## Frontend

From `ad/frontend/`:

```bash
npm install
npm run dev
```

Frontend runs at `http://127.0.0.1:5180`.

The Vite dev server proxies `/api` requests to the backend at `http://127.0.0.1:8021`.

## Docker Compose

From `ad/`:

```bash
docker compose up
```

## Notes

- The repo/package name stays `ad`.
- The current default UI is the first-round Android integration workbench.
- The default scope is fixed to `巨量 × 指间山海 × 安卓已安装路径 × 启动+登录`.
