# Task Artifact Contract

Status: P0.7 minimal protocol.

Task artifacts are the business outputs produced by MCP workflows or automation tasks.

## Supported Artifact Types

- `report`
- `diagnosis_result`
- `package_list`
- `integration_log`
- `operation_result`
- `alert`
- `file`

## Display Boundary

Main message should summarize the result or required user action. Detailed logs, step history, and raw artifacts belong in the side panel or runtime disclosure surface.
