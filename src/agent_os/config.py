"""
PMAIOS v0.3.3 配置模块
"""
import os
from dataclasses import dataclass
from typing import Optional


@dataclass
class Config:
    """系统配置"""
    # Redis
    redis_host: str = os.getenv("REDIS_HOST", "localhost")
    redis_port: int = int(os.getenv("REDIS_PORT", 6379))
    redis_db: int = int(os.getenv("REDIS_DB", 0))

    # Worker Pool
    worker_pool_size: int = int(os.getenv("WORKER_POOL_SIZE", 10))
    worker_timeout: int = int(os.getenv("WORKER_TIMEOUT", 300))  # 5 分钟

    # Claude API
    claude_api_key: str = os.getenv("CLAUDE_API_KEY", "")
    claude_model: str = os.getenv("CLAUDE_MODEL", "claude-3-5-sonnet-latest")
    claude_max_tokens: int = int(os.getenv("CLAUDE_MAX_TOKENS", 2000))

    # LangGraph
    checkpoint_dir: str = os.getenv("CHECKPOINT_DIR", "./checkpoints")

    # Memory
    memory_dir: str = os.getenv("MEMORY_DIR", "./memory")
    chroma_dir: str = os.getenv("CHROMA_DIR", "./chroma_db")

    # Logging
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    log_file: str = os.getenv("LOG_FILE", "./agent_os.log")

    # Scheduler
    scheduler_interval: int = int(os.getenv("SCHEDULER_INTERVAL", 10))  # 秒

    @classmethod
    def from_env(cls) -> "Config":
        return cls()

    def validate(self) -> bool:
        """验证配置"""
        if not self.claude_api_key:
            raise ValueError("CLAUDE_API_KEY 环境变量必须设置")
        return True
