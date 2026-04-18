from __future__ import annotations

from typing import Any, Literal
from uuid import uuid4

from pydantic import BaseModel, Field

from app.catalog_loader import load_catalog
from app.cli.parser import ParsedCliCommand, parse_cli_command


Mode = Literal["native", "cli"]


class NormalizedRequest(BaseModel):
    mode: Mode
    operation_id: str
    canonical_params: dict[str, Any] = Field(default_factory=dict)
    raw_input: dict[str, Any]
    correlation_id: str = Field(default_factory=lambda: str(uuid4()))
    resolved_ids: dict[str, list[str] | str] = Field(default_factory=dict)



def normalize_native_request(tool_name: str, arguments: dict[str, Any]) -> NormalizedRequest:
    catalog = load_catalog()
    operation = catalog.operation_by_native_tool(tool_name)
    return NormalizedRequest(
        mode="native",
        operation_id=operation.id,
        canonical_params=dict(arguments),
        raw_input={"tool_name": tool_name, "arguments": arguments},
    )



def normalize_cli_request(command: str) -> tuple[NormalizedRequest, ParsedCliCommand]:
    parsed = parse_cli_command(command)
    normalized = NormalizedRequest(
        mode="cli",
        operation_id=parsed.operation_id,
        canonical_params=parsed.canonical_params,
        raw_input={"command": command, "tokens": parsed.tokens},
    )
    return normalized, parsed
