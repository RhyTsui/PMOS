from __future__ import annotations

import csv
import re
from dataclasses import dataclass
from pathlib import Path


CASE_ID_PATTERN = re.compile(r"\b(SUCCESS_\d{3}|ABNORMAL_\d{3})\b", re.IGNORECASE)

MOCK_CASE_INDEX_PATH = (
    Path("E:/AI/ai-os/docs/sources/inbox/归因表mock_交接文档/数据文件/test_case_index.csv")
)


@dataclass(frozen=True)
class AttributionCase:
    case_id: str
    case_type: str
    description: str
    idfa: str
    oaid: str
    android_id: str
    app_id: str
    os_type: str
    media_id: str
    channel_id: str
    click_time: str
    activation_time: str
    expected_result: str
    note: str


_CASES_CACHE: dict[str, AttributionCase] | None = None


def _normalize(value: str | None) -> str:
    return (value or "").strip()


def _load_cases() -> dict[str, AttributionCase]:
    global _CASES_CACHE
    if _CASES_CACHE is not None:
        return _CASES_CACHE

    cases: dict[str, AttributionCase] = {}
    if MOCK_CASE_INDEX_PATH.exists():
        with MOCK_CASE_INDEX_PATH.open("r", encoding="utf-8-sig", newline="") as handle:
            reader = csv.DictReader(handle)
            for row in reader:
                case = AttributionCase(
                    case_id=_normalize(row.get("case_id")).upper(),
                    case_type=_normalize(row.get("case_type")),
                    description=_normalize(row.get("description")),
                    idfa=_normalize(row.get("idfa")),
                    oaid=_normalize(row.get("oaid")),
                    android_id=_normalize(row.get("android_id")),
                    app_id=_normalize(row.get("app_id")),
                    os_type=_normalize(row.get("os_type")),
                    media_id=_normalize(row.get("media_id")),
                    channel_id=_normalize(row.get("channel_id")),
                    click_time=_normalize(row.get("click_time")),
                    activation_time=_normalize(row.get("activation_time")),
                    expected_result=_normalize(row.get("expected_result")),
                    note=_normalize(row.get("note")),
                )
                if case.case_id:
                    cases[case.case_id] = case

    _CASES_CACHE = cases
    return cases


def extract_case_id(text: str) -> str | None:
    match = CASE_ID_PATTERN.search(text or "")
    return match.group(1).upper() if match else None


def list_attribution_cases() -> list[dict[str, str]]:
    cases = sorted(_load_cases().values(), key=lambda item: item.case_id)
    return [
        {
            "case_id": case.case_id,
            "case_type": case.case_type,
            "description": case.description,
            "app_id": case.app_id,
            "os_type": case.os_type,
            "media_id": case.media_id,
            "expected_result": case.expected_result,
        }
        for case in cases
    ]


def get_attribution_case(case_id: str) -> dict[str, object] | None:
    case = _load_cases().get(case_id.upper())
    if case is None:
        return None

    diagnosis_code = {
        "ABNORMAL_000": "TIME_SEQUENCE_ERROR",
        "ABNORMAL_001": "NATURAL_TRAFFIC",
        "ABNORMAL_002": "ACTIVATION_NO_REGISTER",
        "ABNORMAL_003": "REGISTER_NO_PAY",
        "ABNORMAL_004": "RETRY_WAITING",
    }.get(case.case_id, "FULL_SUCCESS")

    timeline = [
        {"stage": "click", "time": case.click_time or "--"},
        {"stage": "activation", "time": case.activation_time or "--"},
    ]
    if case.case_type == "normal":
        timeline.extend(
            [
                {"stage": "register", "time": "mock register time"},
                {"stage": "pay", "time": "mock pay time"},
            ]
        )
    elif case.case_id == "ABNORMAL_002":
        timeline.append({"stage": "register", "time": "--"})
    elif case.case_id == "ABNORMAL_003":
        timeline.append({"stage": "register", "time": "mock register time"})
        timeline.append({"stage": "pay", "time": "--"})

    return {
        "case_id": case.case_id,
        "case_type": case.case_type,
        "description": case.description,
        "app_id": case.app_id,
        "os_type": case.os_type,
        "media_id": case.media_id,
        "channel_id": case.channel_id,
        "identifiers": {
            "idfa": case.idfa,
            "oaid": case.oaid,
            "android_id": case.android_id,
        },
        "expected_result": case.expected_result,
        "note": case.note,
        "diagnosis_code": diagnosis_code,
        "timeline": timeline,
        "important_constraint": "attr_click 没有 device_id，需要先通过 idfa/oaid/android_id 查点击，再关联 device_id。",
    }
