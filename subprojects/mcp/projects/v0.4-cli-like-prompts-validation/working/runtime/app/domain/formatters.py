from __future__ import annotations

from typing import Any

from app.domain.normalize import NormalizedRequest



def render_markdown_result(
    request: NormalizedRequest,
    payload: dict[str, Any] | None = None,
    response_summary: dict[str, Any] | None = None,
    error: str | None = None,
) -> str:
    lines = [
        f"# {request.operation_id}",
        "",
        f"- mode: {request.mode}",
        f"- correlation_id: {request.correlation_id}",
    ]

    if request.canonical_params:
        lines.extend(["", "## canonical_params", "```json", _json_dump(request.canonical_params), "```"])

    if request.resolved_ids:
        lines.extend(["", "## resolved_ids", "```json", _json_dump(request.resolved_ids), "```"])

    if payload is not None:
        lines.extend(["", "## bi_payload", "```json", _json_dump(payload), "```"])

    if response_summary is not None:
        lines.extend(["", "## response_summary", "```json", _json_dump(response_summary), "```"])

    if error:
        lines.extend(["", "## error", error])

    return "\n".join(lines) + "\n"



def _json_dump(value: Any) -> str:
    import json

    return json.dumps(value, ensure_ascii=False, indent=2, sort_keys=True)
