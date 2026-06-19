# 1. 当前状态与 Repo Map

## 1.1 当前代码状态

| 项目 | 结果 |
|---|---|
| 当前分支 | `feature/xuyun_init` |
| 当前 `HEAD` | `ee1da8241b16297d7dd5f0d46b5314da54fe097d` |
| 最近提交 | `fix: P0.6 tool-first runtime and presentation boundary` |
| 是否存在未提交变更 | 是 |
| 未提交变更 | 仅新增文档 `[docs/review/会话沉淀-2026-06-03-Admin控制台菜单治理审查报告.md]` |
| 报告基准 | 以当前 `HEAD` + 当前 worktree 为准 |
| P0.6 判定 | `未封版实现`，不直接作为稳定架构结论 |

## 1.2 这次提交的真实范围

`ee1da82` 的变更范围只有：

- `frontend/src/src/app/api/chat/route.ts`
- `frontend/src/src/lib/capability-orchestration.ts`
- `frontend/src/src/lib/report-query-orchestrator.ts`
- `frontend/src/src/lib/request-understanding.ts`
- `frontend/src/src/contracts/request-understanding/user-requirement-contract.ts`
- `frontend/src/scripts/route-runtime-golden.ts`
- `frontend/src/package.json`

这说明 P0.6 的本质不是“全栈重构”，而是：

- 把 request understanding 的 `serviceIntent` 补进路由 metadata。
- 把问数 runtime 的 blocking / clarification / outcome 结构化。
- 把 capability/runtime 的若干前置必填项收缩。
- 把 route runtime golden 脚本补上。

## 1.3 Repo Map

### Chat Runtime

- `/api/chat` 主入口：`frontend/src/src/app/api/chat/route.ts`
- request understanding：`frontend/src/src/lib/request-understanding.ts`
- intent router：`frontend/src/src/lib/intent-router.ts`
- route decision：`frontend/src/src/lib/route-decision-observation.ts`
- context compiler：`frontend/src/src/lib/context-compiler.ts`
- report query runtime：`frontend/src/src/lib/report-query-orchestrator.ts`
- capability discovery：`frontend/src/src/lib/capability-orchestration.ts`
- tool planner：`frontend/src/src/lib/report-query-orchestrator.ts`
- MCP 调用：`frontend/src/src/lib/mcp-discovery.ts`
- response contract：`frontend/src/src/lib/response-contract.ts`
- semantic result contract：`frontend/src/src/contracts/semantic/semantic-result-contract.ts`
- message presentation / renderer：`frontend/src/src/components/cognitive/message-presentation.ts`、`frontend/src/src/components/cognitive/message-presentation-projection.ts`、`frontend/src/src/components/cognitive/MessagePresentationRenderer.tsx`

### Admin / Control Plane

- admin 页面：`frontend/src/src/app/admin/page.tsx`
- prompt 管理：`frontend/src/src/app/api/xiaoqiao/admin/prompts/*`
- intent route rules：`frontend/src/src/app/api/xiaoqiao/admin/intent-route-rules/route.ts`
- entity resolution：`frontend/src/src/app/api/xiaoqiao/admin/entity-resolution-config/route.ts`
- report-query-policy：`frontend/src/src/app/api/xiaoqiao/admin/report-query-policy/route.ts`
- capability override：`frontend/src/src/app/api/xiaoqiao/admin/report-capability-overrides/route.ts`
- MCP servers：`frontend/src/src/app/api/xiaoqiao/admin/mcp-servers/*`
- feature switches：`frontend/src/src/app/api/xiaoqiao/admin/feature-switches/*`
- workflow：`frontend/src/src/app/api/xiaoqiao/admin/automation-templates/*`、`frontend/src/src/app/api/xiaoqiao/admin/report-drafts/*`、`frontend/src/src/app/api/xiaoqiao/admin/report-template-results/*`
- skills / skill contracts：`frontend/src/src/app/api/xiaoqiao/skills/*`、`frontend/src/src/app/api/xiaoqiao/skill-contracts/*`
- users / workspace / project scope：`frontend/src/src/app/api/xiaoqiao/auth/*`、`frontend/src/src/lib/user-scope.ts`
- operation logs：`frontend/src/src/app/api/xiaoqiao/admin/operation-logs/route.ts`

### Capability / MCP

- MCP server store：`frontend/src/src/lib/mcp-server-store.ts`
- MCP tool list：`frontend/src/src/lib/mcp-discovery.ts`
- capability manifest：`frontend/src/src/lib/report-capability-manifest.ts`
- capability override：`frontend/src/src/lib/report-capability-override-store.ts`
- report capability manifest：`frontend/src/src/app/api/xiaoqiao/admin/report-capability-manifest/route.ts`
- tool selector：`frontend/src/src/lib/report-query-orchestrator.ts`
- tool input builder：`frontend/src/src/lib/report-query-orchestrator.ts`
- tool result normalizer：`frontend/src/src/lib/mcp-tool-output-adapter.ts`

### Prompt / Policy

- prompt-store：`frontend/src/src/lib/prompt-store.ts`
- managed-prompt-seeds：`frontend/src/src/lib/managed-prompt-seeds.ts`
- prompt-runtime-policy：`frontend/src/src/lib/prompt-runtime-policy.ts`
- active prompt loading：`frontend/src/src/lib/prompt-store.ts`
- seed fallback：`frontend/src/src/lib/prompt-store.ts`
- cache：`frontend/src/src/lib/prompt-store.ts`
- prompt metadata / version：`frontend/src/src/lib/prompt-store.ts`、`frontend/src/src/lib/prompt-runtime-policy.ts`

### Domain / Business Config

- advertising-domain-pack：`frontend/src/src/lib/advertising-domain-pack.ts`
- metric / media / project / package / channel config：`frontend/src/src/lib/metric-catalog.ts`、`frontend/src/src/lib/dimension-catalog.ts`、`frontend/src/src/lib/entity-resolution-config-store.ts`
- report-query-policy：`frontend/src/src/lib/report-query-policy-store.ts`
- domain signal：`frontend/src/src/lib/request-understanding.ts`、`frontend/src/src/lib/route-decision-observation.ts`
- project resolution strategy：`frontend/src/src/lib/context-compiler.ts`、`frontend/src/src/lib/user-scope.ts`

### Workflow / Automation

- workflow store：`frontend/src/src/lib/workflow-task-store.ts`
- workflow runtime：`frontend/src/src/lib/workflow-engine.ts`
- automation templates：`frontend/src/src/lib/automation-template-store.ts`
- run history / replay：`frontend/src/src/lib/automation-execution-store.ts`
- scheduled report / automation：`frontend/src/src/lib/automation-scheduler.ts`、`frontend/src/src/lib/scheduled-task-store.ts`

### Frontend Presentation

- MessageSurface：`frontend/src/src/components/cognitive/ChatContainer.tsx`
- MessagePresentationRenderer：`frontend/src/src/components/cognitive/MessagePresentationRenderer.tsx`
- ResultMessageCard：由 `message-presentation-projection.ts` + renderer 组合承担
- BusinessSummaryCard：`frontend/src/src/contracts/presentation/message-contract-field-bindings.ts`
- RuntimeDisclosurePanel：`frontend/src/src/components/cognitive/MessageDisclosureDrawer.tsx`、`frontend/src/src/renderers/disclosure/*`
- component registry：`frontend/src/src/contracts/renderer/*`
- right panel tabs：`frontend/src/src/components/cognitive/ChatContainer.tsx`
- response projection：`frontend/src/src/components/cognitive/message-presentation-projection.ts`
- render surface / region binding：`frontend/src/src/contracts/presentation/message-contract-field-bindings.ts`

### Observability / Trace / Evaluation

- process_events：`frontend/src/src/lib/chat-route-primitives.ts`、`frontend/src/src/types/index.ts`
- route_observation：`frontend/src/src/lib/route-decision-observation.ts`
- reasoning_artifacts：`frontend/src/src/app/api/chat/route.ts`
- ResponseContract metadata：`frontend/src/src/lib/response-contract.ts`
- trace id / external trace / 连弩 SDK 上报：`frontend/src/src/lib/trace.ts`、`frontend/src/src/lib/trace-config-store.ts`
- route golden tests：`frontend/src/scripts/orchestration-routing-golden.ts`、`frontend/src/scripts/route-runtime-golden.ts`、`frontend/src/scripts/route-decision-observation-golden.ts`
- UI guardrail：`scripts/guardrails/check-contract-governance.ts`
- evaluation scripts：`frontend/src/scripts/*`、`frontend/src/src/contracts/__tests__/*`

