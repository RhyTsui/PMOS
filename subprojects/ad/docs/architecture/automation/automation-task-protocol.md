# Automation Task Protocol

Status: P0.7 minimal protocol.

This protocol defines the smallest task model needed for Chat Core to represent one-off tasks, scheduled tasks, condition watches, approval tasks, and background tasks returned by MCP or local adapters.

## Scope

Included:

- task identity
- task type
- trigger
- status
- owner, workspace, and project scope
- next and last run timestamps
- artifacts, notifications, and run history

Excluded:

- a new Workflow Engine
- an automation admin platform
- MCP tool schema changes
- concrete business tool names in Chat Core

## Runtime Shape

The frontend type source is `frontend/src/src/contracts/automation/automation-task.ts`.

Required fields:

- `taskId`
- `taskType`
- `trigger`
- `status`

Supported task types:

- `one_off_task`
- `scheduled_task`
- `condition_watch`
- `manual_approval_task`
- `background_task`

Supported triggers:

- `immediate`
- `schedule`
- `condition`
