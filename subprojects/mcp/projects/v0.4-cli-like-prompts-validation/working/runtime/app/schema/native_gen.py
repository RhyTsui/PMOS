from __future__ import annotations

from typing import Any

from app.catalog_loader import load_catalog
from app.schema.canonical import Catalog, NativeToolDefinition, ParameterDefinition


TYPE_MAPPING = {
    "string": {"type": "string"},
    "daterange": {"type": "string", "pattern": r"^\d{4}-\d{2}-\d{2}:\d{4}-\d{2}-\d{2}$"},
    "boolean": {"type": "boolean"},
    "string_list": {"type": "array", "items": {"type": "string"}},
    "enum": {"type": "string"},
}


def build_native_tool_definition(operation_id: str, catalog: Catalog | None = None) -> NativeToolDefinition:
    active_catalog = catalog or load_catalog()
    operation = active_catalog.operation_by_id(operation_id)
    properties: dict[str, Any] = {}
    required: list[str] = []

    for parameter in active_catalog.parameters_for_operation(operation_id):
        schema = dict(TYPE_MAPPING[parameter.type])
        schema["description"] = _build_parameter_description(parameter, operation_id, active_catalog.defaults.get(parameter.key))
        if parameter.choices:
            schema["enum"] = parameter.choices
        if parameter.enum_descriptions:
            schema["x-enum-descriptions"] = parameter.enum_descriptions
        if parameter.display_name:
            schema["title"] = parameter.display_name
        if parameter.format_hint:
            schema["x-format-hint"] = parameter.format_hint
        if parameter.purpose:
            schema["x-purpose"] = parameter.purpose
        if parameter.query_method:
            schema["x-query-method"] = parameter.query_method
        if parameter.table_switching:
            schema["x-table-switching"] = parameter.table_switching
        if parameter.examples:
            schema["examples"] = parameter.examples
        if parameter.default is not None:
            schema["default"] = parameter.default
        elif parameter.key in active_catalog.defaults:
            schema["default"] = active_catalog.defaults[parameter.key]
        if parameter.required_for and operation_id in parameter.required_for:
            required.append(parameter.key)
        properties[parameter.key] = schema

    input_schema = {
        "type": "object",
        "properties": properties,
        "additionalProperties": False,
    }
    if required:
        input_schema["required"] = required
    if operation.service_kind == "report" and "app_id" in properties and "app_ref" in properties:
        input_schema["anyOf"] = [{"required": ["app_id"]}, {"required": ["app_ref"]}]

    return NativeToolDefinition(
        name=operation.native_tool_name,
        description=operation.description,
        input_schema=input_schema,
    )


def build_all_native_tools(catalog: Catalog | None = None) -> list[NativeToolDefinition]:
    active_catalog = catalog or load_catalog()
    return [build_native_tool_definition(operation.id, active_catalog) for operation in active_catalog.operations]


def _build_parameter_description(
    parameter: ParameterDefinition,
    operation_id: str,
    catalog_default: Any | None,
) -> str:
    lines = [parameter.description]
    lines.append(f"CLI flag: {parameter.cli_flag}.")
    if operation_id.startswith("get_ad_") and parameter.key == "app_id":
        lines.append("Required: yes, unless app_ref is supplied.")
    elif operation_id.startswith("get_ad_") and parameter.key == "app_ref":
        lines.append("Alternative to app_id: yes.")
    else:
        lines.append(
            f"Required: {'yes' if operation_id in parameter.required_for else 'no'}."
        )
    if parameter.format_hint:
        lines.append(f"Format: {parameter.format_hint}.")
    if parameter.purpose:
        lines.append(f"Purpose: {parameter.purpose}.")
    if parameter.query_method:
        lines.append(f"Query method: {parameter.query_method}.")
    if parameter.table_switching:
        lines.append(f"Table switching: {parameter.table_switching}.")
    if parameter.choices:
        lines.append(f"Choices: {', '.join(parameter.choices)}.")
    if parameter.enum_descriptions:
        enum_text = '; '.join(f"{key}={value}" for key, value in parameter.enum_descriptions.items())
        lines.append(f"Enum semantics: {enum_text}.")
    default_value = parameter.default if parameter.default is not None else catalog_default
    if default_value is not None:
        lines.append(f"Default: {default_value}.")
    return ' '.join(lines)
