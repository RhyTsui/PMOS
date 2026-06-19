# AI Chat 13 核心链路 LLM 使用审查

- 日期：2026-06-12
- 范式：Planner-first, tool-grounded, contract-guarded
- 范围：`/api/chat`、`capability-orchestration`、`report-query-orchestrator`

## 结论

当前主链路已从“LLM 直接决策”收敛到“LLM 生成理解、候选、解释和综合，规则、契约、preflight、MCP 返回与 ContractSafety 保持最终权威”。本轮继续清理了一个未使用的业务词加分函数，并补了回归，避免能力选择从工具名/描述里的指标词获得隐式加分。

## 13 个链路审查

| # | 链路 | 当前用途 | 权威边界 | 本轮结论 |
|---|---|---|---|---|
| 1 | 路由决策 | `intent_routing_review` 提供结构化信号 | `deriveRequestRouteDecision` 和 route rules 仲裁 | LLM 不直接作为最终路由 |
| 2 | 意图理解 | `request_understanding` 补充 corrections | 只在规则缺失字段时合并弱信号 | 需继续收紧 schema 字段 |
| 3 | 能力发现 | `capability_discovery` 输出 relevance/dependencies | `selectCapabilityForRequirement`、coverage、manifest 决定执行 | 本轮删除未使用业务词加分 |
| 4 | 工具消歧 | `tool_selection_review` 只在近分候选内生效 | 必须命中 top candidates 且 dataCoverage covered | 已有门禁 |
| 5 | 实体解析 | `entity_candidate_extraction` 输出候选集 | 字典 resolver 和 entity config 做最终解析 | LLM 不直接写最终 ID |
| 6 | 参数补全 | `query_contract_building` 输出 semanticCandidateSet | resolver/preflight/MCP schema 决定最终入参 | 仍需后续审查字段白名单 |
| 7 | 多轮状态 | `trace_summary` 输出继承槽位 | 仅空槽位可继承，不能覆盖明确输入 | 需补更多负例 |
| 8 | 工具编排 | report orchestrator 基于 contract/tool chain 执行 | orchestrator 决定调用顺序 | LLM 仅提供候选理解 |
| 9 | 参数构造 | model candidate sets 进入 resolver lane | `buildReportToolInput` 和 resolved filters 为准 | 需继续清理旧 fallback |
| 10 | 失败处理 | `operation_risk_review` 解释失败 | MCP retry contract 决定是否重试同工具 | 已禁止 LLM 改参数或换工具 |
| 11 | 结果合并 | `report_summary` 生成摘要 | 工具结果、message contract、semantic result 限定事实 | LLM 不修改工具事实 |
| 12 | 响应解析 | `data_result_interpretation` 解释数据 | data result/quality check 限定事实 | 需继续补无证据断言回归 |
| 13 | 答案生成 | `chat_answer` / report composer 综合回答 | Prompt 变量契约、ResponseContract、ContractSafety | 开放回答已加上下文候选淘汰 |

## 本轮修复

- 删除 `capability-orchestration.ts` 中未使用的 `metricAffinityScore`，去掉 ROI、留存、消耗等散落业务词加分逻辑。
- 能力评分继续由 Capability Manifest / Semantic Surface 的 supported metrics、dimensions、granularity、identifier types 驱动。
- 新增回归：工具名或描述包含指标词时，如果 manifest 不声明支持该指标，不能获得隐式加分。
- 将工具消歧与 MCP 失败重试的运行日志中文化，减少观测面英文/工程语义外露。

## 剩余风险

- `report-query-orchestrator.ts` 仍存在较多受治理 seed、policy、legacy adapter 和字段标签映射，需要逐段分级，不能一次性删除。
- `request_understanding`、`trace_summary`、`query_contract_building` 的输出合并仍需更多负例测试，防止 LLM 覆盖明确用户输入。
- `public-web-runtime.ts` 的公开联网判定已分成能力候选和结果候选，但内部数据保护规则仍需持续配置化审查。
- 13 链路的完整上线验收仍需真实 MIG 用例和非硬编码补测。
