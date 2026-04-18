from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

from app.schema.native_gen import build_all_native_tools


class MCPTool(BaseModel):
    name: str
    description: str
    inputSchema: dict[str, Any]


class MCPListToolsResponse(BaseModel):
    tools: list[MCPTool]


class MCPToolCallRequest(BaseModel):
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class MCPToolCallResponse(BaseModel):
    content: str
    structuredContent: dict[str, Any] | None = None
    isError: bool = False



def list_native_mcp_tools() -> MCPListToolsResponse:
    tools = [
        MCPTool(name=tool.name, description=tool.description, inputSchema=tool.input_schema)
        for tool in build_all_native_tools()
    ]
    return MCPListToolsResponse(tools=tools)
