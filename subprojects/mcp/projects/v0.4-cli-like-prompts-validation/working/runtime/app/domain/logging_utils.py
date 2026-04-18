from __future__ import annotations

from pathlib import Path
from typing import Any

from app.domain.formatters import render_markdown_result
from app.settings import get_settings



def append_log(mode: str, correlation_id: str, content: str) -> Path:
    settings = get_settings()
    log_dir = settings.log_root_path / mode
    log_dir.mkdir(parents=True, exist_ok=True)
    log_path = log_dir / f"{correlation_id}.md"
    log_path.write_text(content, encoding="utf-8")
    return log_path



def summarize_for_log(payload: dict[str, Any] | None, response: dict[str, Any] | None) -> str:
    return render_markdown_result(
        request=payload["request"],
        payload=payload.get("bi_payload") if payload else None,
        response_summary=response,
    )
