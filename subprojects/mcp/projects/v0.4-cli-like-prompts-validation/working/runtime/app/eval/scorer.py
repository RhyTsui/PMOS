from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.bi.mappings import is_report_operation


METRIC_KEYS = [
    "参数完整率",
    "参数正确率",
    "格式合规率",
    "工具匹配准确率",
    "幻觉/拒绝率",
]



def score_results(results: list[dict[str, Any]]) -> dict[str, Any]:
    total = len(results)
    if total == 0:
        return {
            "total_cases": 0,
            "processable_cases": 0,
            "metrics": {key: 0.0 for key in METRIC_KEYS},
            "by_mode": {"cli": {}, "native": {}},
            "by_category": {},
            "equivalence_rate": 0.0,
            "response_sources": {"cli": {}, "native": {}},
        }

    cli_successes = sum(1 for result in results if result["cli"]["success"])
    native_successes = sum(1 for result in results if result["native"]["success"])
    cli_executed = sum(1 for result in results if result["cli"].get("executed"))
    native_executed = sum(1 for result in results if result["native"].get("executed"))
    processable_cases = sum(1 for result in results if result.get("expected_operation_id"))

    completeness_scores = [_param_completeness(result) for result in results]
    correctness_scores = [_param_correctness(result) for result in results]
    format_scores = [_format_ok(result) for result in results]
    tool_match_scores = [_tool_match(result) for result in results]
    hallucination_scores = [_hallucination_or_refusal(result) for result in results]

    category_totals: dict[str, dict[str, float]] = defaultdict(lambda: {"total": 0, "cli_success": 0, "native_success": 0, "equivalent": 0})
    for result in results:
        bucket = category_totals[result.get("category") or "未分类"]
        bucket["total"] += 1
        bucket["cli_success"] += 1 if result["cli"]["success"] else 0
        bucket["native_success"] += 1 if result["native"]["success"] else 0
        bucket["equivalent"] += 1 if result.get("mode_equivalent") else 0

    by_category = {
        category: {
            "total": int(values["total"]),
            "cli_success_rate": _safe_ratio(values["cli_success"], values["total"]),
            "native_success_rate": _safe_ratio(values["native_success"], values["total"]),
            "equivalence_rate": _safe_ratio(values["equivalent"], values["total"]),
        }
        for category, values in sorted(category_totals.items())
    }

    cli_sources = _count_response_sources(results, "cli")
    native_sources = _count_response_sources(results, "native")
    equivalence_rate = _safe_ratio(sum(1 for result in results if result.get("mode_equivalent")), total)
    return {
        "total_cases": total,
        "processable_cases": processable_cases,
        "metrics": {
            "参数完整率": _average(completeness_scores),
            "参数正确率": _average(correctness_scores),
            "格式合规率": _average(format_scores),
            "工具匹配准确率": _average(tool_match_scores),
            "幻觉/拒绝率": _average(hallucination_scores),
        },
        "by_mode": {
            "cli": {
                "success_count": cli_successes,
                "success_rate": _safe_ratio(cli_successes, total),
                "executed_count": cli_executed,
                "failure_count": cli_executed - cli_successes,
                "response_sources": cli_sources,
            },
            "native": {
                "success_count": native_successes,
                "success_rate": _safe_ratio(native_successes, total),
                "executed_count": native_executed,
                "failure_count": native_executed - native_successes,
                "response_sources": native_sources,
            },
        },
        "by_category": by_category,
        "equivalence_rate": equivalence_rate,
        "response_sources": {
            "cli": cli_sources,
            "native": native_sources,
        },
    }



def _param_completeness(result: dict[str, Any]) -> float:
    expected = result.get("expected_params") or {}
    actual = result.get("cli", {}).get("canonical_params") or {}
    if not expected:
        return 1.0 if result.get("cli", {}).get("success") else 0.0
    matched = 0
    for key, value in expected.items():
        if key in actual and actual[key] not in (None, "", []):
            matched += 1
    return _safe_ratio(matched, len(expected))



def _param_correctness(result: dict[str, Any]) -> float:
    expected = result.get("expected_params") or {}
    actual = result.get("cli", {}).get("canonical_params") or {}
    if not expected:
        return 1.0 if result.get("cli", {}).get("success") else 0.0
    matched = 0
    for key, value in expected.items():
        if actual.get(key) == value:
            matched += 1
    return _safe_ratio(matched, len(expected))



def _format_ok(result: dict[str, Any]) -> float:
    markdown = result.get("cli", {}).get("markdown") or ""
    if not markdown:
        return 0.0
    required = ["# ", "## canonical_params"]
    if not all(token in markdown for token in required):
        return 0.0
    expected_operation = result.get("expected_operation_id")
    if expected_operation and is_report_operation(expected_operation):
        return 1.0 if "## bi_payload" in markdown else 0.0
    return 1.0



def _tool_match(result: dict[str, Any]) -> float:
    expected_operation = result.get("expected_operation_id")
    actual_operation = result.get("cli", {}).get("operation_id")
    if not expected_operation:
        return 0.0
    return 1.0 if expected_operation == actual_operation else 0.0



def _hallucination_or_refusal(result: dict[str, Any]) -> float:
    cli_result = result.get("cli", {})
    if not cli_result.get("success"):
        return 1.0
    expected_operation = result.get("expected_operation_id")
    actual_operation = cli_result.get("operation_id")
    if expected_operation and actual_operation and expected_operation != actual_operation:
        return 1.0
    return 0.0



def _count_response_sources(results: list[dict[str, Any]], mode: str) -> dict[str, int]:
    counts: dict[str, int] = defaultdict(int)
    for result in results:
        source = str(result.get(mode, {}).get("response_source") or "unknown")
        counts[source] += 1
    return dict(sorted(counts.items()))



def _average(values: list[float]) -> float:
    if not values:
        return 0.0
    return round(sum(values) / len(values), 4)



def _safe_ratio(numerator: float, denominator: float) -> float:
    if denominator == 0:
        return 0.0
    return round(numerator / denominator, 4)
