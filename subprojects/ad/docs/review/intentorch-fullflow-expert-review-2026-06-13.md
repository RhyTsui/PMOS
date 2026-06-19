# IntentOrch 全流程专家评审记录

- 日期：2026-06-13
- 范围：`/api/chat` IntentOrch 接入、Planner candidate、Plan Arbitrator、Prompt 变量、Response metadata、Trace 观测、运行验收
- 当前结论：通过本轮 IntentOrch 集成与运行验收。IntentOrch 已在真实 `/api/chat` SSE 中作为 planner candidate 生效；主链路仍由 Plan Arbitrator / ContractSafety 收口，未放大为执行权威。

## 1. 架构评审

结论：通过实施评审。

- IntentOrch 已从 report 链路的 raw `intentOrchPlan` 注入改为 `intentorch_candidate`、`planner_candidates`、`arbitration_summary`。
- `capability_discovery` 只接收摘要候选和仲裁摘要，不接收 `mappedParameters`、raw tool args 或 SDK 原始错误。
- IntentOrch 仍是 planner candidate，不是执行权威；最终工具选择仍由 Capability Discovery、Execution Policy、Tool Contract 和 ContractSafety 约束。

风险检查：

- 硬编码风险：本次没有新增业务关键词路由、媒体名、指标名或单样例 if/else。
- 平行协议风险：复用现有 open-answer planner projection，没有新增绕开 Enterprise AI Chat OS 的独立协议。

## 2. 主链路评审

结论：通过实施评审。

- open-answer 链路继续发出 `intent_orch.candidate`。
- report/business 链路已移除 `intent_orch.enhanced` 事件形态，统一发出 `intent_orch.candidate`。
- `capability_discovery` 输入不再包含 `intentOrchPlan`。
- `response_contract.metadata`、done metadata、structured payload、reasoning artifacts 均记录 planner candidates 与 arbitration summary。

## 3. Prompt 与契约评审

结论：通过实施评审。

- `capability_discovery` 已纳入 PromptVariableSchema。
- `intentorch_candidate` 来源为 `intent_orch`，脱敏策略为 `summary_only`。
- `arbitration_summary` 来源为 `plan_arbitrator`，脱敏策略为 `summary_only`。
- forbidden variables 增加 `intentOrchPlan` 与 `mappedParameters`，阻断 raw IntentOrch plan 进入模型变量。

## 4. 观测评审

结论：通过实施与真实链路评审。

- Runtime process event 使用 `intent_orch.candidate` 表达 success/failed/timeout/disabled。
- Chat Trace 增加 `agent.plan_arbitration` span，输入 planner candidates，输出 arbitration summary。
- Trace 写入仍 fail-open，不改变主链路成功/失败语义。

## 5. 部署与全流程评审

当前结论：通过 IntentOrch 全流程验收，保留外部依赖风险。

已完成证据：

- 最终 8002 实例监听，PID `26600`。
- runtime-version 返回：
  - `version`: `0.1.0:2026-06-13T11:26:40.533Z`
  - `started_at`: `2026-06-13T11:26:40.533Z`
- 最终运行环境：
  - `INTENT_ORCH_ENABLED=true`
  - `XIAOQIAO_INTENT_ORCH_TOTAL_TIMEOUT_MS=12000`
  - `XIAOQIAO_OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS=12000`
  - `XIAOQIAO_INTENT_ORCH_MCP_CONNECT_TIMEOUT_MS=1500`
- 真实 `/api/chat` case：`你好，请说明你能帮我做什么`
  - conversation: `intentorch-fullflow-hello-20260613-final2`
  - trace_id: `zt-chat-1781350033465-obtmzj`
  - 结果：SSE 返回 `intent_orch.candidate`。
  - candidate: `status=success`、`duration_ms=2154`、`parsed_intent_count=1`、`tool_selection_count=1`、`estimated_steps=1`。
  - `planner_candidates` 中包含 `request_understanding` 与 `intentorch`。
  - `arbitration_summary` 中保留 `rejected_authorities=["intentorch_direct_tool_selection","prompt_keyword_routing","raw_context_dump"]`，最终权威仍是 `contract_safety`。
  - ResponseContract 返回 degraded，是回答模型 breaker 半开探测导致的回答合成降级，不影响本次 IntentOrch candidate 生效结论。
- direct runner 复测：
  - `INTENT_ORCH_ENABLED=true`
  - `XIAOQIAO_INTENT_ORCH_TOTAL_TIMEOUT_MS=12000`
  - `XIAOQIAO_INTENT_ORCH_MCP_CONNECT_TIMEOUT_MS=1500`
  - 结果：`success=true`、`durationMs=3805`、`parsed=1`、`selections=1`、`tools=13`、`estimatedSteps=1`。

历史问题与修复证据：

- 真实 `/api/chat` case：`你好`
  - conversation: `intentorch-fullflow-hello-20260613`
  - 结果：SSE 返回 `intent_orch.candidate`。
  - candidate: `status=failed`、`error=sdk_not_available`，错误已归一化，没有泄露 raw SDK 文本。
  - `planner_candidates`、`arbitration_summary` 出现在 `model.step` 与 done metadata。
- 真实 `/api/chat` case：`查一下昨天消耗`
  - conversation: `intentorch-fullflow-report-20260613`
  - 结果：SSE 返回 `intent_orch.candidate`。
  - route: `report_query`，但当时 `modelService.enabled=false` 且 runtime context 显示 `mcpAvailable=false`，未进入真实工具执行。
- runtime-config 脱敏检查：
  - 修改前 `getModelServiceConfig()` 返回 `enabled=false`，直接导致 `sdk_not_available`。
  - 已将 `.runtime/zhitou-chat/v2/runtime-config.json` 中 `modelService.enabled` 置为 `true`，未改动或输出密钥。
- direct runner 复测：
  - `INTENT_ORCH_ENABLED=true`
  - `XIAOQIAO_INTENT_ORCH_TOTAL_TIMEOUT_MS=10000`
  - `XIAOQIAO_INTENT_ORCH_MCP_CONNECT_TIMEOUT_MS=350`
  - 结果：IntentOrch 初始化云意图引擎，连接至少一个 MCP，工具摘要数 `13`，返回 `success=true`、`estimatedSteps=1`。
  - 仍有外部配置风险：多个 MCP 返回 `401/406/ECONNREFUSED`，模型 raw call 出现 `401`，但最终候选摘要不暴露 raw 参数。

已补修复：

- `sdk_not_available` 已拆成可观测的 `model_service_disabled` / `model_api_key_missing` / `model_endpoint_missing` / `model_name_missing` / SDK 初始化归一化错误。
- open-answer IntentOrch 外层预算从固定 1800ms 改为可配置，默认 3500ms，运行态可用 `XIAOQIAO_OPEN_ANSWER_INTENT_ORCH_TIMEOUT_MS` 覆盖。
- MCP 连接从串行阻塞改为并行 fail-open，并支持 `XIAOQIAO_INTENT_ORCH_MCP_CONNECT_TIMEOUT_MS`。
- `role-profile-store` 固定 `.tmp` 文件改为唯一临时文件，修复并发读角色时的 tmp rename 竞态。
- 运行态 `modelService.enabled` 已在验收前恢复为 true；但发现服务重启/管理页链路可能会把该值写回 false，需另开配置治理任务追踪。

## 6. 已完成静态验证

- `npm.cmd exec vitest run tests/open-answer-planner-context.test.ts tests/prompt-variable-contract.test.ts tests/intent-orch-enhancer-timeout.test.ts tests/intent-orch-report-chain-contract.test.ts`
  - 结果：4 个测试文件、20 个用例通过。
- `npm.cmd run ts-check`
  - 结果：通过。
- `npm.cmd exec vitest run tests/request-understanding-route-decision.test.ts tests/response-contract-boundary.test.ts tests/model-participation-trace.test.ts tests/runtime-disclosure.test.ts`
  - 结果：4 个测试文件、28 个用例通过。
- 合并回归：
  - `npm.cmd exec vitest run tests/open-answer-planner-context.test.ts tests/prompt-variable-contract.test.ts tests/intent-orch-enhancer-timeout.test.ts tests/intent-orch-report-chain-contract.test.ts tests/request-understanding-route-decision.test.ts tests/response-contract-boundary.test.ts tests/model-participation-trace.test.ts tests/runtime-disclosure.test.ts`
  - 结果：8 个测试文件、48 个用例通过。
- `npm.cmd run validate:ad-ui`
  - 结果：通过。
- `npm.cmd run check:mojibake`
  - 结果：扫描 tracked 文本 1177 个，findings=0。
- `git diff --check`
  - 结果：通过。

## 7. 剩余风险

本轮不阻断 IntentOrch 目标完成，但需要后续治理：

- 配置面：`modelService.enabled` 曾在服务重启后回到 false，需审查 Admin/seed/runtime-config 写回链路。
- MCP 外部依赖：部分 MCP 返回 `401/406/400/ECONNREFUSED`，自动联调 MCP 可连通但其他 server 仍需鉴权和协议配置治理。
- 模型外部依赖：IntentOrch SDK 内部 raw LLM call 曾出现 `401`，回答合成模型 breaker 曾因 `model_connect_timeout:10000` 进入半开探测；本轮候选能成功，但生产稳定性依赖模型网关治理。
- report/query 类 IntentOrch 真实工具执行仍建议补一轮专项验收，验证 report 链路 candidate 进入主链且不直接执行 raw plan。

## 8. 最终结论

准入结论：本轮可进入下一阶段。IntentOrch 已从 raw enhancement 收敛为受治理的 planner candidate，并在真实 `/api/chat` 运行态中成功产出候选、进入仲裁、被 ResponseContract/Trace 观测承载。剩余问题属于模型/MCP/Admin 配置稳定性，不改变本轮 IntentOrch 架构接入和全流程生效结论。
