from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from pathlib import Path
import re
from typing import Any, Literal

from app.bi.client import BIAuthError, BIClient, BIClientError, BIConfigError
from app.bi.mappings import get_upstream_transport, is_report_operation
from app.bi.payloads import build_bi_payload
from app.catalog_loader import load_aliases, load_catalog
from app.cli.parser import CliParseError, parse_cli_command
from app.domain.formatters import render_markdown_result
from app.domain.normalize import NormalizedRequest, normalize_cli_request, normalize_native_request
from app.domain.resolvers import ResolutionError, resolve_request_entities
from app.domain.validate import ValidationError, validate_request
from app.eval.case_loader import EvalCase, load_cases
from app.eval.report_builder import build_markdown_report
from app.eval.scorer import score_results
from app.settings import get_settings


ExecutionProfile = Literal["seed", "live", "mixed"]
TargetService = Literal["mcp_only", "cli_only", "both"]
DIMENSION_DATA_KEYS = {
    "list_apps": "apps",
    "list_media": "media",
    "list_team": "teams",
}


@dataclass(slots=True)
class RunResult:
    mode: str
    operation_id: str
    canonical_params: dict[str, Any]
    bi_payload: dict[str, Any] | None
    markdown: str
    bi_response: dict[str, Any] | None = None
    response_source: str = "skipped"
    execution_profile: ExecutionProfile = "seed"
    executed: bool = True
    success: bool = False
    error: str | None = None
    command_path: list[str] | None = None

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


TEAM_KEYWORDS = ["广告投放一部", "创新部", "市场部", "飞涛", "上海发行项目部", "广州发行一部", "广州发行二部"]
MEDIA_KEYWORDS = ["巨量引擎", "巨量广告", "腾讯广告", "苹果广告", "快手", "TapTap", "tap", "b站", "市场星图", "市场量"]
APP_TYPE_KEYWORDS = {
    "iOS应用": ["iOS", "IOS", "苹果端"],
    "安卓应用": ["安卓", "Android", "android"],
}


async def execute_cli_case(command: str, execution_profile: ExecutionProfile | None = None) -> RunResult:
    normalized, parsed = normalize_cli_request(command)
    validated = validate_request(normalized)
    resolved = resolve_request_entities(validated)
    return await _run_resolved_request(
        resolved,
        execution_profile=execution_profile,
        command_path=parsed.command_path[1:],
    )


async def execute_native_case(
    tool_name: str,
    arguments: dict[str, Any],
    execution_profile: ExecutionProfile | None = None,
) -> RunResult:
    normalized = normalize_native_request(tool_name, arguments)
    validated = validate_request(normalized)
    resolved = resolve_request_entities(validated)
    return await _run_resolved_request(resolved, execution_profile=execution_profile)


def run_cli_case(command: str, execution_profile: ExecutionProfile | None = None) -> RunResult:
    return asyncio.run(execute_cli_case(command, execution_profile=execution_profile))


def run_native_case(
    tool_name: str,
    arguments: dict[str, Any],
    execution_profile: ExecutionProfile | None = None,
) -> RunResult:
    return asyncio.run(execute_native_case(tool_name, arguments, execution_profile=execution_profile))


async def evaluate_case_async(
    case: EvalCase,
    target_service: TargetService = "both",
    execution_profile: ExecutionProfile | None = None,
) -> dict[str, Any]:
    profile = _normalize_execution_profile(execution_profile)
    expected_operation_id = infer_expected_operation(case.query)
    expected_params = infer_expected_params(case.query, expected_operation_id)
    cli_command = build_cli_command(expected_operation_id, expected_params)
    parsed_cli = None
    if cli_command:
        try:
            parsed_cli = parse_cli_command(cli_command)
        except CliParseError:
            parsed_cli = None

    if target_service in {"both", "cli_only"}:
        cli_result = await _safe_execute_cli(cli_command, execution_profile=profile)
    else:
        cli_result = _skipped_result("cli", "target_service excludes cli mode", execution_profile=profile)

    if target_service in {"both", "mcp_only"}:
        native_result = await _run_expected_native_case(
            parsed_cli=parsed_cli,
            cli_result=cli_result,
            expected_operation_id=expected_operation_id,
            expected_params=expected_params,
            execution_profile=profile,
            target_service=target_service,
        )
    else:
        native_result = _skipped_result("native", "target_service excludes native mode", execution_profile=profile)

    return {
        "category": case.category,
        "case_id": case.case_id,
        "query": case.query,
        "expected_result": case.expected_result,
        "notes": case.notes,
        "expected_operation_id": expected_operation_id,
        "expected_params": expected_params,
        "derived_cli_command": cli_command,
        "target_service": target_service,
        "execution_profile": profile,
        "cli": cli_result.to_dict(),
        "native": native_result.to_dict(),
        "mode_equivalent": _is_equivalent(cli_result, native_result),
    }


def evaluate_case(
    case: EvalCase,
    target_service: TargetService = "both",
    execution_profile: ExecutionProfile | None = None,
) -> dict[str, Any]:
    return asyncio.run(evaluate_case_async(case, target_service=target_service, execution_profile=execution_profile))


async def run_evaluation_async(
    csv_path: str | Path,
    target_service: TargetService = "both",
    execution_profile: ExecutionProfile | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]], Path]:
    profile = _normalize_execution_profile(execution_profile)
    cases = load_cases(csv_path)
    details = [
        await evaluate_case_async(case, target_service=target_service, execution_profile=profile)
        for case in cases
    ]
    summary = score_results(details)
    summary["target_service"] = target_service
    summary["execution_profile"] = profile
    report_path = build_markdown_report(summary, details)
    return summary, details, report_path


def run_evaluation(
    csv_path: str | Path,
    target_service: TargetService = "both",
    execution_profile: ExecutionProfile | None = None,
) -> tuple[dict[str, Any], list[dict[str, Any]], Path]:
    return asyncio.run(run_evaluation_async(csv_path, target_service=target_service, execution_profile=execution_profile))


async def _run_expected_native_case(
    *,
    parsed_cli: Any,
    cli_result: RunResult,
    expected_operation_id: str | None,
    expected_params: dict[str, Any],
    execution_profile: ExecutionProfile,
    target_service: TargetService,
) -> RunResult:
    catalog = load_catalog()
    if parsed_cli and parsed_cli.operation_id and (target_service != "both" or cli_result.success):
        operation = catalog.operation_by_id(parsed_cli.operation_id)
        return await _safe_execute_native(
            operation.native_tool_name,
            parsed_cli.canonical_params,
            execution_profile=execution_profile,
        )
    if expected_operation_id:
        operation = catalog.operation_by_id(expected_operation_id)
        return await _safe_execute_native(
            operation.native_tool_name,
            expected_params,
            execution_profile=execution_profile,
        )
    return RunResult(
        mode="native",
        operation_id="",
        canonical_params={},
        bi_payload=None,
        markdown="",
        bi_response={"status": "failed", "reason": "unable to infer expected operation from query"},
        response_source="skipped",
        execution_profile=execution_profile,
        success=False,
        error="unable to infer expected operation from query",
    )


async def _run_resolved_request(
    request: NormalizedRequest,
    *,
    execution_profile: ExecutionProfile | None = None,
    command_path: list[str] | None = None,
) -> RunResult:
    profile = _normalize_execution_profile(execution_profile)
    payload = build_bi_payload(request) if is_report_operation(request.operation_id) else None
    response, response_source = await _execute_upstream(request.operation_id, payload, execution_profile=profile)
    success = _is_success_response(response)
    error = None if success else _error_from_response(response)
    markdown = render_markdown_result(request, payload=payload, response_summary=response, error=error)
    return RunResult(
        mode=request.mode,
        operation_id=request.operation_id,
        canonical_params=request.canonical_params,
        bi_payload=payload,
        markdown=markdown,
        bi_response=response,
        response_source=response_source,
        execution_profile=profile,
        success=success,
        error=error,
        command_path=command_path,
    )


async def _execute_upstream(
    operation_id: str,
    payload: dict[str, Any] | None,
    *,
    execution_profile: ExecutionProfile,
) -> tuple[dict[str, Any], str]:
    transport = get_upstream_transport(operation_id)
    transport_kind = str(transport.get("kind") or "")
    dimension_key = DIMENSION_DATA_KEYS.get(operation_id)
    if dimension_key:
        return await _execute_dimension_upstream(
            operation_id,
            dimension_key,
            transport_kind=transport_kind,
            transport=transport,
            execution_profile=execution_profile,
        )

    if payload is None:
        return {
            "status": "skipped",
            "reason": f"{operation_id} does not use BI report transport",
        }, "skipped"

    if execution_profile == "seed":
        return _seed_report_response(operation_id, payload), "seed"

    settings = get_settings()
    if not settings.bi_base_url or not settings.bi_token:
        if execution_profile == "live":
            raise BIConfigError("BI base URL or token is not configured")
        seeded = _seed_report_response(operation_id, payload)
        seeded["fallback_reason"] = "BI base URL or token is not configured"
        return seeded, "seed"

    client = BIClient(settings)
    try:
        return await client.call(operation_id, payload), "live"
    except (BIAuthError, BIClientError, BIConfigError) as exc:
        if execution_profile == "mixed":
            seeded = _seed_report_response(operation_id, payload)
            seeded["fallback_reason"] = str(exc)
            return seeded, "seed"
        raise


async def _execute_dimension_upstream(
    operation_id: str,
    dimension_key: str,
    *,
    transport_kind: str,
    transport: dict[str, Any],
    execution_profile: ExecutionProfile,
) -> tuple[dict[str, Any], str]:
    if execution_profile == "seed":
        return _seed_dimension_response(dimension_key), "seed"

    try:
        response = await _execute_live_dimension_upstream(operation_id, transport_kind, transport)
        return response, "live"
    except (BIAuthError, BIClientError, BIConfigError) as exc:
        if execution_profile == "mixed":
            seeded = _seed_dimension_response(dimension_key)
            seeded["fallback_reason"] = str(exc)
            return seeded, "seed"
        raise


async def _execute_live_dimension_upstream(
    operation_id: str,
    transport_kind: str,
    transport: dict[str, Any],
) -> dict[str, Any]:
    settings = get_settings()
    if not settings.bi_base_url or not settings.bi_token:
        raise BIConfigError("BI base URL or token is not configured")

    client = BIClient(settings)
    if transport_kind == "mcp_http":
        raw = await client.call_http(transport)
        return _normalize_dimension_response(raw)
    if transport_kind == "dimension_service_unresolved":
        raise BIConfigError(f"live upstream transport is not configured for {operation_id}")
    raise BIConfigError(f"unsupported dimension transport kind for {operation_id}: {transport_kind}")


async def _safe_execute_cli(command: str | None, execution_profile: ExecutionProfile) -> RunResult:
    if not command:
        return RunResult(
            mode="cli",
            operation_id="",
            canonical_params={},
            bi_payload=None,
            markdown="",
            bi_response={"status": "failed", "reason": "unable to derive cli command from query"},
            response_source="skipped",
            execution_profile=execution_profile,
            success=False,
            error="unable to derive cli command from query",
        )
    try:
        return await execute_cli_case(command, execution_profile=execution_profile)
    except (CliParseError, ValidationError, ResolutionError, ValueError, KeyError, BIClientError, BIAuthError, BIConfigError) as exc:
        return RunResult(
            mode="cli",
            operation_id="",
            canonical_params={},
            bi_payload=None,
            markdown="",
            bi_response={"status": "failed", "reason": str(exc)},
            response_source="live" if execution_profile != "seed" else "seed",
            execution_profile=execution_profile,
            success=False,
            error=str(exc),
        )


async def _safe_execute_native(
    tool_name: str,
    arguments: dict[str, Any],
    execution_profile: ExecutionProfile,
) -> RunResult:
    try:
        return await execute_native_case(tool_name, arguments, execution_profile=execution_profile)
    except (ValidationError, ResolutionError, ValueError, KeyError, BIClientError, BIAuthError, BIConfigError) as exc:
        return RunResult(
            mode="native",
            operation_id="",
            canonical_params={},
            bi_payload=None,
            markdown="",
            bi_response={"status": "failed", "reason": str(exc)},
            response_source="live" if execution_profile != "seed" else "seed",
            execution_profile=execution_profile,
            success=False,
            error=str(exc),
        )


def _seed_dimension_response(dimension_key: str) -> dict[str, Any]:
    aliases = load_aliases()
    data = aliases.get("dimensions", {}).get(dimension_key, [])
    return {
        "status": "success",
        "kind": "dimension_seed",
        "count": len(data),
        "data": data,
    }


def _seed_report_response(operation_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "status": "success",
        "kind": "report_seed",
        "operation_id": operation_id,
        "echo_payload": payload,
        "rows": [],
        "row_count": 0,
    }


def _normalize_dimension_response(raw: Any) -> dict[str, Any]:
    if isinstance(raw, dict):
        data = raw.get("data")
        if isinstance(data, list):
            response = dict(raw)
            response.setdefault("status", "success")
            response.setdefault("kind", "dimension_live")
            response.setdefault("count", len(data))
            return response
        response = dict(raw)
        response.setdefault("status", "success")
        response.setdefault("kind", "dimension_live")
        return response
    if isinstance(raw, list):
        return {
            "status": "success",
            "kind": "dimension_live",
            "count": len(raw),
            "data": raw,
        }
    return {
        "status": "success",
        "kind": "dimension_live",
        "data": raw,
    }


def _is_success_response(response: dict[str, Any] | None) -> bool:
    if not response:
        return False
    status = response.get("status")
    if status is None:
        return "reason" not in response and "error" not in response
    return str(status).lower() == "success"


def _error_from_response(response: dict[str, Any] | None) -> str | None:
    if not response:
        return "empty upstream response"
    if response.get("reason"):
        return str(response["reason"])
    if response.get("error"):
        return str(response["error"])
    status = response.get("status")
    if status and str(status).lower() != "success":
        return f"upstream status: {status}"
    return None


def _normalize_execution_profile(execution_profile: ExecutionProfile | None) -> ExecutionProfile:
    if execution_profile in {"seed", "live", "mixed"}:
        return execution_profile
    configured = getattr(get_settings(), "execution_profile", "seed")
    if configured in {"seed", "live", "mixed"}:
        return configured
    return "seed"


def _skipped_result(mode: str, reason: str, *, execution_profile: ExecutionProfile) -> RunResult:
    return RunResult(
        mode=mode,
        operation_id="",
        canonical_params={},
        bi_payload=None,
        markdown="",
        bi_response={"status": "skipped", "reason": reason},
        response_source="skipped",
        execution_profile=execution_profile,
        executed=False,
        success=False,
        error=reason,
    )


def infer_expected_operation(query: str) -> str | None:
    text = _normalize_text(query)
    if not text:
        return None
    if "小时报表" in text or "小时" in text:
        return "get_ad_hour_report"
    if "留存" in text:
        return "get_ad_retention_report"
    if "ROI" in text or "roi" in text:
        return "get_ad_roi_report"
    if any(token in text for token in ["日报", "周报", "月报", "激活数", "注册数", "消耗", "转化率"]):
        return "get_ad_day_report"
    return None


def infer_expected_params(query: str, operation_id: str | None) -> dict[str, Any]:
    if not operation_id:
        return {}

    params: dict[str, Any] = {}
    app_ref = _extract_app_ref(query)
    if app_ref:
        params["app_ref"] = app_ref

    time_range = _extract_time_range(query, operation_id)
    if time_range:
        params["time_range"] = time_range

    granularity = _infer_granularity(query, operation_id)
    if granularity:
        params["granularity"] = granularity

    team = _extract_keywords(query, TEAM_KEYWORDS)
    if team:
        params["team"] = team

    media = _extract_keywords(query, MEDIA_KEYWORDS)
    if media:
        params["media"] = media

    app_types = _extract_app_types(query)
    if app_types:
        params["app_type"] = app_types

    hour_slot = _extract_hour_slot(query)
    if hour_slot and operation_id == "get_ad_hour_report":
        params["hour_slot"] = hour_slot

    if operation_id == "get_ad_roi_report":
        params["roi_type"] = "interval" if any(token in query for token in ["区间", "首日ROI", "第2日ROI", "第45日roi", "第2周roi", "第2月ROI"]) else "cumulative"

    if operation_id == "get_ad_retention_report":
        params["retention_type"] = _infer_retention_type(query)

    return params


def build_cli_command(operation_id: str | None, params: dict[str, Any]) -> str | None:
    if not operation_id:
        return None
    catalog = load_catalog()
    operation = catalog.operation_by_id(operation_id)
    tokens = ["cli", *operation.cli_command]
    for parameter in catalog.parameters_for_operation(operation_id):
        if parameter.key not in params:
            continue
        value = params[parameter.key]
        tokens.append(parameter.cli_flag)
        tokens.append(_quote_cli_value(_stringify_cli_value(value)))
    return " ".join(tokens)


def _is_equivalent(cli_result: RunResult, native_result: RunResult) -> bool:
    return (
        cli_result.executed
        and native_result.executed
        and cli_result.success
        and native_result.success
        and cli_result.operation_id == native_result.operation_id
        and cli_result.canonical_params == native_result.canonical_params
        and cli_result.bi_payload == native_result.bi_payload
    )


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", value.replace("\u00a0", " ")).strip()


def _extract_app_ref(query: str) -> str | None:
    text = _normalize_text(query)
    for candidate in ["指间山海", "指间日报", "指间"]:
        if candidate in text:
            return candidate if candidate != "指间日报" else "指间"
    match = re.match(r"([\u4e00-\u9fffA-Za-z0-9_-]{2,12})", text)
    if match:
        return match.group(1)
    return None


def _extract_time_range(query: str, operation_id: str) -> str | None:
    text = _normalize_text(query)
    compact_range = re.search(r"(20\d{6})\s*[-~至到]\s*(20\d{6})", text)
    if compact_range:
        return f"{_compact_to_iso(compact_range.group(1))}:{_compact_to_iso(compact_range.group(2))}"

    full_range = re.search(
        r"(20\d{2})\s*[-年/.]\s*(\d{1,2})\s*[-月/.]\s*(\d{1,2})\s*日?\s*(?:至|到|~|-)\s*(?:同年)?\s*(?:(20\d{2})\s*[-年/.]\s*)?(\d{1,2})\s*[-月/.]\s*(\d{1,2})\s*日?",
        text,
    )
    if full_range:
        end_year = full_range.group(4) or full_range.group(1)
        start = _to_iso(full_range.group(1), full_range.group(2), full_range.group(3))
        end = _to_iso(end_year, full_range.group(5), full_range.group(6))
        return f"{start}:{end}"

    if "最近一周（不含查询当天）" in text or "最近一周(不含查询当天)" in text:
        today = date.today()
        end = today - timedelta(days=1)
        start = end - timedelta(days=6)
        return f"{start.isoformat()}:{end.isoformat()}"

    recent_days = re.search(r"最近\s*(\d+)\s*天", text)
    if recent_days:
        days = max(int(recent_days.group(1)), 1)
        end = date.today()
        start = end - timedelta(days=days - 1)
        return f"{start.isoformat()}:{end.isoformat()}"

    if "上周" in text:
        today = date.today()
        start_of_week = today - timedelta(days=today.weekday())
        start = start_of_week - timedelta(days=7)
        end = start + timedelta(days=6)
        return f"{start.isoformat()}:{end.isoformat()}"

    if "昨天" in text:
        day = date.today() - timedelta(days=1)
        return f"{day.isoformat()}:{day.isoformat()}"

    month_match = re.search(r"(20\d{2})\s*年\s*(\d{1,2})\s*月", text)
    if month_match and any(token in text for token in ["月报", "累计", "月累计", "同期"]):
        start, end = _month_range(int(month_match.group(1)), int(month_match.group(2)))
        return f"{start}:{end}"

    compact_date = re.search(r"(20\d{6})", text)
    if compact_date:
        value = _compact_to_iso(compact_date.group(1))
        if "那一周周报" in text or "周报" in text:
            dt = date.fromisoformat(value)
            start = dt - timedelta(days=dt.weekday())
            end = start + timedelta(days=6)
            return f"{start.isoformat()}:{end.isoformat()}"
        if "月报" in text:
            start, end = _month_range(int(value[:4]), int(value[5:7]))
            return f"{start}:{end}"
        return f"{value}:{value}"

    single_date = re.search(r"(20\d{2})[-年/.](\d{1,2})[-月/.](\d{1,2})日?", text)
    if single_date:
        value = _to_iso(single_date.group(1), single_date.group(2), single_date.group(3))
        if "周报" in text:
            dt = date.fromisoformat(value)
            start = dt - timedelta(days=dt.weekday())
            end = start + timedelta(days=6)
            return f"{start.isoformat()}:{end.isoformat()}"
        if "月报" in text:
            start, end = _month_range(int(single_date.group(1)), int(single_date.group(2)))
            return f"{start}:{end}"
        return f"{value}:{value}"

    return None if operation_id.startswith("list_") else None


def _infer_granularity(query: str, operation_id: str) -> str | None:
    if operation_id == "get_ad_hour_report":
        return "hour"
    text = _normalize_text(query)
    if "周报" in text:
        return "week"
    if "月报" in text:
        return "month"
    return "day"


def _extract_keywords(query: str, candidates: list[str]) -> list[str]:
    found: list[str] = []
    normalized = _normalize_text(query)
    for candidate in candidates:
        if candidate in normalized and candidate not in found:
            found.append(candidate)
    return found


def _extract_app_types(query: str) -> list[str]:
    found: list[str] = []
    for canonical, keywords in APP_TYPE_KEYWORDS.items():
        if any(keyword in query for keyword in keywords):
            found.append(canonical)
    return found


def _extract_hour_slot(query: str) -> str | None:
    match = re.search(r"(\d{1,2})点\s*[-到至]\s*(\d{1,2})点", query)
    if not match:
        return None
    start = int(match.group(1))
    end = int(match.group(2))
    return f"{start:02d}:00-{end:02d}:00"


def _infer_retention_type(query: str) -> str:
    if "首日付费" in query or "付费" in query:
        return "first_pay"
    if "注册" in query:
        return "account"
    return "device"


def _stringify_cli_value(value: Any) -> str:
    if isinstance(value, bool):
        return "true" if value else "false"
    if isinstance(value, list):
        return ",".join(str(item) for item in value)
    return str(value)


def _quote_cli_value(value: str) -> str:
    if not value or any(char.isspace() for char in value):
        return '"' + value.replace('"', '\\"') + '"'
    return value


def _to_iso(year: str, month: str, day: str) -> str:
    return date(int(year), int(month), int(day)).isoformat()


def _compact_to_iso(value: str) -> str:
    return date(int(value[:4]), int(value[4:6]), int(value[6:8])).isoformat()


def _month_range(year: int, month: int) -> tuple[str, str]:
    start = date(year, month, 1)
    if month == 12:
        next_month = date(year + 1, 1, 1)
    else:
        next_month = date(year, month + 1, 1)
    end = next_month - timedelta(days=1)
    return start.isoformat(), end.isoformat()
