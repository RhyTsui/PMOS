from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from html import escape
from urllib.parse import quote
from typing import Any, Literal

from fastapi import FastAPI, Request, Response
from fastapi.openapi.docs import get_swagger_ui_html
from fastapi.responses import HTMLResponse, JSONResponse
from pydantic import BaseModel

from app.bi.client import BIAuthError, BIClientError, BIConfigError
from app.catalog_loader import load_catalog
from app.domain.resolvers import ResolutionError
from app.domain.validate import ValidationError
from app.eval.runner import (
    build_cli_command,
    execute_cli_case,
    execute_native_case,
    infer_expected_operation,
    infer_expected_params,
    run_evaluation_async,
)
from app.mcp.cli_server import CliToolCallRequest, list_cli_mcp_tools
from app.mcp.native_server import MCPListToolsResponse, MCPToolCallRequest, MCPToolCallResponse, list_native_mcp_tools
from app.schema.cli_gen import build_cli_tool_definition
from app.schema.native_gen import build_all_native_tools
from app import settings as settings_module


DIMENSION_DATA_KEYS = {
    "list_apps": "apps",
    "list_media": "media",
    "list_team": "teams",
}

JSON_RPC_VERSION = "2.0"
MCP_PROTOCOL_VERSION = "2025-06-18"
JSON_RPC_PARSE_ERROR = -32700
JSON_RPC_INVALID_REQUEST = -32600
JSON_RPC_METHOD_NOT_FOUND = -32601
JSON_RPC_INVALID_PARAMS = -32602


class JsonRpcRequestError(ValueError):
    def __init__(self, code: int, message: str):
        super().__init__(message)
        self.code = code
        self.message = message


class EvalRequest(BaseModel):
    csv_path: str | None = None
    target_service: Literal["mcp_only", "cli_only", "both"] = "both"
    execution_profile: Literal["seed", "live", "mixed"] | None = None


class PlaygroundRequest(BaseModel):
    mode: Literal["native", "cli"]
    tool_name: str | None = None
    arguments: dict[str, Any] | None = None
    command: str | None = None
    execution_profile: Literal["seed", "live", "mixed"] | None = None


class EvalCasePreview(BaseModel):
    case_id: str
    category: str
    query: str
    expected_operation_id: str | None = None
    expected_params: dict[str, Any] = {}
    suggested_cli_command: str | None = None


class CleanupArtifactsRequest(BaseModel):
    clear_reports: bool = True
    clear_logs: bool = True


app = FastAPI(
    title="cli-like prompts validation runtime",
    docs_url=None,
    redoc_url=None,
    openapi_url="/debug/openapi.json",
)


@app.get("/")
async def home() -> HTMLResponse:
    return HTMLResponse(_build_console_html())


@app.get("/docs")
async def delivery_docs() -> HTMLResponse:
    return HTMLResponse(_build_delivery_html())


@app.get("/reports")
async def report_list_page() -> HTMLResponse:
    return HTMLResponse(_build_generated_reports_html())


@app.get("/reports/files/{report_name}")
async def report_file_page(report_name: str) -> Response:
    report_path = _resolve_report_file(report_name)
    if report_path is None or not report_path.exists():
        return JSONResponse({"error": "report not found"}, status_code=404)
    return Response(report_path.read_text(encoding="utf-8"), media_type="text/markdown; charset=utf-8")


@app.post("/artifacts/cleanup")
async def cleanup_artifacts(request: CleanupArtifactsRequest) -> dict[str, Any]:
    deleted_reports = _clear_generated_artifacts(settings_module.get_settings().report_root_path) if request.clear_reports else []
    deleted_logs = _clear_generated_artifacts(settings_module.get_settings().log_root_path) if request.clear_logs else []
    return {
        "deleted_reports": deleted_reports,
        "deleted_logs": deleted_logs,
        "deleted_report_count": len(deleted_reports),
        "deleted_log_count": len(deleted_logs),
    }


@app.get("/mcp-tools")
async def mcp_tool_list_page() -> HTMLResponse:
    return HTMLResponse(_build_mcp_tool_list_html())


@app.get("/cli-tools")
async def cli_tool_list_page() -> HTMLResponse:
    return HTMLResponse(_build_cli_tool_list_html())


@app.get("/console")
async def console_page() -> HTMLResponse:
    return HTMLResponse(_build_console_html())


@app.get("/debug/docs")
async def debug_docs() -> HTMLResponse:
    return get_swagger_ui_html(openapi_url=app.openapi_url or "/debug/openapi.json", title="debug docs")


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/delivery/catalog")
async def delivery_catalog() -> dict[str, Any]:
    return _build_delivery_catalog()


@app.get("/eval/cases")
async def eval_cases_preview() -> dict[str, Any]:
    cases = _load_eval_case_previews()
    return {
        "csv_path": _default_eval_csv_path(),
        "count": len(cases),
        "cases": cases,
    }


@app.post("/eval/run")
async def eval_run(request: EvalRequest) -> dict[str, Any]:
    csv_path = request.csv_path or _default_eval_csv_path()
    summary, details, report_path = await run_evaluation_async(
        csv_path,
        target_service=request.target_service,
        execution_profile=request.execution_profile,
    )
    settings = settings_module.get_settings()
    return {
        "csv_path": str(csv_path),
        "summary": summary,
        "details": details,
        "report_path": str(report_path),
        "report_name": report_path.name,
        "report_url": _report_url(report_path.name),
        "report_markdown": Path(report_path).read_text(encoding="utf-8"),
        "evaluation": {
            "generated_at": datetime.now().isoformat(timespec="seconds"),
            "model_name": settings.eval_model_name,
            "model_status": settings.eval_model_status,
        },
    }


@app.post("/playground/run")
async def playground_run(request: PlaygroundRequest):
    if request.mode == "native":
        if not request.tool_name:
            return JSONResponse({"error": "tool_name is required for native mode"}, status_code=400)
        return await _execute_native_call(request.tool_name, request.arguments or {}, execution_profile=request.execution_profile)

    if not request.command or not request.command.strip():
        return JSONResponse({"error": "command is required for cli mode"}, status_code=400)
    return await _execute_cli_call(request.command, execution_profile=request.execution_profile)




@app.post("/mcp")
async def mcp_rpc(request: Request) -> Response:
    return await _handle_mcp_rpc(request, server_kind="native")


@app.post("/cli")
async def cli_rpc(request: Request) -> Response:
    return await _handle_mcp_rpc(request, server_kind="cli")


@app.get("/mcp/list-tools")
@app.post("/mcp/list-tools")
async def mcp_list_tools():
    return list_native_mcp_tools().model_dump(by_alias=True)


@app.get("/cli/list-tools")
@app.post("/cli/list-tools")
async def cli_list_tools():
    return list_cli_mcp_tools().model_dump(by_alias=True)


@app.post("/mcp/call-tool")
async def mcp_call_tool(request: MCPToolCallRequest):
    return await _execute_mcp_tool_call(request.name, request.arguments, server_kind="native")


@app.post("/cli/call-tool")
async def cli_call_tool(request: CliToolCallRequest):
    return await _execute_cli_call(request.command)


async def _handle_mcp_rpc(request: Request, server_kind: str) -> Response:
    try:
        payload = await request.json()
    except json.JSONDecodeError:
        return JSONResponse(_jsonrpc_error(None, JSON_RPC_PARSE_ERROR, "Parse error"), status_code=400)

    if not isinstance(payload, dict):
        return JSONResponse(_jsonrpc_error(None, JSON_RPC_INVALID_REQUEST, "Invalid Request"), status_code=400)

    request_id = payload.get("id")
    try:
        response_body = await _dispatch_mcp_rpc(payload, server_kind=server_kind)
    except JsonRpcRequestError as exc:
        status_code = 404 if exc.code == JSON_RPC_METHOD_NOT_FOUND else 400
        return JSONResponse(_jsonrpc_error(request_id, exc.code, exc.message), status_code=status_code)

    if response_body is None:
        return Response(status_code=202)

    return JSONResponse(response_body)


async def _dispatch_mcp_rpc(payload: dict[str, Any], server_kind: str) -> dict[str, Any] | None:
    if payload.get("jsonrpc") != JSON_RPC_VERSION:
        raise JsonRpcRequestError(JSON_RPC_INVALID_REQUEST, "jsonrpc must be '2.0'")

    method = payload.get("method")
    if not isinstance(method, str) or not method:
        raise JsonRpcRequestError(JSON_RPC_INVALID_REQUEST, "method is required")

    request_id = payload.get("id")
    params = payload.get("params")
    if params is None:
        params = {}
    if not isinstance(params, dict):
        raise JsonRpcRequestError(JSON_RPC_INVALID_PARAMS, "params must be an object")

    if method == "initialize":
        return _jsonrpc_result(request_id, _build_initialize_result(server_kind))
    if method == "notifications/initialized":
        return None
    if method == "tools/list":
        tools = list_native_mcp_tools() if server_kind == "native" else list_cli_mcp_tools()
        return _jsonrpc_result(request_id, {"tools": tools.model_dump(by_alias=True)["tools"]})
    if method == "tools/call":
        return await _handle_rpc_tool_call(request_id, params, server_kind=server_kind)

    raise JsonRpcRequestError(JSON_RPC_METHOD_NOT_FOUND, f"Method not found: {method}")


async def _handle_rpc_tool_call(request_id: Any, params: dict[str, Any], server_kind: str) -> dict[str, Any]:
    name = params.get("name")
    arguments = params.get("arguments")

    if not isinstance(name, str) or not name:
        raise JsonRpcRequestError(JSON_RPC_INVALID_PARAMS, "tools/call requires string param 'name'")
    if arguments is None:
        arguments = {}
    if not isinstance(arguments, dict):
        raise JsonRpcRequestError(JSON_RPC_INVALID_PARAMS, "tools/call requires object param 'arguments'")

    response = await _execute_mcp_tool_call(name, arguments, server_kind=server_kind)

    body = json.loads(response.body)
    result: dict[str, Any] = {
        "content": [{"type": "text", "text": body.get("content", "")}],
    }
    if body.get("structuredContent") is not None:
        result["structuredContent"] = body["structuredContent"]
    if body.get("isError"):
        result["isError"] = True
    return _jsonrpc_result(request_id, result)


def _build_initialize_result(server_kind: str) -> dict[str, Any]:
    service_name = "delivery-mcp-gateway" if server_kind == "native" else "delivery-mcp-gateway-cli-compat"
    return {
        "protocolVersion": MCP_PROTOCOL_VERSION,
        "capabilities": {"tools": {}},
        "serverInfo": {
            "name": service_name,
            "version": "0.3.0",
        },
    }


def _list_all_mcp_tools() -> MCPListToolsResponse:
    native_response = list_native_mcp_tools()
    cli_response = list_cli_mcp_tools()
    merged_cli_tools = [MCPTool.model_validate(tool.model_dump(by_alias=True)) for tool in cli_response.tools]
    return MCPListToolsResponse(tools=[*native_response.tools, *merged_cli_tools])


async def _execute_mcp_tool_call(name: str, arguments: dict[str, Any], server_kind: str) -> JSONResponse:
    if name == "cli":
        if server_kind != "cli":
            raise JsonRpcRequestError(JSON_RPC_INVALID_PARAMS, "Native MCP server does not expose tool 'cli'")
        command = arguments.get("command")
        if not isinstance(command, str) or not command.strip():
            raise JsonRpcRequestError(JSON_RPC_INVALID_PARAMS, "CLI tool requires string argument 'command'")
        return await _execute_cli_call(command)

    if server_kind == "cli":
        raise JsonRpcRequestError(JSON_RPC_INVALID_PARAMS, "CLI server only exposes tool 'cli'")

    return await _execute_native_call(name, arguments)


def _jsonrpc_result(request_id: Any, result: dict[str, Any]) -> dict[str, Any]:
    return {
        "jsonrpc": JSON_RPC_VERSION,
        "id": request_id,
        "result": result,
    }


def _jsonrpc_error(request_id: Any, code: int, message: str) -> dict[str, Any]:
    return {
        "jsonrpc": JSON_RPC_VERSION,
        "id": request_id,
        "error": {
            "code": code,
            "message": message,
        },
    }


async def _execute_native_call(
    name: str,
    arguments: dict[str, Any],
    execution_profile: Literal["seed", "live", "mixed"] | None = None,
) -> JSONResponse:
    try:
        result = await execute_native_case(name, arguments, execution_profile=execution_profile)
        body = MCPToolCallResponse(
            content=result.markdown,
            structuredContent={
                "operation_id": result.operation_id,
                "canonical_params": result.canonical_params,
                "bi_payload": result.bi_payload,
                "bi_response": result.bi_response,
                "response_source": result.response_source,
                "execution_profile": result.execution_profile,
            },
        )
        return JSONResponse(body.model_dump())
    except (ValidationError, ResolutionError, BIClientError, BIAuthError, BIConfigError, ValueError) as exc:
        return JSONResponse(MCPToolCallResponse(content=str(exc), isError=True).model_dump(), status_code=400)


async def _execute_cli_call(
    command: str,
    execution_profile: Literal["seed", "live", "mixed"] | None = None,
) -> JSONResponse:
    try:
        result = await execute_cli_case(command, execution_profile=execution_profile)
        body = MCPToolCallResponse(
            content=result.markdown,
            structuredContent={
                "operation_id": result.operation_id,
                "command_path": result.command_path,
                "canonical_params": result.canonical_params,
                "bi_payload": result.bi_payload,
                "bi_response": result.bi_response,
                "response_source": result.response_source,
                "execution_profile": result.execution_profile,
            },
        )
        return JSONResponse(body.model_dump())
    except (ValidationError, ResolutionError, BIClientError, BIAuthError, BIConfigError, ValueError) as exc:
        return JSONResponse(MCPToolCallResponse(content=str(exc), isError=True).model_dump(), status_code=400)

def _build_delivery_catalog() -> dict[str, Any]:
    settings = settings_module.get_settings()
    catalog = load_catalog()
    base_url = settings.base_url.rstrip("/")
    native_tools = build_all_native_tools(catalog)
    cli_tool = build_cli_tool_definition(catalog)

    bi_reports: list[dict[str, Any]] = []
    mcp_tools: list[dict[str, Any]] = []
    cli_commands: list[dict[str, Any]] = []

    for operation in catalog.operations:
        upstream = operation.upstream_transport.model_dump(exclude_none=True)
        if operation.service_kind == "report":
            bi_base_url = settings.bi_base_url.rstrip("/") if settings.bi_base_url else ""
            upstream_path = upstream.get("path", "")
            interface_address = f"{bi_base_url}{upstream_path}" if bi_base_url else upstream_path
            bi_reports.append(
                {
                    "report_id": operation.id,
                    "interface_name": operation.id,
                    "report_name": operation.description,
                    "description": operation.description,
                    "interface_address": interface_address,
                    "method": upstream.get("method"),
                    "serializer": upstream.get("serializer"),
                    "route_key": upstream.get("route_key"),
                    "parameter_definitions": [
                        _parameter_metadata(parameter, operation.id, catalog.defaults.get(parameter.key))
                        for parameter in catalog.parameters_for_operation(operation.id)
                    ],
                }
            )

    for tool in native_tools:
        operation = catalog.operation_by_native_tool(tool.name)
        mcp_tools.append(
            {
                "tool_name": tool.name,
                "tool_chinese_name": _infer_table_name(operation.id),
                "description": tool.description,
                "parameter_definition": tool.input_schema,
                "parameter_rows": [
                    _parameter_metadata(parameter, operation.id, catalog.defaults.get(parameter.key))
                    for parameter in catalog.parameters_for_operation(operation.id)
                ],
                "mcp_address": f"{base_url}/mcp",
                "tool_list_api": f"{base_url}/mcp/list-tools",
                "call_api": f"{base_url}/mcp/call-tool",
            }
        )

    for operation in catalog.operations:
        cli_command = list(operation.cli_command)
        cli_commands.append(
            {
                "cli_name": _build_cli_display_name(cli_command),
                "cli_description": _build_cli_display_description(operation.description, cli_command),
                "cli_command": f"cli {' '.join(cli_command)}",
                "cli_address": f"{base_url}/cli",
                "compat_cli_address": f"{base_url}/cli",
                "parameter_definition": [
                    _parameter_metadata(parameter, operation.id, catalog.defaults.get(parameter.key))
                    for parameter in catalog.parameters_for_operation(operation.id)
                ],
            }
        )

    return {
        "service": {
            "name": "v0.3-cli-like-prompts-validation",
            "base_url": base_url,
            "delivery_docs": f"{base_url}/docs",
            "health": f"{base_url}/health",
            "debug_docs": f"{base_url}/debug/docs",
            "console": f"{base_url}/console",
            "canonical_mcp_endpoint": f"{base_url}/mcp",
        },
        "services": {
            "mcp": {
                "service_name": "delivery-mcp-gateway",
                "service_address": f"{base_url}/mcp",
                "tool_list_api": f"{base_url}/mcp/list-tools",
                "call_api": f"{base_url}/mcp/call-tool",
                "tool_count": len(native_tools),
                "protocol_scope": "native_only",
            },
            "cli_compat": {
                "service_name": "delivery-mcp-gateway-cli-compat",
                "service_address": f"{base_url}/cli",
                "tool_list_api": f"{base_url}/cli/list-tools",
                "call_api": f"{base_url}/cli/call-tool",
                "tool_name": cli_tool.name,
                "status": "cli_only",
            },
        },
        "model": {
            "name": settings.eval_model_name,
            "status": settings.eval_model_status,
        },
        "bi_reports": bi_reports,
        "mcp_tools": mcp_tools,
        "cli_list": cli_commands,
    }


def _build_delivery_nav(active_section: str) -> str:
    items = [
        ("all", "总览", "/docs"),
        ("reports", "报表列表", "/reports"),
        ("mcp-tools", "MCP Tool列表", "/mcp-tools"),
        ("cli-tools", "CLI列表", "/cli-tools"),
        ("console", "后台管理", "/console"),
    ]
    return "".join(
        f'<a class="nav-link{" active" if section == active_section else ""}" href="{escape(href)}">{escape(label)}</a>'
        for section, label, href in items
    )


def _build_delivery_html() -> str:
    return _build_delivery_site_html("all")


def _build_cli_display_name(command_path: list[str]) -> str:
    return "cli-" + "-".join(command_path)


def _build_cli_display_description(operation_description: str, command_path: list[str]) -> str:
    command = f"cli {' '.join(command_path)}"
    if command_path == ["apps", "list"]:
        return f"先获取应用清单与 app_id 映射。命令：{command}。适合在报表查询前补齐必填 app_id。"
    if command_path == ["media", "list"]:
        return f"先获取媒体清单与 media_id 映射。命令：{command}。适合在按媒体筛选或分组前确认真实媒体ID。"
    if command_path == ["teams", "list"]:
        return f"先获取团队清单与 team_ids 映射。命令：{command}。适合在按团队筛选或分组前确认真实团队ID。"
    return f"{operation_description} 命令：{command}。请按参数定义补齐必填 flag，优先使用 list 类命令先解析 app/media/team 的真实 ID。"


def _build_report_list_html() -> str:
    return _build_delivery_site_html("reports")


def _build_mcp_tool_list_html() -> str:
    return _build_delivery_site_html("mcp-tools")


def _build_cli_tool_list_html() -> str:
    return _build_delivery_site_html("cli-tools")


def _build_delivery_site_html(section: str) -> str:
    catalog = _build_delivery_catalog()
    service = catalog["service"]
    services = catalog["services"]
    bi_reports = catalog["bi_reports"]
    mcp_tools = catalog["mcp_tools"]
    cli_list = catalog["cli_list"]

    title_map = {
        "all": "v0.3 交付清单",
        "reports": "报表接口列表",
        "mcp-tools": "MCP Tool列表",
        "cli-tools": "CLI列表",
    }
    if section not in title_map:
        raise ValueError(f"Unsupported delivery section: {section}")

    content_blocks: list[str] = []

    if section in {"all", "reports"}:
        report_title = "BI报表列表" if section == "all" else "报表接口列表"
        content_blocks.append(
            f"""
      <section>
        <h2>{report_title}</h2>
        <table>
          <thead><tr><th>报表ID</th><th>报表接口地址</th><th>报表描述</th><th>报表参数及参数定义</th></tr></thead>
          <tbody>
            {''.join(_render_bi_report_row(item) for item in bi_reports)}
          </tbody>
        </table>
      </section>
        """
        )

    if section in {"all", "mcp-tools"}:
        content_blocks.append(
            f"""
      <section>
        <h2>MCP-tool列表</h2>
        <p class="muted">MCP地址：<code>{escape(services['mcp']['service_address'])}</code> ｜ list-tools：<code>{escape(services['mcp']['tool_list_api'])}</code> ｜ call-tool：<code>{escape(services['mcp']['call_api'])}</code></p>
        <table>
          <thead><tr><th>Tool名称</th><th>Tool中文名</th><th>Tool描述</th><th>Tool参数定义</th><th>MCP地址</th></tr></thead>
          <tbody>
            {''.join(_render_mcp_tool_row(item) for item in mcp_tools)}
          </tbody>
        </table>
      </section>
        """
        )

    if section in {"all", "cli-tools"}:
        content_blocks.append(
            f"""
      <section>
        <h2>CLI列表</h2>
        <p class="muted">CLI Tool 统一经由 CLI-only 兼容地址：<code>{escape(services['cli_compat']['service_address'])}</code> ｜ 单工具：<code>{escape(services['cli_compat']['tool_name'])}</code> ｜ 协议状态：<code>{escape(services['cli_compat']['status'])}</code></p>
        <table>
          <thead><tr><th>CLI名</th><th>原始命令</th><th>CLI描述</th><th>CLI地址</th><th>参数定义</th></tr></thead>
          <tbody>
            {''.join(_render_cli_row(item) for item in cli_list)}
          </tbody>
        </table>
      </section>
        """
        )

    if section == "all":
        content_blocks.append(
            f"""
      <section>
        <h2>机器可读目录</h2>
        <pre>{escape(json.dumps(catalog, ensure_ascii=False, indent=2))}</pre>
      </section>
        """
        )

    page_title = title_map[section]
    page_description = "统一交付网站，可通过顶部菜单切换不同清单。"
    page_meta = (
        f'服务地址：<code>{escape(service["base_url"])}</code> ｜ '
        f'总览页：<a href="{escape(service["delivery_docs"])}">{escape(service["delivery_docs"])}</a> ｜ '
        f'后台管理：<a href="{escape(service["console"])}">{escape(service["console"])}</a> ｜ '
        f'健康检查：<code>{escape(service["health"])}</code>'
    )

    return f"""
<!doctype html>
<html lang=\"zh-CN\">
<head>
  <meta charset=\"utf-8\" />
  <title>{page_title}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 0; color: #222; background: #f6f8fa; }}
    header {{ padding: 24px; background: #fff; border-bottom: 1px solid #d0d7de; }}
    h1, h2 {{ margin: 0 0 8px; }}
    main {{ padding: 24px; }}
    nav {{ display: flex; gap: 12px; flex-wrap: wrap; margin-top: 16px; }}
    .nav-link {{ display: inline-block; padding: 8px 14px; border: 1px solid #d0d7de; border-radius: 999px; background: #fff; color: #0969da; text-decoration: none; }}
    .nav-link.active {{ background: #0969da; color: #fff; border-color: #0969da; }}
    section {{ margin-bottom: 24px; }}
    table {{ border-collapse: collapse; width: 100%; margin: 12px 0 24px; table-layout: fixed; background: #fff; }}
    th, td {{ border: 1px solid #d0d7de; padding: 8px; vertical-align: top; text-align: left; word-break: break-word; }}
    th {{ background: #f6f8fa; }}
    code, pre {{ font-family: Consolas, monospace; }}
    pre {{ white-space: pre-wrap; margin: 0; }}
    .muted {{ color: #666; }}
    .param-table {{ width: 100%; margin-top: 8px; font-size: 12px; }}
    .param-table th, .param-table td {{ padding: 6px; }}
  </style>
</head>
<body>
  <header>
    <h1>{page_title}</h1>
    <p class=\"muted\">{page_description}</p>
    <p class=\"muted\">{page_meta}</p>
    <nav>{_build_delivery_nav(section)}</nav>
  </header>
  <main>
    {''.join(content_blocks)}
  </main>
</body>
</html>
"""


def _build_console_html() -> str:
    catalog = _build_delivery_catalog()
    default_csv_path = _default_eval_csv_path()
    default_case = _load_eval_case_previews()[:1]
    default_command = default_case[0]["suggested_cli_command"] if default_case else "cli apps list"
    default_tool = catalog["mcp_tools"][0]["tool_name"] if catalog["mcp_tools"] else "list_apps"
    default_args = {} if default_tool.startswith("list_") else {"app_id": "10300001", "time_range": "2026-04-01:2026-04-08"}

    return f"""
<!doctype html>
<html lang=\"zh-CN\">
<head>
  <meta charset=\"utf-8\" />
  <title>v0.3 管理后台</title>
  <style>
    :root {{ color-scheme: light; }}
    * {{ box-sizing: border-box; }}
    body {{ font-family: Arial, sans-serif; margin: 0; background: #f5f7fb; color: #1f2328; }}
    header {{ padding: 20px 24px; background: #111827; color: #fff; }}
    header h1 {{ margin: 0 0 8px; font-size: 24px; }}
    header p {{ margin: 0; color: #d1d5db; }}
    main {{ display: grid; grid-template-columns: 1.1fr 0.9fr; gap: 16px; padding: 16px 24px 24px; }}
    .card {{ background: #fff; border: 1px solid #d0d7de; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0,0,0,0.04); }}
    .card h2 {{ margin: 0 0 12px; font-size: 18px; }}
    .row {{ display: grid; gap: 12px; margin-bottom: 12px; }}
    .row.two {{ grid-template-columns: 1fr 1fr; }}
    label {{ display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; }}
    input, textarea, select, button {{ width: 100%; font: inherit; }}
    input, textarea, select {{ border: 1px solid #c7ced8; border-radius: 8px; padding: 10px 12px; background: #fff; }}
    textarea {{ min-height: 120px; resize: vertical; }}
    button {{ border: 0; border-radius: 8px; padding: 10px 14px; font-weight: 600; cursor: pointer; background: #2563eb; color: #fff; }}
    button.secondary {{ background: #374151; }}
    button:disabled {{ opacity: 0.65; cursor: not-allowed; }}
    pre {{ background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 8px; overflow: auto; white-space: pre-wrap; word-break: break-word; }}
    .tabs {{ display: flex; gap: 8px; margin-bottom: 12px; }}
    .tabs button {{ width: auto; background: #e5e7eb; color: #111827; }}
    .tabs button.active {{ background: #2563eb; color: #fff; }}
    .hint {{ font-size: 12px; color: #6b7280; }}
    .metric-grid {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }}
    .metric {{ border: 1px solid #dbe3ee; border-radius: 10px; padding: 12px; background: #fafcff; }}
    .metric .name {{ font-size: 12px; color: #6b7280; margin-bottom: 4px; }}
    .metric .value {{ font-size: 24px; font-weight: 700; }}
    .list {{ max-height: 260px; overflow: auto; border: 1px solid #e5e7eb; border-radius: 8px; }}
    .list-item {{ padding: 10px 12px; border-bottom: 1px solid #eef2f7; cursor: pointer; }}
    .list-item:last-child {{ border-bottom: 0; }}
    .list-item:hover {{ background: #f8fafc; }}
    .list-item.active {{ background: #eff6ff; border-left: 3px solid #2563eb; padding-left: 9px; }}
    .summary-card {{ margin-bottom: 12px; padding: 12px; border: 1px solid #dbe3ee; border-radius: 10px; background: #fafcff; }}
    .summary-card strong {{ display: block; margin-bottom: 6px; }}
    .compare-grid {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 12px; }}
    .compare-card {{ border: 1px solid #dbe3ee; border-radius: 10px; padding: 12px; background: #fff; }}
    .status-bar {{ display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin: 12px 0; }}
    .status-pill {{ border: 1px solid #dbe3ee; border-radius: 10px; padding: 10px 12px; background: #f8fafc; }}
    a {{ color: #2563eb; text-decoration: none; }}
    .header-actions {{ margin-top: 12px; }}
    .external-link-button {{ display: inline-block; padding: 8px 14px; border-radius: 999px; background: #2563eb; color: #fff; font-weight: 600; }}
    @media (max-width: 1100px) {{ main {{ grid-template-columns: 1fr; }} .split, .row.two, .metric-grid, .compare-grid, .status-bar {{ grid-template-columns: 1fr; }} }}
  </style>
</head>
<body>
  <header>
    <h1>v0.3 CLI-like Prompts Validation 管理后台</h1>
    <p>原生 MCP 与 CLI-only 双地址联调、案例预览、全量评测、Markdown 报告查看。</p>
    <p class=\"hint\"><a href=\"/docs\">前台交付页</a> ｜ <a href=\"/reports\">报表列表</a> ｜ <a href=\"/mcp-tools\">MCP Tool列表</a> ｜ <a href=\"/cli-tools\">CLI列表</a></p>
    <div class=\"header-actions\">
      <a class=\"external-link-button\" href=\"https://ai.studio/apps/b7893ee7-f9a4-44d0-8e3c-2cc52f496970?fullscreenApplet=true\" target=\"_blank\" rel=\"noopener noreferrer\">CLI-like的工程级可视化</a>
      <a class=\"external-link-button\" href=\"https://ai.studio/apps/c4c03924-b48b-480e-bb48-a166f4d9bec3\" target=\"_blank\" rel=\"noopener noreferrer\">CLI Tool和MCP Tool关系说明</a>
    </div>
  </header>
  <main>
    <section class=\"card\">
      <h2>交互调试</h2>
      <div class=\"tabs\">
        <button id=\"nativeTab\" class=\"active\" type=\"button\">原生 MCP</button>
        <button id=\"cliTab\" type=\"button\">CLI-like</button>
      </div>
      <div id=\"nativePane\">
        <div class=\"row two\">
          <div>
            <label for=\"toolName\">Tool 名</label>
            <select id=\"toolName\"></select>
          </div>
          <div>
            <label for=\"toolAddress\">调用地址</label>
            <input id=\"toolAddress\" value=\"{escape(catalog['services']['mcp']['call_api'])}\" readonly />
          </div>
        </div>
        <div class=\"row\">
          <div>
            <label for=\"nativeArgs\">arguments(JSON)</label>
            <textarea id=\"nativeArgs\">{escape(json.dumps(default_args, ensure_ascii=False, indent=2))}</textarea>
            <div id=\"playgroundStatusHint\" class=\"hint\">当前状态：待执行</div>
          </div>
        </div>
      </div>
      <div id=\"cliPane\" style=\"display:none\">
        <div class=\"row\">
          <div>
            <label for=\"cliCommand\">command</label>
            <textarea id=\"cliCommand\">{escape(default_command)}</textarea>
          </div>
        </div>
        <p class=\"hint\">示例命令已按测试集自动预填，可直接修改。</p>
      </div>
      <div class=\"row two\">
        <button id=\"runPlayground\" type=\"button\">执行调试</button>
        <button id=\"resetPlayground\" class=\"secondary\" type=\"button\">重置示例</button>
      </div>
      <p class=\"hint\">原生 MCP 地址：<a href=\"{escape(catalog['services']['mcp']['service_address'])}\" target=\"_blank\">{escape(catalog['services']['mcp']['service_address'])}</a> ｜ CLI-only 地址：<a href=\"{escape(catalog['services']['cli_compat']['service_address'])}\" target=\"_blank\">{escape(catalog['services']['cli_compat']['service_address'])}</a></p>
      <pre id=\"playgroundOutput\">等待执行...</pre>
    </section>

    <section class=\"card\">
      <h2>全量评测</h2>
      <div class=\"row two\">
        <div>
          <label for=\"csvPath\">测试集 CSV 路径</label>
          <input id=\"csvPath\" value=\"{escape(default_csv_path)}\" />
        </div>
        <div>
          <label for=\"executionProfile\">执行档位</label>
          <select id=\"executionProfile\">
            <option value=\"seed\">seed</option>
            <option value=\"live\">live</option>
            <option value=\"mixed\">mixed</option>
          </select>
        </div>
      </div>
      <div class=\"row two\">
        <div>
          <label for=\"targetService\">目标服务</label>
          <select id=\"targetService\">
            <option value=\"both\">both</option>
            <option value=\"mcp_only\">mcp_only</option>
            <option value=\"cli_only\">cli_only</option>
          </select>
        </div>
        <div>
          <label for=\"evalHint\">联调提示</label>
          <input id=\"evalHint\" value=\"native=/mcp, cli=/cli\" readonly />
        </div>
      </div>
      <div class=\"row two\">
        <button id=\"runEval\" type=\"button\">执行全量评估</button>
        <button id=\"refreshCases\" class=\"secondary\" type=\"button\">刷新案例预览</button>
      </div>
      <div class=\"row two\">
        <button id=\"cleanupArtifacts\" class=\"secondary\" type=\"button\">删除测试产物</button>
        <div id=\"reportLinks\" class=\"hint\">最近报告：未生成</div>
      </div>
      <div id=\"evalRunHint\" class=\"hint\">当前状态：待执行</div>
      <div class=\"status-bar\" id=\"evalStatus\">
        <div class=\"status-pill\">模型状态：{escape(catalog['model']['status'])}</div>
        <div class=\"status-pill\">模型名称：{escape(catalog['model']['name'])}</div>
        <div class=\"status-pill\">最近执行：未开始</div>
      </div>
      <div class=\"metric-grid\" id=\"metrics\"></div>
      <div class=\"compare-grid\" id=\"modeCompare\"></div>
      <div class=\"split\" style=\"margin-top:12px\">
        <div>
          <h3>案例预览</h3>
          <div id=\"caseList\" class=\"list\"></div>
        </div>
        <div>
          <h3>报告</h3>
          <div id=\"reportSummary\" class=\"summary-card hint\">摘要：待生成</div>
          <pre id=\"reportOutput\">等待执行...</pre>
        </div>
      </div>
    </section>
  </main>
  <script>
    const state = {{
      mode: 'native',
      nativeTools: {json.dumps([item['tool_name'] for item in catalog['mcp_tools']], ensure_ascii=False)},
      defaultTool: {json.dumps(default_tool, ensure_ascii=False)},
      defaultArgs: {json.dumps(default_args, ensure_ascii=False)},
      defaultCommand: {json.dumps(default_command, ensure_ascii=False)},
      cases: [],
      activeCaseId: null,
      lastEvalToken: null,
    }};

    const nativeTab = document.getElementById('nativeTab');
    const cliTab = document.getElementById('cliTab');
    const nativePane = document.getElementById('nativePane');
    const cliPane = document.getElementById('cliPane');
    const toolName = document.getElementById('toolName');
    const nativeArgs = document.getElementById('nativeArgs');
    const cliCommand = document.getElementById('cliCommand');
    const playgroundOutput = document.getElementById('playgroundOutput');
    const reportOutput = document.getElementById('reportOutput');
    const csvPath = document.getElementById('csvPath');
    const caseList = document.getElementById('caseList');
    const metrics = document.getElementById('metrics');
    const modeCompare = document.getElementById('modeCompare');
    const evalStatus = document.getElementById('evalStatus');
    const executionProfile = document.getElementById('executionProfile');
    const targetService = document.getElementById('targetService');
    const runPlaygroundButton = document.getElementById('runPlayground');
    const runEvalButton = document.getElementById('runEval');
    const refreshCasesButton = document.getElementById('refreshCases');
    const resetPlaygroundButton = document.getElementById('resetPlayground');
    const cleanupArtifactsButton = document.getElementById('cleanupArtifacts');
    const reportLinks = document.getElementById('reportLinks');
    const reportSummary = document.getElementById('reportSummary');
    const playgroundStatusHint = document.getElementById('playgroundStatusHint');
    const evalRunHint = document.getElementById('evalRunHint');

    function setPlaygroundStatus(message) {{
      playgroundStatusHint.textContent = `当前状态：${{message}}`;
    }}

    function setEvalRunStatus(message) {{
      evalRunHint.textContent = `当前状态：${{message}}`;
    }}

    function renderReportSummary(data) {{
      if (!data || !data.summary) {{
        reportSummary.textContent = '摘要：待生成';
        return;
      }}
      const summary = data.summary || {{}};
      const evaluation = data.evaluation || {{}};
      reportSummary.innerHTML = `
        <strong>摘要</strong>
        <div>总案例：${{summary.total_cases || 0}} ｜ 目标服务：${{summary.target_service || 'unknown'}} ｜ 档位：${{summary.execution_profile || 'unknown'}}</div>
        <div>一致率：${{(Number(summary.equivalence_rate || 0) * 100).toFixed(1)}}% ｜ 模型：${{evaluation.model_name || 'unknown'}} / ${{evaluation.model_status || 'unknown'}}</div>
      `;
    }}

    function initTools() {{
      toolName.innerHTML = '';
      state.nativeTools.forEach((name) => {{
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        if (name === state.defaultTool) option.selected = true;
        toolName.appendChild(option);
      }});
    }}

    function setMode(mode) {{
      state.mode = mode;
      const native = mode === 'native';
      nativeTab.classList.toggle('active', native);
      cliTab.classList.toggle('active', !native);
      nativePane.style.display = native ? 'block' : 'none';
      cliPane.style.display = native ? 'none' : 'block';
      setPlaygroundStatus(native ? '当前为原生 MCP 调试模式' : '当前为 CLI-like 调试模式');
    }}

    function renderJson(target, data) {{
      target.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    }}

    function renderMetrics(summary) {{
      metrics.innerHTML = '';
      const entries = Object.entries(summary.metrics || {{}});
      if (!entries.length) return;
      entries.forEach(([name, value]) => {{
        const card = document.createElement('div');
        card.className = 'metric';
        card.innerHTML = `<div class=\"name\">${{name}}</div><div class=\"value\">${{(Number(value) * 100).toFixed(1)}}%</div>`;
        metrics.appendChild(card);
      }});
    }}

    function renderComparison(summary) {{
      modeCompare.innerHTML = '';
      const byMode = summary.by_mode || {{}};
      const cards = [
        {{ title: 'CLI-like', data: byMode.cli || {{}} }},
        {{ title: 'Native MCP', data: byMode.native || {{}} }},
        {{ title: '模式一致率', data: {{ equivalence_rate: summary.equivalence_rate || 0 }} }},
      ];
      cards.forEach((item) => {{
        const card = document.createElement('div');
        card.className = 'compare-card';
        if (item.title === '模式一致率') {{
          card.innerHTML = `<div class=\"name\">${{item.title}}</div><div class=\"value\">${{(Number(item.data.equivalence_rate) * 100).toFixed(1)}}%</div>`;
        }} else {{
          card.innerHTML = `
            <div class=\"name\">${{item.title}}</div>
            <div class=\"value\">${{(Number(item.data.success_rate || 0) * 100).toFixed(1)}}%</div>
            <div class=\"hint\">成功数：${{item.data.success_count || 0}}</div>
          `;
        }}
        modeCompare.appendChild(card);
      }});
    }}

    function renderEvalStatus(data) {{
      const evaluation = data.evaluation || {{}};
      evalStatus.innerHTML = `
        <div class=\"status-pill\">模型状态：${{evaluation.model_status || 'unknown'}}</div>
        <div class=\"status-pill\">模型名称：${{evaluation.model_name || 'unknown'}}</div>
        <div class=\"status-pill\">最近执行：${{evaluation.generated_at || 'unknown'}}</div>
      `;
    }}

    function renderError(target, error) {{
      if (!error) {{
        target.textContent = '请求失败';
        return;
      }}
      if (typeof error === 'string') {{
        target.textContent = error;
        return;
      }}
      target.textContent = JSON.stringify(error, null, 2);
    }}

    async function readResponseBody(response) {{
      const text = await response.text();
      if (!text) return {{}};
      try {{
        return JSON.parse(text);
      }} catch (_error) {{
        return {{ error: text }};
      }}
    }}

    async function fetchJson(url, options) {{
      const response = await fetch(url, options);
      const body = await readResponseBody(response);
      if (!response.ok) {{
        const error = body.error || body.content || body.detail || `请求失败（${{response.status}}）`;
        throw new Error(typeof error === 'string' ? error : JSON.stringify(error));
      }}
      return body;
    }}

    function setButtonsDisabled(disabled) {{
      runPlaygroundButton.disabled = disabled;
      runEvalButton.disabled = disabled;
      refreshCasesButton.disabled = disabled;
      resetPlaygroundButton.disabled = disabled;
      cleanupArtifactsButton.disabled = disabled;
    }}

    function renderReportLinks(data) {{
      if (!data || !data.report_url || !data.report_name) {{
        reportLinks.textContent = '最近报告：未生成';
        return;
      }}
      reportLinks.innerHTML = `最近报告：<a href="${{data.report_url}}" target="_blank" rel="noopener noreferrer">${{data.report_name}}</a>`;
    }}

    function renderCases(cases) {{
      caseList.innerHTML = '';
      if (!cases.length) {{
        caseList.innerHTML = '<div class=\"list-item\">暂无案例</div>';
        return;
      }}
      cases.forEach((item) => {{
        const div = document.createElement('div');
        div.className = 'list-item';
        if (item.case_id === state.activeCaseId) {{
          div.classList.add('active');
        }}
        div.innerHTML = `<strong>${{item.case_id}}</strong> · ${{item.category}}<br><span class=\"hint\">${{item.query}}</span>`;
        div.addEventListener('click', () => {{
          state.activeCaseId = item.case_id;
          renderCases(cases);
          if (item.expected_operation_id) {{
            toolName.value = item.expected_operation_id;
          }}
          if (item.expected_params) {{
            nativeArgs.value = JSON.stringify(item.expected_params, null, 2);
          }}
          if (item.suggested_cli_command) {{
            cliCommand.value = item.suggested_cli_command;
          }}
          setPlaygroundStatus(`已载入案例 ${{item.case_id}}`);
          setEvalRunStatus(`已选择案例 ${{item.case_id}}，可继续执行全量评测`);
        }});
        caseList.appendChild(div);
      }});
    }}

    async function loadCases() {{
      try {{
        const data = await fetchJson('/eval/cases');
        state.cases = data.cases || [];
        if (!state.cases.some((item) => item.case_id === state.activeCaseId)) {{
          state.activeCaseId = null;
        }}
        csvPath.value = data.csv_path || csvPath.value;
        renderCases(state.cases);
        setEvalRunStatus(`案例已刷新，共 ${{state.cases.length}} 条`);
      }} catch (error) {{
        state.cases = [];
        state.activeCaseId = null;
        renderCases([]);
        renderError(caseList, error.message || error);
        setEvalRunStatus('案例加载失败');
      }}
    }}

    async function runPlayground() {{
      setButtonsDisabled(true);
      setPlaygroundStatus(`执行中（${{state.mode}} / ${{executionProfile.value}}）`);
      playgroundOutput.textContent = '执行中...';
      let payload;
      if (state.mode === 'native') {{
        let args = {{}};
        try {{
          args = JSON.parse(nativeArgs.value || '{{}}');
        }} catch (error) {{
          setButtonsDisabled(false);
          setPlaygroundStatus('参数 JSON 非法');
          playgroundOutput.textContent = 'arguments 不是合法 JSON';
          return;
        }}
        payload = {{ mode: 'native', tool_name: toolName.value, arguments: args, execution_profile: executionProfile.value }};
      }} else {{
        payload = {{ mode: 'cli', command: cliCommand.value, execution_profile: executionProfile.value }};
      }}
      try {{
        const data = await fetchJson('/playground/run', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify(payload),
        }});
        renderJson(playgroundOutput, data);
        setPlaygroundStatus('执行完成');
      }} catch (error) {{
        renderError(playgroundOutput, error.message || error);
        setPlaygroundStatus('执行失败');
      }} finally {{
        setButtonsDisabled(false);
      }}
    }}

    async function runEval() {{
      const token = Date.now().toString();
      state.lastEvalToken = token;
      setButtonsDisabled(true);
      setEvalRunStatus(`评测中（${{targetService.value}} / ${{executionProfile.value}}）`);
      reportOutput.textContent = '评测中...';
      renderReportSummary(null);
      metrics.innerHTML = '';
      modeCompare.innerHTML = '';
      renderReportLinks(null);
      try {{
        const data = await fetchJson('/eval/run', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json', 'X-Eval-Run': token }},
          cache: 'no-store',
          body: JSON.stringify({{
            csv_path: csvPath.value,
            target_service: targetService.value,
            execution_profile: executionProfile.value,
          }}),
        }});
        if (state.lastEvalToken !== token) return;
        renderMetrics(data.summary || {{}});
        renderComparison(data.summary || {{}});
        renderEvalStatus(data);
        renderReportLinks(data);
        renderReportSummary(data);
        reportOutput.textContent = data.report_markdown || JSON.stringify(data, null, 2);
        setEvalRunStatus('评测完成');
      }} catch (error) {{
        if (state.lastEvalToken !== token) return;
        renderEvalStatus({{ evaluation: {{ model_status: 'error', model_name: 'unknown', generated_at: new Date().toISOString() }} }});
        renderError(reportOutput, error.message || error);
        renderReportSummary(null);
        setEvalRunStatus('评测失败');
      }} finally {{
        if (state.lastEvalToken === token) {{
          setButtonsDisabled(false);
        }}
      }}
    }}

    runPlaygroundButton.addEventListener('click', runPlayground);
    runEvalButton.addEventListener('click', runEval);
    refreshCasesButton.addEventListener('click', loadCases);
    resetPlaygroundButton.addEventListener('click', () => {{
      state.activeCaseId = null;
      renderCases(state.cases);
      toolName.value = state.defaultTool;
      nativeArgs.value = JSON.stringify(state.defaultArgs, null, 2);
      cliCommand.value = state.defaultCommand;
      reportLinks.textContent = '最近报告：未生成';
      playgroundOutput.textContent = '等待执行...';
      reportOutput.textContent = '等待执行...';
      renderReportSummary(null);
      metrics.innerHTML = '';
      modeCompare.innerHTML = '';
      setPlaygroundStatus('已重置示例');
      setEvalRunStatus('待执行');
    }});
    cleanupArtifactsButton.addEventListener('click', async () => {{
      if (!window.confirm('仅删除 report_root 和 log_root 下的测试产物，是否继续？')) return;
      setButtonsDisabled(true);
      setEvalRunStatus('清理测试产物中');
      reportOutput.textContent = '删除中...';
      try {{
        const data = await fetchJson('/artifacts/cleanup', {{
          method: 'POST',
          headers: {{ 'Content-Type': 'application/json' }},
          body: JSON.stringify({{ clear_reports: true, clear_logs: true }}),
        }});
        renderReportLinks(null);
        renderReportSummary(null);
        renderJson(reportOutput, data);
        setEvalRunStatus('测试产物已清理');
      }} catch (error) {{
        renderError(reportOutput, error.message || error);
        setEvalRunStatus('测试产物清理失败');
      }} finally {{
        setButtonsDisabled(false);
      }}
    }});
    nativeTab.addEventListener('click', () => setMode('native'));
    cliTab.addEventListener('click', () => setMode('cli'));

    initTools();
    setMode('native');
    nativeArgs.value = JSON.stringify(state.defaultArgs, null, 2);
    setPlaygroundStatus('待执行');
    setEvalRunStatus('待执行');
    renderReportLinks(null);
    renderReportSummary(null);
    loadCases();
  </script>
</body>
</html>
"""


def _default_eval_csv_path() -> str:
    return str(Path(__file__).resolve().parents[3] / "incoming" / "测试集1.0.csv")


def _report_url(report_name: str) -> str:
    return f"/reports/files/{quote(report_name)}"


def _resolve_report_file(report_name: str) -> Path | None:
    candidate = Path(report_name)
    if candidate.name != report_name or candidate.suffix.lower() != ".md":
        return None
    report_path = settings_module.get_settings().report_root_path / candidate.name
    try:
        report_path.resolve().relative_to(settings_module.get_settings().report_root_path.resolve())
    except ValueError:
        return None
    return report_path


def _list_generated_reports() -> list[Path]:
    report_root = settings_module.get_settings().report_root_path
    if not report_root.exists():
        return []
    return sorted(
        [path for path in report_root.glob("*.md") if path.is_file()],
        key=lambda path: path.stat().st_mtime,
        reverse=True,
    )


def _clear_generated_artifacts(root: Path) -> list[str]:
    if not root.exists():
        return []
    resolved_root = root.resolve()
    deleted: list[str] = []
    for path in sorted(root.rglob("*"), key=lambda item: (item.is_file(), str(item)), reverse=True):
        resolved_path = path.resolve()
        try:
            resolved_path.relative_to(resolved_root)
        except ValueError:
            continue
        if path.is_file():
            path.unlink()
            deleted.append(path.name)
        elif path.is_dir():
            try:
                path.rmdir()
            except OSError:
                continue
    return deleted


def _build_generated_reports_html() -> str:
    reports = _list_generated_reports()
    rows = []
    for report in reports:
        rows.append(
            "<tr>"
            f"<td><a href=\"{escape(_report_url(report.name))}\" target=\"_blank\" rel=\"noopener noreferrer\">{escape(report.name)}</a></td>"
            f"<td>{escape(datetime.fromtimestamp(report.stat().st_mtime).isoformat(timespec='seconds'))}</td>"
            f"<td>{report.stat().st_size}</td>"
            "</tr>"
        )
    table_html = (
        '<table><thead><tr><th>报告文件</th><th>更新时间</th><th>大小(bytes)</th></tr></thead>'
        f"<tbody>{''.join(rows) if rows else '<tr><td colspan=\"3\">暂无生成报告</td></tr>'}</tbody></table>"
    )
    return f"""
<!doctype html>
<html lang=\"zh-CN\">
<head>
  <meta charset=\"utf-8\" />
  <title>生成报告列表</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 0; background: #f5f7fb; color: #1f2328; }}
    header {{ padding: 20px 24px; background: #111827; color: #fff; }}
    main {{ padding: 16px 24px 24px; }}
    .card {{ background: #fff; border: 1px solid #d0d7de; border-radius: 12px; padding: 16px; }}
    table {{ width: 100%; border-collapse: collapse; }}
    th, td {{ padding: 10px 12px; border-bottom: 1px solid #e5e7eb; text-align: left; }}
    a {{ color: #2563eb; text-decoration: none; }}
    .nav {{ margin-top: 8px; }}
    .nav a {{ margin-right: 12px; color: #cbd5e1; }}
  </style>
</head>
<body>
  <header>
    <h1>生成报告列表</h1>
    <div class=\"nav\">{_build_delivery_nav('reports')}</div>
  </header>
  <main>
    <section class=\"card\">
      <p>仅展示 report_root 下实际生成的 Markdown 评测报告。</p>
      {table_html}
    </section>
  </main>
</body>
</html>
"""


def _load_eval_case_previews() -> list[dict[str, Any]]:
    from app.eval.case_loader import load_cases

    cases = load_cases(_default_eval_csv_path())
    previews: list[dict[str, Any]] = []
    for case in cases:
        expected_operation_id = infer_expected_operation(case.query)
        expected_params = infer_expected_params(case.query, expected_operation_id)
        previews.append(
            EvalCasePreview(
                case_id=case.case_id,
                category=case.category,
                query=case.query,
                expected_operation_id=expected_operation_id,
                expected_params=expected_params,
                suggested_cli_command=build_cli_command(expected_operation_id, expected_params),
            ).model_dump()
        )
    return previews


def _infer_table_name(operation_id: str) -> str:
    table_names = {
        "list_apps": "应用维表",
        "list_media": "媒体维表",
        "list_team": "团队维表",
        "get_ad_day_report": "广告日周月报表",
        "get_ad_hour_report": "广告小时报表",
        "get_ad_retention_report": "广告留存报表",
        "get_ad_roi_report": "广告ROI报表",
    }
    return table_names.get(operation_id, operation_id)



def _parameter_metadata(parameter: Any, operation_id: str, catalog_default: Any | None) -> dict[str, Any]:
    default_value = parameter.default if parameter.default is not None else catalog_default
    is_required = operation_id in parameter.required_for or (parameter.key == "app_id" and operation_id.startswith("get_ad_"))
    return {
        "name": parameter.key,
        "display_name": parameter.display_name,
        "cli_flag": parameter.cli_flag,
        "required": is_required,
        "type": parameter.type,
        "description": parameter.description,
        "format_hint": parameter.format_hint,
        "purpose": parameter.purpose,
        "query_method": parameter.query_method,
        "table_switching": parameter.table_switching,
        "choices": parameter.choices,
        "enum_descriptions": parameter.enum_descriptions,
        "default": default_value,
        "examples": parameter.examples,
    }



def _render_parameter_table(parameters: list[dict[str, Any]]) -> str:
    if not parameters:
        return '<span class="muted">无参数</span>'

    rows: list[str] = []
    for item in parameters:
        display_name = f"<br><span class=\"muted\">{escape(str(item['display_name']))}</span>" if item.get("display_name") else ""
        choices = escape(", ".join(item.get("choices") or [])) or "-"
        enum_descriptions = item.get("enum_descriptions") or {}
        enum_text = escape("；".join(f"{key}={value}" for key, value in enum_descriptions.items())) if enum_descriptions else "-"
        examples = escape("；".join(item.get("examples") or [])) if item.get("examples") else "-"
        default_value = "-" if item.get("default") is None else escape(str(item["default"]))
        rows.append(
            "<tr>"
            f"<td><code>{escape(str(item['name']))}</code>{display_name}</td>"
            f"<td><code>{escape(str(item['cli_flag']))}</code></td>"
            f"<td>{'必填' if item.get('required') else '可选'}</td>"
            f"<td>{escape(str(item['type']))}</td>"
            f"<td>{escape(str(item.get('format_hint') or '-'))}</td>"
            f"<td>{escape(str(item.get('purpose') or '-'))}</td>"
            f"<td>{escape(str(item.get('query_method') or '-'))}</td>"
            f"<td>{escape(str(item.get('table_switching') or '-'))}</td>"
            f"<td>{choices}</td>"
            f"<td>{enum_text}</td>"
            f"<td>{default_value}</td>"
            f"<td>{examples}</td>"
            f"<td>{escape(str(item.get('description') or '-'))}</td>"
            "</tr>"
        )

    return (
        '<table class="param-table">'
        '<thead><tr>'
        '<th>参数</th><th>Flag</th><th>是否必填</th><th>类型</th><th>格式</th><th>用途</th>'
        '<th>查询方式</th><th>切表/视角</th><th>可选值</th><th>枚举语义</th><th>默认值</th><th>示例</th><th>说明</th>'
        '</tr></thead>'
        f"<tbody>{''.join(rows)}</tbody>"
        '</table>'
    )



def _render_bi_report_row(item: dict[str, Any]) -> str:
    return (
        "<tr>"
        f"<td><code>{escape(str(item['report_id']))}</code></td>"
        f"<td><code>{escape(str(item['interface_address']))}</code></td>"
        f"<td>{escape(str(item['description']))}</td>"
        f"<td>{_render_parameter_table(item['parameter_definitions'])}</td>"
        "</tr>"
    )



def _render_mcp_tool_row(item: dict[str, Any]) -> str:
    return (
        "<tr>"
        f"<td><code>{escape(str(item['tool_name']))}</code></td>"
        f"<td>{escape(str(item['tool_chinese_name']))}</td>"
        f"<td>{escape(str(item['description']))}</td>"
        f"<td>{_render_parameter_table(item['parameter_rows'])}</td>"
        f"<td><code>{escape(str(item['mcp_address']))}</code></td>"
        "</tr>"
    )



def _render_cli_row(item: dict[str, Any]) -> str:
    return (
        "<tr>"
        f"<td><code>{escape(str(item['cli_name']))}</code></td>"
        f"<td><code>{escape(str(item['cli_command']))}</code></td>"
        f"<td>{escape(str(item['cli_description']))}</td>"
        f"<td><code>{escape(str(item['cli_address']))}</code></td>"
        f"<td>{_render_parameter_table(item['parameter_definition'])}</td>"
        "</tr>"
    )
