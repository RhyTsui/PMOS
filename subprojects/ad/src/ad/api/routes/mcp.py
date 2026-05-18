from __future__ import annotations

from uuid import uuid4

from fastapi import APIRouter, Header, HTTPException, Request
from fastapi.responses import JSONResponse, Response

from ad.mcp_monitor_service import (
    call_tool,
    get_initialize_result,
    get_mcp_server_token,
    get_tools_result,
)


router = APIRouter(prefix="/mcp", tags=["mcp"])
MCP_SESSION_HEADER = "Mcp-Session-Id"


def _verify_bearer_token(authorization: str | None) -> None:
    expected = get_mcp_server_token().strip()
    if not expected:
        raise HTTPException(status_code=500, detail="未配置 AIAD_MONITOR_MCP_SERVER_TOKEN")

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="缺少 Bearer token")

    provided = authorization.removeprefix("Bearer ").strip()
    if provided != expected:
        raise HTTPException(status_code=403, detail="MCP token 无效")


def _jsonrpc_error(request_id: object, code: int, message: object) -> JSONResponse:
    return JSONResponse(
        status_code=200,
        content={
            "jsonrpc": "2.0",
            "id": request_id,
            "error": {
                "code": code,
                "message": message if isinstance(message, str) else "MCP request failed",
                "data": message if not isinstance(message, str) else None,
            },
        },
    )


@router.post("/aiad-monitor")
async def handle_aiad_monitor_mcp(
    request: Request,
    authorization: str | None = Header(default=None),
) -> Response:
    _verify_bearer_token(authorization)

    try:
        envelope = await request.json()
    except Exception as exc:  # pragma: no cover - FastAPI JSON parse failure branch
        raise HTTPException(status_code=400, detail="请求体必须是 JSON") from exc

    if not isinstance(envelope, dict):
        raise HTTPException(status_code=400, detail="请求体必须是 JSON-RPC 对象")

    method = envelope.get("method")
    request_id = envelope.get("id")
    params = envelope.get("params") if isinstance(envelope.get("params"), dict) else {}

    if method == "initialize":
        return JSONResponse(
            status_code=200,
            content={
                "jsonrpc": "2.0",
                "id": request_id,
                "result": get_initialize_result(),
            },
            headers={MCP_SESSION_HEADER: str(uuid4())},
        )

    if method == "notifications/initialized":
        return Response(status_code=202)

    if method == "tools/list":
        return JSONResponse(
            status_code=200,
            content={
                "jsonrpc": "2.0",
                "id": request_id,
                "result": get_tools_result(),
            },
        )

    if method == "tools/call":
        tool_name = params.get("name")
        arguments = params.get("arguments") if isinstance(params.get("arguments"), dict) else {}
        try:
            result = call_tool(str(tool_name or ""), arguments)
        except HTTPException as exc:
            return _jsonrpc_error(request_id, -32000, exc.detail)
        return JSONResponse(
            status_code=200,
            content={
                "jsonrpc": "2.0",
                "id": request_id,
                "result": result,
            },
        )

    return _jsonrpc_error(request_id, -32601, f"不支持的方法: {method}")
