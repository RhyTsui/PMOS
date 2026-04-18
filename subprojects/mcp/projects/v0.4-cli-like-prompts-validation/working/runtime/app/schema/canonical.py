from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, model_validator


ParameterLayer = Literal["scope", "time_range", "filters", "metrics_options"]
ParameterType = Literal["string", "daterange", "enum", "string_list", "boolean"]
ServiceKind = Literal["dimension", "lookup", "report"]


class ParameterDefinition(BaseModel):
    key: str
    layer: ParameterLayer
    type: ParameterType
    cli_flag: str
    description: str
    default: Any | None = None
    choices: list[str] = Field(default_factory=list)
    required_for: list[str] = Field(default_factory=list)
    display_name: str | None = None
    format_hint: str | None = None
    purpose: str | None = None
    query_method: str | None = None
    table_switching: str | None = None
    examples: list[str] = Field(default_factory=list)
    enum_descriptions: dict[str, str] = Field(default_factory=dict)


class EndpointDefinition(BaseModel):
    path: str | None = None
    method: str


class TransportDefinition(BaseModel):
    kind: str
    path: str | None = None
    method: str | None = None
    route_key: str | None = None
    serializer: str | None = None


class OperationDefinition(BaseModel):
    id: str
    native_tool_name: str
    cli_command: list[str]
    description: str
    service_kind: ServiceKind = "report"
    endpoint: EndpointDefinition | None = None
    exposed_transport: TransportDefinition | None = None
    upstream_transport: TransportDefinition | None = None
    parameter_keys: list[str] = Field(default_factory=list)

    @model_validator(mode="after")
    def hydrate_transports(self) -> "OperationDefinition":
        if self.exposed_transport is None:
            self.exposed_transport = TransportDefinition(kind="mcp_tool")
        if self.upstream_transport is None:
            if self.endpoint is not None:
                self.upstream_transport = TransportDefinition(
                    kind="legacy_endpoint",
                    path=self.endpoint.path,
                    method=self.endpoint.method,
                )
            else:
                self.upstream_transport = TransportDefinition(kind="unresolved")
        return self


class Catalog(BaseModel):
    defaults: dict[str, Any] = Field(default_factory=dict)
    parameters: dict[str, ParameterDefinition]
    operations: list[OperationDefinition]

    @model_validator(mode="after")
    def validate_references(self) -> "Catalog":
        parameter_keys = set(self.parameters)
        for key, definition in self.parameters.items():
            if definition.key != key:
                raise ValueError(f"parameter key mismatch for {key}")
        for operation in self.operations:
            missing = [key for key in operation.parameter_keys if key not in parameter_keys]
            if missing:
                raise ValueError(
                    f"operation {operation.id} references unknown parameters: {', '.join(missing)}"
                )
        return self

    def operation_by_id(self, operation_id: str) -> OperationDefinition:
        for operation in self.operations:
            if operation.id == operation_id:
                return operation
        raise KeyError(operation_id)

    def operation_by_native_tool(self, tool_name: str) -> OperationDefinition:
        for operation in self.operations:
            if operation.native_tool_name == tool_name:
                return operation
        raise KeyError(tool_name)

    def operation_by_cli_path(self, command_path: list[str]) -> OperationDefinition:
        for operation in self.operations:
            if operation.cli_command == command_path:
                return operation
        raise KeyError(" ".join(command_path))

    def parameters_for_operation(self, operation_id: str) -> list[ParameterDefinition]:
        operation = self.operation_by_id(operation_id)
        return [self.parameters[key] for key in operation.parameter_keys]


class ParsedCliCommand(BaseModel):
    operation_id: str
    command_path: list[str]
    canonical_params: dict[str, Any] = Field(default_factory=dict)
    raw_command: str
    tokens: list[str]


class NativeToolDefinition(BaseModel):
    name: str
    description: str
    input_schema: dict[str, Any]


class CliToolDefinition(BaseModel):
    name: str = "cli"
    description: str
    input_schema: dict[str, Any]
