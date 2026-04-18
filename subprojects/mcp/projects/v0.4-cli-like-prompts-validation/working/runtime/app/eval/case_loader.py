from __future__ import annotations

import csv
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass(slots=True)
class EvalCase:
    category: str
    case_id: str
    query: str
    expected_result: str
    notes: str
    raw_row: dict[str, Any]

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["raw_row"] = dict(self.raw_row)
        return data


HEADER_ALIASES = {
    "category": ["用例维度", "类别", "category"],
    "case_id": ["用例 ID", "用例ID", "case_id", "id"],
    "query": ["用例内容", "问题", "query", "question", "人话"],
    "expected_result": ["预期结果", "expected_result", "expected"],
    "notes": ["测试备注", "备注", "notes"],
}



def load_cases(csv_path: str | Path) -> list[EvalCase]:
    path = Path(csv_path)
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return [_build_case(row) for row in reader if _has_meaningful_content(row)]



def _build_case(row: dict[str, Any]) -> EvalCase:
    normalized = {_normalize_header(key): (value or "").strip() for key, value in row.items() if key}
    category = _first_value(normalized, HEADER_ALIASES["category"])
    case_id = _first_value(normalized, HEADER_ALIASES["case_id"])
    query = _first_value(normalized, HEADER_ALIASES["query"])
    expected_result = _first_value(normalized, HEADER_ALIASES["expected_result"])
    notes = _first_value(normalized, HEADER_ALIASES["notes"])
    return EvalCase(
        category=category,
        case_id=case_id,
        query=query,
        expected_result=expected_result,
        notes=notes,
        raw_row=normalized,
    )



def _normalize_header(value: str) -> str:
    return value.replace("\u00a0", " ").strip()



def _first_value(row: dict[str, str], candidates: list[str]) -> str:
    for candidate in candidates:
        normalized = _normalize_header(candidate)
        if normalized in row and row[normalized]:
            return row[normalized]
    return ""



def _has_meaningful_content(row: dict[str, Any]) -> bool:
    values = [str(value or "").strip() for value in row.values()]
    return any(values)
