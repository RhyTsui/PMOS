# 3. 配置真源、模块职责与状态映射

## 3.1 配置真源地图

| 配置对象 | 后台页面 | API | runtime 文件 | seed 文件 | store | loader | 是否 active | 是否 cache | 是否影响运行时 |
|---|---|---|---|---|---|---|---|---|---|
| prompt configs | `app/admin/page.tsx` | `/api/xiaoqiao/admin/prompts*` | `runtime-data/prompt-configs.json` | `managed-prompt-seeds.ts` | `prompt-store.ts` | `getActivePromptContent` / `getPromptConfigMetadata` | 是 | 是 | 是 |
| intent route rules | `app/admin/page.tsx` | `/api/xiaoqiao/admin/intent-route-rules` | `runtime-data/intent-route-rules.json` | `advertising-domain-pack.ts` 里的 seed | `intent-route-rules-store.ts` | `loadIntentRouteRulesSync` | 是 | 否 | 是 |
| entity resolution | `app/admin/page.tsx` | `/api/xiaoqiao/admin/entity-resolution-config` | `runtime-data/entity-resolution-config.json` | builtin seed | `entity-resolution-config-store.ts` | `loadEntityResolutionConfigSync` | 是 | 否 | 是 |
| report query policy | `app/admin/page.tsx` | `/api/xiaoqiao/admin/report-query-policy` | `runtime-data/report-query-policy.json` | builtin seed | `report-query-policy-store.ts` | `loadReportQueryPolicySync` | 是 | 否 | 是 |
| report capability overrides | `app/admin/page.tsx` | `/api/xiaoqiao/admin/report-capability-overrides` | `runtime-data/report-capability-overrides.json` | builtin defaults | `report-capability-override-store.ts` | `loadReportCapabilityOverridesSync` | 是 | 否 | 是 |
| MCP servers | `app/admin/page.tsx` | `/api/xiaoqiao/admin/mcp-servers*` | `runtime-data/mcp-servers.json` | builtin defaults | `mcp-server-store.ts` | `listMcpServers` | 是 | 否 | 是 |
| feature switches | `app/admin/page.tsx` | `/api/xiaoqiao/admin/feature-switches*` | `runtime-data/feature-switches.json` | builtin defaults | `feature-switch-store.ts` | `loadFeatureSwitchesSync` / async load | 是 | 否 | 是 |
| skill contracts | `app/admin/page.tsx`、`skills` / `skill-contracts` 页 | `/api/xiaoqiao/skill-contracts*` | `runtime-data/skill-contracts.json` | builtin contracts | `skill-contract-store.ts` | `listSkillContracts` | 是 | 否 | 是 |
| workflow configs | `app/admin/page.tsx` | `automation-templates` / `report-drafts` / `report-template-results` | `workflow-tasks.json` / `automation-*` | builtin defaults | `workflow-task-store.ts` / `automation-*` | `startWorkflowRun` / `createWorkflowTask` | 是 | 否 | 是 |
| domain pack | 无独立页面，混入 admin / route rules / prompt | 间接 | 代码种子 | `advertising-domain-pack.ts` | `advertising-domain-pack.ts` | `normalizeDomainPacks` | 是 | 否 | 是 |
| metric / media / project / package config | `entity resolution`、`report-query-policy`、`MCP` 页面 | 对应各 store | 各自 runtime json | builtin seed | `metric-catalog.ts`、`dimension-catalog.ts`、`entity-resolution-config-store.ts` | 各自 loader | 是 | 否 | 是 |
| chat display config | `app/admin/page.tsx` | `/api/xiaoqiao/admin/chat-display-config` | `runtime-data/running-config.json` / `runtime-config.json` | builtin defaults | `runtime-config.ts` | `getChatDisplayConfig` | 是 | 是 | 是 |
| user / workspace / project scope | `auth` / `workspace` / `project` 相关页面 | `/api/xiaoqiao/auth/*`、`/api/xiaoqiao/workspace` | 会话 / 用户态运行数据 | builtin defaults | `user-scope.ts` / `conversation-store.ts` / `user-preference-store.ts` | `resolveUserScopeFromRequest` | 是 | 部分 | 是 |
| operation logs | `app/admin/page.tsx` | `/api/xiaoqiao/admin/operation-logs` | `runtime-data/operation-logs.json` | 无 | `admin-operation-log-store.ts` | `loadOperationLogs` | 是 | 否 | 是 |

## 3.2 模块职责清单

| 模块 | 文件/目录 | 当前职责 | 上游 | 下游 | 是否运行时生效 | 是否属于控制面 | 是否属于执行面 | 风险 |
|---|---|---|---|---|---|---|---|---|
| request-understanding | `frontend/src/src/lib/request-understanding.ts` | 识别 task / serviceIntent / routeEvidence / domainSignals / capabilityCandidates | 用户输入、上下文 | route decision、report runtime | 是 | 否 | 是 | 高 |
| intent-router | `frontend/src/src/lib/intent-router.ts` | 旧路由决策 | 用户输入 | 旧 golden / shadow path | 低 | 否 | 是 | 高 |
| intent-route-rules | `frontend/src/src/lib/intent-route-rules.ts` / store | 规则打分、加载、发布 | admin 配置、domain pack | route decision | 是 | 是 | 是 | 中 |
| intent-route-engine | `frontend/src/src/lib/intent-route-engine.ts` | rules + LLM + role 的复合决策 | rules、servers、context | composite route decision | 低 | 否 | 是 | 高 |
| context-compiler | `frontend/src/src/lib/context-compiler.ts` | 编译上下文、角色、偏好、slot、项目、任务 | 会话 / 用户 / 项目 | route hints | 是 | 部分 | 是 | 中 |
| route-decision-observation | `frontend/src/src/lib/route-decision-observation.ts` | 只读观测与偏差记录 | route decision、capability decision | metadata / trace / golden | 是 | 否 | 是 | 中 |
| response-contract | `frontend/src/src/lib/response-contract.ts` | legacy envelope + metadata + message parts | workflow result / semantic result | 前端消息、trace | 是 | 否 | 是 | 高 |
| report-query-orchestrator | `frontend/src/src/lib/report-query-orchestrator.ts` | 问数能力选择 / preflight / tool chain / 业务结果 | requirement / servers / manifest | report result / semantic result | 是 | 部分 | 是 | 高 |
| capability-orchestration | `frontend/src/src/lib/capability-orchestration.ts` | manifest、coverage、execution decision | requirement、capability manifest | capabilityDecision | 是 | 部分 | 是 | 高 |
| report-capability-manifest | `frontend/src/src/lib/report-capability-manifest.ts` | 报表能力清单 | MCP servers、overrides | capability selector | 是 | 是 | 是 | 中 |
| mcp-server-store | `frontend/src/src/lib/mcp-server-store.ts` | MCP server store 真源 | admin API | manifest / selector | 是 | 是 | 是 | 中 |
| prompt-store | `frontend/src/src/lib/prompt-store.ts` | prompt versions / active prompt / fallback / cache | admin prompts / seeds | runtime prompt | 是 | 是 | 否 | 高 |
| managed-prompt-seeds | `frontend/src/src/lib/managed-prompt-seeds.ts` | 内置 prompt seed | 编译时 | prompt-store init | 是 | 半 | 否 | 中 |
| advertising-domain-pack | `frontend/src/src/lib/advertising-domain-pack.ts` | 广告域信号、pack、seed | domain 词库 | route rules / manifest | 是 | 部分 | 是 | 中 |
| skill-orchestration | `frontend/src/src/lib/skill-orchestration.ts` | skill candidate / execution | skill contracts / message | skill runtime / trace | 是 | 是 | 是 | 中 |
| semantic-result-contract | `frontend/src/src/contracts/semantic/*` | 最终业务结果协议 | 后端 / skill / MCP | renderer / projection | 是 | 否 | 是 | 低 |
| message presentation | `frontend/src/src/components/cognitive/*` | contract 到 UI 投影 | semantic result / message contract | Chat UI / Right panel | 是 | 否 | 是 | 中 |
| admin page | `frontend/src/src/app/admin/page.tsx` | 管理控制台聚合入口 | admin APIs | UI tabs / forms | 是 | 是 | 否 | 高 |
| admin APIs | `frontend/src/src/app/api/xiaoqiao/admin/*` | 写入 store / runtime json | UI | runtime / seed / store | 是 | 是 | 部分 | 高 |
| route golden scripts | `frontend/src/scripts/*.ts` | 路由 / runtime / observation golden | 当前实现 | CI / 手工验收 | 否 | 否 | 否 | 中 |

## 3.3 当前配置真源的真实问题

1. 同类配置存在“admin 页面 + API + store + seed + runtime JSON”多源并存。
2. `prompt`、`route rules`、`entity resolution`、`report policy`、`capability overrides` 各自独立，缺少统一治理 ledger。
3. `chat display config` 和 `runtime config` 有历史/新链路混用风险。
4. `operation logs` 只是日志存储，并没有成为整个 control plane 的统一审计层。

