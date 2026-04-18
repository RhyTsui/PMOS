from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any

import yaml

from app.schema.canonical import Catalog, ParameterDefinition


RUNTIME_ROOT = Path(__file__).resolve().parent.parent
CONFIG_ROOT = RUNTIME_ROOT / "config"
CATALOG_PATH = CONFIG_ROOT / "catalog.yaml"
ALIASES_PATH = CONFIG_ROOT / "aliases.yaml"
SETTINGS_PATH = CONFIG_ROOT / "settings.local.yaml"


@lru_cache(maxsize=1)
def load_catalog(path: Path | None = None) -> Catalog:
    source_path = path or CATALOG_PATH
    raw = _read_yaml(source_path)

    parameters = {
        key: ParameterDefinition(key=key, **value)
        for key, value in raw.get("parameters", {}).items()
    }

    return Catalog(
        defaults=raw.get("defaults", {}),
        parameters=parameters,
        operations=raw.get("operations", []),
    )


@lru_cache(maxsize=1)
def load_aliases(path: Path | None = None) -> dict[str, dict[str, Any]]:
    source_path = path or ALIASES_PATH
    return _read_yaml(source_path)



def load_local_settings(path: Path | None = None) -> dict[str, Any]:
    source_path = path or SETTINGS_PATH
    return _read_yaml(source_path)



def _read_yaml(path: Path) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        data = yaml.safe_load(handle) or {}
    if not isinstance(data, dict):
        raise ValueError(f"expected mapping in {path}")
    return data
