from __future__ import annotations

from datetime import datetime
import json
from pathlib import Path
from typing import Any

from app.settings import get_settings



def build_markdown_report(summary: dict[str, Any], details: list[dict[str, Any]]) -> Path:
    settings = get_settings()
    settings.report_root_path.mkdir(parents=True, exist_ok=True)
    filename = datetime.now().strftime("%Y%m%d-%H%M%S-%f-validation-report.md")
    path = settings.report_root_path / filename

    failures = [detail for detail in details if _has_executed_failure(detail)]

    lines = [
        "# CLI-like Validation Report",
        "",
        "## Summary",
        "```json",
        json.dumps(summary, ensure_ascii=False, indent=2, sort_keys=True),
        "```",
        "",
        "## By Category",
    ]

    by_category = summary.get("by_category", {})
    if by_category:
        lines.extend([
            "| Category | Total | CLI Success | Native Success | Equivalence |",
            "|---|---:|---:|---:|---:|",
        ])
        for category, values in by_category.items():
            lines.append(
                f"| {category} | {values.get('total', 0)} | {values.get('cli_success_rate', 0)} | {values.get('native_success_rate', 0)} | {values.get('equivalence_rate', 0)} |"
            )
    else:
        lines.append("- No category data")

    lines.extend(["", "## Failures"])
    if failures:
        for detail in failures:
            cli = detail.get("cli", {})
            native = detail.get("native", {})
            lines.append(
                "- "
                f"{detail.get('case_id', 'case')}: "
                f"cli=({cli.get('response_source', 'skipped')}) {cli.get('error') or cli.get('bi_response', {}).get('reason') or 'ok'}; "
                f"native=({native.get('response_source', 'skipped')}) {native.get('error') or native.get('bi_response', {}).get('reason') or 'ok'}"
            )
    else:
        lines.append("- None")

    lines.extend([
        "",
        "## Notes",
        "- Current score uses heuristic intent extraction from the CSV natural-language queries.",
        "- Report explicitly marks response_source so seed/live/skipped results are not conflated.",
        "- Report endpoints are verified from BI docs; list_team path is verified from SQL export; list_apps/list_media remain config-driven pending stronger path evidence.",
        "",
        "## Details",
    ])

    for detail in details:
        cli = detail.get("cli", {})
        native = detail.get("native", {})
        lines.append("")
        lines.append(f"### {detail.get('case_id', 'case')} · {detail.get('category', '未分类')}")
        lines.append("")
        lines.append(f"- query: {detail.get('query', '')}")
        lines.append(f"- expected_operation_id: {detail.get('expected_operation_id', '')}")
        lines.append(f"- derived_cli_command: {detail.get('derived_cli_command', '')}")
        lines.append(f"- target_service: {detail.get('target_service', '')}")
        lines.append(f"- execution_profile: {detail.get('execution_profile', '')}")
        lines.append(f"- cli_response_source: {cli.get('response_source', 'skipped')}")
        lines.append(f"- native_response_source: {native.get('response_source', 'skipped')}")
        lines.append(f"- mode_equivalent: {detail.get('mode_equivalent', False)}")
        lines.append("")
        lines.append("```json")
        lines.append(json.dumps(detail, ensure_ascii=False, indent=2, sort_keys=True))
        lines.append("```")

    path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return path


def _has_executed_failure(detail: dict[str, Any]) -> bool:
    for key in ("cli", "native"):
        result = detail.get(key, {})
        if result.get("executed") and not result.get("success"):
            return True
    return False
