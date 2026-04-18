from __future__ import annotations

from pathlib import Path

from pydantic import BaseModel, Field

from app.catalog_loader import load_local_settings


class AppSettings(BaseModel):
    base_url: str = Field(default="https://v3cli-like.mcp")
    bi_base_url: str = Field(default="")
    bi_token: str = Field(default="")
    bi_app_id: str | int = Field(default="")
    bi_debug_env: str = Field(default="PROD")
    request_timeout_seconds: int = Field(default=30)
    execution_profile: str = Field(default="seed")
    eval_model_name: str = Field(default="not_configured")
    eval_model_status: str = Field(default="not_configured")
    log_root: str
    report_root: str

    @property
    def log_root_path(self) -> Path:
        return Path(self.log_root)

    @property
    def report_root_path(self) -> Path:
        return Path(self.report_root)



def get_settings() -> AppSettings:
    return AppSettings.model_validate(load_local_settings())
