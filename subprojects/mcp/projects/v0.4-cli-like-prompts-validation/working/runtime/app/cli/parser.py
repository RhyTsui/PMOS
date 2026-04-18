from __future__ import annotations

from collections.abc import Sequence
from typing import Any

from app.catalog_loader import load_catalog
from app.cli.tokenizer import tokenize_command
from app.schema.canonical import Catalog, ParameterDefinition, ParsedCliCommand


class CliParseError(ValueError):
    pass


class CliParser:
    def __init__(self, catalog: Catalog | None = None):
        self.catalog = catalog or load_catalog()

    def parse(self, command: str) -> ParsedCliCommand:
        tokens = tokenize_command(command)
        if tokens[0] != "cli":
            raise CliParseError("command must start with 'cli'")

        operation, prefix_length = self._match_operation(tokens[1:])
        flag_tokens = tokens[1 + prefix_length :]
        canonical_params = self._parse_flags(operation.id, flag_tokens)

        return ParsedCliCommand(
            operation_id=operation.id,
            command_path=["cli", *operation.cli_command],
            canonical_params=canonical_params,
            raw_command=command,
            tokens=tokens,
        )

    def help_text(self) -> str:
        lines = [
            "Supported commands:",
            "- cli ads report day|hour|retention|roi",
            "- cli apps list",
            "- cli media list",
            "- cli teams list",
            "",
            "Flags are generated from the shared catalog schema.",
            "Report commands require --time-range and either --app-id or --app-ref.",
            "Use list_apps / list_media / list_team first when you need exact IDs.",
        ]
        for operation in self.catalog.operations:
            lines.append(f"\ncli {' '.join(operation.cli_command)}")
            lines.append(f"  {operation.description}")
            for parameter in self.catalog.parameters_for_operation(operation.id):
                lines.extend(self._help_lines_for_parameter(operation.id, parameter))
        return "\n".join(lines)

    def _help_lines_for_parameter(self, operation_id: str, parameter: ParameterDefinition) -> list[str]:
        lines = []
        if operation_id.startswith("get_ad_") and parameter.key == "app_id":
            requirement = "必填（或用 --app-ref 替代）"
        elif operation_id.startswith("get_ad_") and parameter.key == "app_ref":
            requirement = "可选（可替代 --app-id）"
        else:
            requirement = "必填" if operation_id in parameter.required_for else "可选"
        header = f"  {parameter.cli_flag} <value> [{requirement}]"
        if parameter.display_name:
            header += f" 对应 {parameter.display_name}"
        lines.append(header)
        lines.append(f"    - 说明: {parameter.description}")
        if parameter.format_hint:
            lines.append(f"    - 格式: {parameter.format_hint}")
        if parameter.purpose:
            lines.append(f"    - 用途: {parameter.purpose}")
        if parameter.query_method:
            lines.append(f"    - 查询方式: {parameter.query_method}")
        if parameter.table_switching:
            lines.append(f"    - 切表/视角: {parameter.table_switching}")
        if parameter.choices:
            lines.append(f"    - 可选值: {', '.join(parameter.choices)}")
        if parameter.enum_descriptions:
            lines.append(
                "    - 枚举语义: "
                + "；".join(f"{key}={value}" for key, value in parameter.enum_descriptions.items())
            )
        if parameter.default is not None or parameter.key in self.catalog.defaults:
            default_value = parameter.default if parameter.default is not None else self.catalog.defaults[parameter.key]
            lines.append(f"    - 默认值: {default_value}")
        if parameter.examples:
            lines.append(f"    - 示例: {'；'.join(parameter.examples)}")
        return lines

    def _match_operation(self, tokens: Sequence[str]):
        best_match = None
        best_length = -1
        for operation in self.catalog.operations:
            command_tokens = operation.cli_command
            if list(tokens[: len(command_tokens)]) == command_tokens and len(command_tokens) > best_length:
                best_match = operation
                best_length = len(command_tokens)
        if best_match is None:
            raise CliParseError("unsupported cli command path")
        return best_match, best_length

    def _parse_flags(self, operation_id: str, flag_tokens: Sequence[str]) -> dict[str, Any]:
        allowed_parameters = self.catalog.parameters_for_operation(operation_id)
        parameters_by_flag = {parameter.cli_flag: parameter for parameter in allowed_parameters}
        parsed: dict[str, Any] = {}

        index = 0
        while index < len(flag_tokens):
            token = flag_tokens[index]
            if not token.startswith("--"):
                raise CliParseError(f"unexpected token: {token}")
            parameter = parameters_by_flag.get(token)
            if parameter is None:
                raise CliParseError(f"unsupported flag for {operation_id}: {token}")
            if index + 1 >= len(flag_tokens):
                raise CliParseError(f"missing value for flag: {token}")
            value = flag_tokens[index + 1]
            parsed[parameter.key] = self._coerce_value(parameter, value)
            index += 2

        return self._apply_defaults(operation_id, parsed)

    def _apply_defaults(self, operation_id: str, parsed: dict[str, Any]) -> dict[str, Any]:
        result = dict(parsed)
        for parameter in self.catalog.parameters_for_operation(operation_id):
            if parameter.key in result:
                continue
            if parameter.default is not None:
                result[parameter.key] = parameter.default
                continue
            if parameter.key in self.catalog.defaults:
                result[parameter.key] = self.catalog.defaults[parameter.key]
        return result

    def _coerce_value(self, parameter: ParameterDefinition, raw_value: str) -> Any:
        if parameter.type == "string":
            return raw_value
        if parameter.type == "daterange":
            if ":" not in raw_value:
                raise CliParseError(f"invalid date range for {parameter.cli_flag}: {raw_value}")
            start, end = raw_value.split(":", 1)
            if not start or not end:
                raise CliParseError(f"invalid date range for {parameter.cli_flag}: {raw_value}")
            return raw_value
        if parameter.type == "boolean":
            lowered = raw_value.lower()
            if lowered not in {"true", "false"}:
                raise CliParseError(f"invalid boolean for {parameter.cli_flag}: {raw_value}")
            return lowered == "true"
        if parameter.type == "string_list":
            values = [item.strip() for item in raw_value.split(",") if item.strip()]
            if not values:
                raise CliParseError(f"empty list for {parameter.cli_flag}")
            self._validate_choices(parameter, values)
            return values
        if parameter.type == "enum":
            self._validate_choices(parameter, [raw_value])
            return raw_value
        raise CliParseError(f"unsupported parameter type: {parameter.type}")

    def _validate_choices(self, parameter: ParameterDefinition, values: list[str]) -> None:
        if not parameter.choices:
            return
        invalid = [value for value in values if value not in parameter.choices]
        if invalid:
            raise CliParseError(
                f"invalid value for {parameter.cli_flag}: {', '.join(invalid)}"
            )



def parse_cli_command(command: str, catalog: Catalog | None = None) -> ParsedCliCommand:
    return CliParser(catalog=catalog).parse(command)
