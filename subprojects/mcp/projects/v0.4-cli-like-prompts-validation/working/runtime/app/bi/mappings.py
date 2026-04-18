from __future__ import annotations

from typing import Any

from app.catalog_loader import load_catalog


def get_operation_mapping(operation_id: str) -> dict[str, Any]:
    catalog = load_catalog()
    operation = catalog.operation_by_id(operation_id)
    return {
        "service_kind": operation.service_kind,
        "exposed_transport": operation.exposed_transport.model_dump(exclude_none=True),
        "upstream_transport": operation.upstream_transport.model_dump(exclude_none=True),
    }


def get_exposed_transport(operation_id: str) -> dict[str, Any]:
    return get_operation_mapping(operation_id)["exposed_transport"]


def get_upstream_transport(operation_id: str) -> dict[str, Any]:
    return get_operation_mapping(operation_id)["upstream_transport"]


def get_service_kind(operation_id: str) -> str:
    return get_operation_mapping(operation_id)["service_kind"]


def is_report_operation(operation_id: str) -> bool:
    return get_service_kind(operation_id) == "report"


def get_endpoint_config(operation_id: str) -> dict[str, Any]:
    mapping = get_operation_mapping(operation_id)
    upstream = dict(mapping["upstream_transport"])
    upstream["service_kind"] = mapping["service_kind"]
    return upstream
