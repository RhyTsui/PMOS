from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from ad.api.routes.flow import router as flow_router
from ad.api.routes.full_design import router as full_design_router
from ad.api.routes.health import router as health_router
from ad.api.routes.integration import router as integration_router
from ad.api.routes.users import router as users_router

app = FastAPI(title="Android Integration POC Workbench")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5180",
        "http://127.0.0.1:5180",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health_router, prefix="/api/v1")
app.include_router(flow_router, prefix="/api/v1")
app.include_router(integration_router, prefix="/api/v1")
app.include_router(full_design_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")
