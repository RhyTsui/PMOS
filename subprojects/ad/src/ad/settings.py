from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_ENV_FILE = REPO_ROOT / ".env.pre.local"


def _load_env_file(env_path: Path) -> None:
    if not env_path.exists():
        return

    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)


@dataclass(frozen=True)
class XiaoQiaoSingleDatabaseSettings:
    enabled: bool
    db_type: str
    host: str
    port: str
    name: str
    schema: str
    user: str
    password: str
    charset: str
    ssl_mode: str
    database_url: str

    @property
    def is_configured(self) -> bool:
        if self.database_url:
            return True
        required = [self.db_type, self.host, self.port, self.name, self.user]
        return all(bool(item) for item in required)


@dataclass(frozen=True)
class XiaoQiaoDatabaseSettings:
    env: str
    mysql: XiaoQiaoSingleDatabaseSettings
    sr2: XiaoQiaoSingleDatabaseSettings
    data_platform_host: str
    data_platform_port: str
    data_platform_user: str
    data_platform_password: str
    warehouse_name: str

    @property
    def is_configured(self) -> bool:
        return self.mysql.is_configured or self.sr2.is_configured


@dataclass(frozen=True)
class AiadMonitorMcpSettings:
    server_token: str
    upstream_url: str
    upstream_bearer_token: str
    upstream_app_id: str


def _load_single_database_settings(prefix: str, default_type: str = "") -> XiaoQiaoSingleDatabaseSettings:
    return XiaoQiaoSingleDatabaseSettings(
        enabled=os.getenv(f"{prefix}_ENABLED", "false").lower() == "true",
        db_type=os.getenv(f"{prefix}_DB_TYPE", default_type),
        host=os.getenv(f"{prefix}_HOST", ""),
        port=os.getenv(f"{prefix}_PORT", ""),
        name=os.getenv(f"{prefix}_DB_NAME", ""),
        schema=os.getenv(f"{prefix}_DB_SCHEMA", ""),
        user=os.getenv(f"{prefix}_USER", ""),
        password=os.getenv(f"{prefix}_PASSWORD", ""),
        charset=os.getenv(f"{prefix}_CHARSET", "utf8mb4"),
        ssl_mode=os.getenv(f"{prefix}_SSL_MODE", ""),
        database_url=os.getenv(f"{prefix}_DATABASE_URL", ""),
    )


def load_xiaoqiao_database_settings(env_file: Path | None = None) -> XiaoQiaoDatabaseSettings:
    _load_env_file(env_file or DEFAULT_ENV_FILE)
    return XiaoQiaoDatabaseSettings(
        env=os.getenv("XIAOQIAO_ENV", "local"),
        mysql=_load_single_database_settings("XIAOQIAO_MYSQL", default_type="mysql"),
        sr2=_load_single_database_settings("XIAOQIAO_SR2"),
        data_platform_host=os.getenv("XIAOQIAO_DATA_PLATFORM_HOST", ""),
        data_platform_port=os.getenv("XIAOQIAO_DATA_PLATFORM_PORT", ""),
        data_platform_user=os.getenv("XIAOQIAO_DATA_PLATFORM_USER", ""),
        data_platform_password=os.getenv("XIAOQIAO_DATA_PLATFORM_PASSWORD", ""),
        warehouse_name=os.getenv("XIAOQIAO_WAREHOUSE_NAME", ""),
    )


def load_aiad_monitor_mcp_settings(env_file: Path | None = None) -> AiadMonitorMcpSettings:
    _load_env_file(env_file or DEFAULT_ENV_FILE)
    return AiadMonitorMcpSettings(
        server_token=os.getenv("AIAD_MONITOR_MCP_SERVER_TOKEN", ""),
        upstream_url=os.getenv("AIAD_MONITOR_UPSTREAM_URL", ""),
        upstream_bearer_token=os.getenv("AIAD_MONITOR_UPSTREAM_BEARER_TOKEN", ""),
        upstream_app_id=os.getenv("AIAD_MONITOR_UPSTREAM_APP_ID", ""),
    )
