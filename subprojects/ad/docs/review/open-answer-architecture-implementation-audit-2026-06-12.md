# 开放式回答架构实施审查记录（2026-06-12）

## 1. 审查范围

本记录覆盖通用 Chat 架构治理目标中的开放式回答质量提升、IntentOrch 增强层纳入、Prompt 变量治理、Answer Composer 证据边界、ResponseContract / Observability 投影和乱码门禁。

本记录不替代上线后的真实用例测试。真实浏览器、登录态、SSE、Network payload、刷新回放和用户确认仍需在用例验收阶段执行。

## 2. 当前真实表现与边界

### 运行面

- 开放式回答已从固定模板兜底逐步收口到 `planner_first_context -> chat_answer -> ContractSafety / ResponseContract`。
- `chat_answer` 使用模型服务 resilience；模型失败后使用上下文安全降级回答，不再直接返回固定的“我已收到你的问题”。
- IntentOrch 已作为开放式回答的 planner candidate 输入，并设置短超时，不阻塞主回答链路。

### 控制面

- Prompt 变量已声明 `intentorch_candidate`、`planner_candidates`、`arbitration_summary`。
- `chat_answer`、`answer_composition`、`knowledge_answer` 均受 PromptVariableSchema required / optional / forbidden 校验。
- 禁止变量包括 `raw_tool_args`、`raw_tool_result`、`raw_kb_chunks_not_filtered`、`route_rules`、`tool_priority`、`prompt_hidden_reasoning`、`model_chain_of_thought`、`full_user_profile`。

### 展示面

- 本轮不改 UI 展示结构。
- 主消息仍通过 MessageContract / ResponseContract 输出，前端不应从自然语言正文反推 planner、工具或来源。

### 观测面

- `intent_orch.candidate` 事件已加入 ProcessEventType。
- 开放式回答的 `open_answer_planning` metadata 已写入 `answer_origin.metadata` 和 `ResponseContract.metadata`。
- metadata 包含候选来源、IntentOrch 状态、候选工具名、仲裁摘要、最终权威，不包含原始工具参数或 mappedParameters。

### 配置面

- 本轮未新增业务关键词配置，也未把测试输入写入 route / renderer / prompt glue。
- 公开联网、知识库、MCP、模型配置仍由现有控制面和运行配置管理。

## 3. 影响层级

- Request Understanding：读取路由候选作为 planner candidate，不改变现有路由决策。
- Task Planning / IntentOrch：新增开放式回答候选摘要、超时隔离和仲裁投影。
- Prompt / Model Service：`chat_answer` 接收受治理变量，不接收原始工具参数。
- ResponseContract：新增内部 metadata 投影，不改变对外主字段兼容性。
- Observability / Trace：新增可审计事件和 metadata。
- Frontend Presentation：不改渲染逻辑。
- MCP / Tool Execution：不改工具选择、参数、执行策略或 MCP 返回结构。

## 4. 硬编码风险审查

已处理：

- 移除开放式 Prompt 策略中的样例化分支，例如“如果用户问助手能做什么”“如果用户要求一句话”。
- `IntentOrch` 不直接授权工具执行，不直接修改参数。
- 降级 fallback 基于上下文信号生成，不按“你好/你能做什么”等具体输入写死答案。
- `open_answer_planning` metadata 使用专用浅结构，避免暴露 `mappedParameters`、`raw_tool_args` 和隐藏 query。

仍需持续关注：

- `route.ts` 仍然是较厚的主 handler，后续应继续把 Planner / Arbitrator / Composer 逻辑迁出。
- 问数、诊断、自动化等旧链路中仍存在业务规则和配置化规则混杂，需要按用例逐步拆分为 Contract / Config / Policy。
- 历史验收资产和 review 快照中存在大量未跟踪文件，不应被当前服务引用；若纳入提交仍需单独乱码审查。

## 5. 关键提交证据

- `2ea8da6 Govern open answer evidence contracts`
- `eb56ea9 Track IntentOrch prompt variables`
- `26308dd Inject IntentOrch candidates into open answers`
- `a957bed Remove sampled open-answer prompt branches`
- `48fddef Improve open-answer degraded fallback`
- `07fee11 Govern open-answer planner arbitration`
- `bf5fb06 Expose open-answer planning metadata`

## 6. 测试与门禁证据

已新增或更新测试：

- `frontend/src/tests/open-answer-planner-context.test.ts`
- `frontend/src/tests/open-answer-fallback.test.ts`
- `frontend/src/tests/open-answer-prompt-governance.test.ts`
- `frontend/src/tests/prompt-variable-contract.test.ts`
- `frontend/src/tests/response-contract-boundary.test.ts`
- `frontend/src/tests/model-use-case-runtime.test.ts`
- `frontend/src/tests/model-resilience.test.ts`
- `frontend/src/tests/intent-router-governance.test.ts`

已运行并通过的门禁：

- `npm.cmd exec vitest run tests/open-answer-planner-context.test.ts tests/open-answer-fallback.test.ts tests/response-contract-boundary.test.ts`
- `npm.cmd exec vitest run tests/open-answer-prompt-governance.test.ts tests/open-answer-planner-context.test.ts tests/prompt-variable-contract.test.ts`
- `npm.cmd exec vitest run tests/prompt-variable-contract.test.ts tests/response-contract-boundary.test.ts tests/model-use-case-runtime.test.ts`
- `npm.cmd run ts-check`
- `npm.cmd run check:mojibake`
- `npm.cmd run validate:ad-ui`
- `git diff --check`

## 7. 当前结论

开放式回答质量提升的核心架构缺口已完成一轮收口：Prompt 变量、IntentOrch 候选、Plan 仲裁投影、模型失败降级、ResponseContract metadata 和乱码门禁均有当前代码与测试证据。

这还不是完整上线完成证明。原因是真实 `/api/chat` 登录态链路、浏览器 DOM/SSE/Network、标题生成、刷新回放、右侧运行过程和用户确认仍需后续用例验收覆盖。

## 8. 后续上线前必测项

- `MIG-000 / 你好`：主消息自然、无内部字段、`evidence_mode` 合理、无乱码。
- `MIG-OPEN-ABILITY / 你好，请用一句话说明你现在可以帮我做什么`：不得自称设计师助手，必须综合上下文与能力，不走固定样例。
- `MIG-OPEN-KNOWLEDGE / 什么是 ROI`：知识解释不伪装知识库检索，证据不足时不声称已查询。
- `MIG-OPEN-NO-KB / 内部知识无结果`：不得编造内部资料。
- `MIG-001 / 南京本周日天气如何`：公开来源相关性、来源披露、回答排版、运行过程和乱码健康。
- 同类不同表达补测：不得只依赖上述原句关键词。

