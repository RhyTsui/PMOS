# PMOS API Overview

- version: `v1.0`
- date: `2026-05-09`
- status: `active`

## Purpose

这份文档提供独立 `PMOS product repo` 的 API 总览。

它不是完整 OpenAPI，而是先回答：

1. 哪些接口当前已经真实存在
2. 首次启动后应该优先验证哪些接口
3. 哪些接口分别对应 workflow、task、review、scheduler、context 和 connectors

## Base

- local default: `http://127.0.0.1:4312`
- health: `GET /api/health`

## Recommended First Checks

1. `GET /api/health`
2. `GET /api/workflow`
3. `GET /api/task-ssot/state`
4. `GET /api/mcp-context/state`
5. `GET /api/proof-of-work/bundle`

## Route Groups

### Health And Human Reading

- `GET /api/health`
- `GET /api/human-reading/manifest`
- `GET /api/human-reading/project-entries`
- `GET /api/wiki/shared-documents`
- `PUT /api/wiki/shared-documents`
- `GET /api/graph/overview`

### Workflow And Runs

- `GET /api/workflow`
- `GET /api/workflow-definition`
- `GET /api/workflow-events`
- `GET /api/workflow-metrics`
- `GET /api/runs`
- `POST /api/runs`
- `GET /api/runs/:id`
- `POST /api/runs/:id/advance`
- `POST /api/runs/:id/run-until-blocked`
- `POST /api/runs/:id/resume`
- `POST /api/runs/:id/manual-gate`
- `GET /api/runs/:id/events`
- `GET /api/runs/:id/artifacts`
- `GET /api/runs/:id/review`
- `GET /api/runs/:id/metrics`
- `GET /api/runs/:id/hermes-policy`
- `POST /api/runs/:id/hermes/close-loop`
- `POST /api/runs/:id/hermes/execute-writeback`

### Task SSOT And Final State

- `GET /api/task-ssot/state`
- `GET /api/task-ssot/tasks`
- `GET /api/task-ssot/tasks/:taskId`
- `GET /api/task-ssot/tasks/:taskId/final-state-validation`
- `GET /api/task-ssot/tasks/:taskId/frontend-browser-verification`
- `POST /api/task-ssot/tasks/:taskId/frontend-browser-verification/run`

### Frontend Browser Verification

- `POST /api/frontend-browser-verification/run`

### Scheduler, Proof, Outbox

- `GET /api/scheduler/runs`
- `GET /api/scheduler/runs/:workflowRunId`
- `POST /api/scheduler/runs/tick-due`
- `POST /api/scheduler/runs/:workflowRunId/tick`
- `POST /api/scheduler/runs/:workflowRunId/schedule`
- `GET /api/proof-of-work/bundle`
- `GET /api/outbox/envelopes`
- `POST /api/outbox/envelopes`

### Review, Governance, Retrieval

- `GET /api/review`
- `GET /api/hermes/policy-reports`
- `GET /api/retrieval/governance`
- `PATCH /api/retrieval/governance`
- `POST /api/retrieval/governance/index`
- `POST /api/retrieval/governance/search`
- `GET /api/document-governance/truth-sources`
- `POST /api/document-governance/truth-sources`
- `GET /api/document-governance/audit`
- `POST /api/document-governance/audit`

### Shared Context

- `GET /api/mcp-context/state`
- `GET /api/mcp-context/tasks`
- `GET /api/mcp-context/events`
- `GET /api/mcp-context/checkpoints`
- `GET /api/mcp-context/mode`
- `GET /api/mcp-context/mode-history`
- `POST /api/mcp-context/tasks`
- `PATCH /api/mcp-context/tasks/:taskId`
- `POST /api/mcp-context/checkpoints`
- `POST /api/mcp-context/mode`
- `POST /api/mcp-context/session`
- `GET /api/mcp-context/resume`

### Subprojects, Requirements, DAG, Product Agents

- `GET /api/subprojects`
- `POST /api/subprojects`
- `GET /api/subprojects/:id`
- `GET /api/subprojects/:id/runs/current`
- `POST /api/subprojects/:id/runs/init`
- `GET /api/requirements`
- `POST /api/requirements`
- `PATCH /api/requirements/:id`
- `POST /api/requirements/batch`
- `POST /api/requirements/ingest-chat`
- `POST /api/requirements/ingest-acceptance-review`
- `POST /api/requirements/ingest-runtime-gate`
- `POST /api/requirements/ingest-auto-capture`
- `GET /api/dag/graph`
- `GET /api/dag/runs`
- `GET /api/dag/changes`
- `POST /api/dag/changes`
- `POST /api/dag/runs/:id/rerun`
- `GET /api/product-agents`
- `POST /api/product-agents`
- `POST /api/product-agents/generate`
- `GET /api/product-agents/:id`
- `GET /api/product-agent-blueprints`
- `POST /api/product-agent-blueprints/bootstrap`

### Providers, MCP, Connectors

- `GET /api/providers`
- `GET /api/providers/routing`
- `POST /api/providers/primary`
- `POST /api/providers/:name/priority`
- `GET /api/providers/:name`
- `GET /api/mcp`
- `GET /api/connectors/status`
- `POST /api/connectors/web-fetch`
- `POST /api/connectors/figma/files/inspect`
- `GET /api/connectors/figma/team/projects`
- `POST /api/connectors/dingtalk/meeting-notes`
- `POST /api/connectors/dataki/knowledge-bases/list`
- `POST /api/connectors/dataki/knowledge-bases/:knowledgeBaseId/knowledge/list`
- `POST /api/connectors/dataki/knowledge-search`

## Stability Note

当前产品仓仍在 `v1.0` 补丁推进中。  
最稳定的首批接口，建议优先验证：

1. `health`
2. `workflow`
3. `task-ssot`
4. `mcp-context`
5. `proof-of-work`
