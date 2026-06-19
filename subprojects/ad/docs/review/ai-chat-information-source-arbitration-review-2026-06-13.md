# 通用 Chat 信息源仲裁专家评审记录

- status: `pass_with_runtime_regression_pending`
- scope: `/api/chat` 中公开联网、内部能力、知识库、IntentOrch、用户上下文的候选与仲裁
- canonical spec: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
- implementation files:
  - `frontend/src/src/app/api/chat/route.ts`
  - `frontend/src/src/contracts/request-understanding/information-source-arbitration-contract.ts`
  - `frontend/src/src/lib/information-source-arbitration.ts`
  - `frontend/src/src/lib/public-web-runtime.ts`
  - `frontend/src/src/lib/runtime-config.ts`
  - `frontend/src/src/contracts/request-understanding/fact-need-contract.ts`
  - `frontend/src/src/lib/fact-need-reasoner.ts`

## 1. 评审结论

本轮实现通过“最小运行链路修复”评审，但不应直接视为完整架构收口完成。

- 可以进入下一阶段：是，作为候选仲裁和非硬编码治理的 P0 运行态修复。
- 是否允许公开联网抢占内部能力：否，已通过代码改为候选记录和内部能力优先。
- 是否仍需后续评审：是，真实 `/api/chat` 全量回归和知识库/问数混合链路仍需补证。

## 2. 专家委员会检查

| 角色 | 结论 | 依据 |
|---|---|---|
| B 端数据产品专家 | pass | 内部数据能力优先，公开联网只作为公开事实或验证候选，符合企业数据产品默认心智。 |
| AI 架构专家 | pass | `InformationSourceArbitration` 已迁入 request-understanding contract，builder 已迁入 orchestration lib，`route.ts` 只消费结果。 |
| 数据治理专家 | pass | 公开联网新增 `factNeed`、`providerEligibility`、`searchPlan`，可解释为什么能查、不能查或只能做候选。 |
| 安全与合规专家 | pass | 结构化 `hasInternalBusinessSignal` 可阻断外部查询；默认业务词表不再作为路径权威。 |
| 前端体验专家 | pass | 本次不改用户页面；新增信息进入 metadata/runtime event，前端继续消费契约，不从正文反推。 |

## 3. 必须满足的门禁

- 公开联网 `required` 不得作为排除内部问数/MCP 的条件。
- 公开联网结果默认是 `candidate_evidence`，除阻断/不可用等边界响应外，不直接抢最终主消息。
- 业务词表不得替代 Planner、Capability Manifest、Tool Contract 或 Execution Policy。
- IntentOrch 只能作为候选，不得直接改工具、参数或最终路径。
- 用户上下文只能填空和调整表达重点，不得覆盖本轮显式输入。
- 所有候选必须在 runtime/metadata 中可审计，至少包含来源、优先级、状态、原因和拒绝权威。

## 4. 当前证据

- `info_source_arbitration` 已写入开放回答、公开联网直答、问数分支的 `response_contract.metadata` / done metadata / trace extra。
- `planner.arbitrated` 事件已进入 `process_events`，用于右侧运行过程和回放。
- `information-source-arbitration.test.ts` 覆盖内部能力优先、公开联网候选/阻断、上下文弱信号。
- `runtime-config.ts` 默认 `businessDataSignals` 清空，移除广告业务词和指标词作为 public web 默认路径权威。
- `public-web-runtime.ts` 只接受上游结构化 `hasInternalBusinessSignal` 作为内部业务阻断信号。
- `tests/public-web-runtime.test.ts` 覆盖“业务词表不能成为路由权威”和“结构化内部信号能阻断外部查询”。
- 已通过验证：`vitest` 信息源仲裁/fact need/public web 共 19 个用例、`npm run ts-check`、`npm run check:rule-debt-inventory`、`git diff --check`、本任务文件乱码扫描。

## 5. 剩余风险

- 知识库候选当前在开放回答 planner context 中较完整，问数分支仍以内部工具为主，知识库补充验证还需要单独切片。
- 真实 `/api/chat` 全量回归依赖模型服务稳定；当前模型连接超时时无法证明所有真实链路 case 通过。

## 6. 下一阶段建议

1. 给问数分支补 `knowledge_candidate` 的真实证据采纳/拒绝记录。
2. 为公开联网、知识库、内部工具混合问题补真实链路验收集。
3. 将本评审状态从 `pass_with_runtime_regression_pending` 升级为 `pass` 前，必须跑通真实 `/api/chat` 回归。
