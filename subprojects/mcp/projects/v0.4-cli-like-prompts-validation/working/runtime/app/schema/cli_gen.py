from __future__ import annotations

from app.catalog_loader import load_catalog
from app.cli.parser import CliParser
from app.schema.canonical import Catalog, CliToolDefinition



def build_cli_tool_definition(catalog: Catalog | None = None) -> CliToolDefinition:
    active_catalog = catalog or load_catalog()
    parser = CliParser(active_catalog)
    description = (
        "Run CLI-like BI commands through a single MCP tool. "
        "The command must start with 'cli'. Report commands require --time-range and either --app-id or --app-ref; add report-specific flags such as --roi-type or --retention-type when needed.\n\n"
        + parser.help_text()
    )
    return CliToolDefinition(
        description=description,
        input_schema={
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "CLI-like command string starting with 'cli'. Include required flags such as --app-id, --time-range, --roi-type or --retention-type when the selected report requires them.",
                }
            },
            "required": ["command"],
            "additionalProperties": False,
        },
    )
