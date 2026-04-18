from __future__ import annotations

from typing import Any

from pydantic import BaseModel

from app.schema.cli_gen import build_cli_tool_definition


class CliToolCallRequest(BaseModel):
    command: str


class MCPTool(BaseModel):
    name: str
    description: str
    inputSchema: dict[str, Any]


class MCPListToolsResponse(BaseModel):
    tools: list[MCPTool]



def list_cli_mcp_tools() -> MCPListToolsResponse:
    tool = build_cli_tool_definition()
    return MCPListToolsResponse(
        tools=[MCPTool(name=tool.name, description=tool.description, inputSchema=tool.input_schema)]
    )
