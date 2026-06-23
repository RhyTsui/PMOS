from __future__ import annotations

import json
from functools import lru_cache
from importlib.resources import files
from typing import Any


@lru_cache(maxsize=1)
def load_legacy_route_signal_config() -> dict[str, Any]:
    resource = files(__package__).joinpath("legacy_route_signals.json")
    with resource.open("r", encoding="utf-8-sig") as file:
        data = json.load(file)
    if not isinstance(data, dict):
        return {"signals": {}}
    signals = data.get("signals")
    if not isinstance(signals, dict):
        data["signals"] = {}
    return data


def match_legacy_route_signals(text: str) -> list[str]:
    signals = load_legacy_route_signal_config().get("signals", {})
    matched: list[str] = []
    if not isinstance(signals, dict):
        return matched
    for group, terms in signals.items():
        if not isinstance(group, str) or not isinstance(terms, list):
            continue
        normalized_terms = [str(term).lower() for term in terms if str(term).strip()]
        if any(term in text for term in normalized_terms):
            matched.append(group)
    return matched


