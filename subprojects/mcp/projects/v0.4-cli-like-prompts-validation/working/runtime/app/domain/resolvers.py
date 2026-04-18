from __future__ import annotations

from typing import Any

from app.catalog_loader import load_aliases
from app.domain.normalize import NormalizedRequest


class ResolutionError(ValueError):
    pass



def resolve_request_entities(request: NormalizedRequest) -> NormalizedRequest:
    aliases = load_aliases()
    params = dict(request.canonical_params)
    resolved_ids: dict[str, list[str] | str] = {}

    app_ref = params.get("app_ref")
    if app_ref:
        resolved = _resolve_single_alias(aliases.get("apps", {}), str(app_ref), "app")
        resolved_ids["app_id"] = resolved
        params["app_id"] = resolved

    media_values = params.get("media")
    if media_values:
        resolved_media = _resolve_many_aliases(aliases.get("media", {}), media_values, "media")
        resolved_ids["media"] = resolved_media
        params["media"] = resolved_media

    team_values = params.get("team")
    if team_values:
        resolved_teams = _resolve_many_aliases(aliases.get("teams", {}), team_values, "team")
        resolved_ids["team"] = resolved_teams
        params["team"] = resolved_teams

    request.canonical_params = params
    request.resolved_ids = resolved_ids
    return request



def _resolve_single_alias(candidates: dict[str, Any], raw_value: str, entity_name: str) -> str:
    if raw_value in candidates:
        resolved = candidates[raw_value]
        if isinstance(resolved, list):
            raise ResolutionError(
                f"ambiguous {entity_name} alias '{raw_value}': {', '.join(map(str, resolved))}"
            )
        return str(resolved)
    return raw_value



def _resolve_many_aliases(candidates: dict[str, Any], raw_values: list[str], entity_name: str) -> list[str]:
    resolved: list[str] = []
    for raw_value in raw_values:
        resolved.append(_resolve_single_alias(candidates, raw_value, entity_name))
    return resolved
