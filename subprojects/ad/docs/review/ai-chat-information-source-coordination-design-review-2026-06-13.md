# 通用 Chat 信息源协同设计专家委员会复审

- status: `design_pass_runtime_gate_pending`
- design: `docs/architecture/request-understanding/information-source-coordination-design.md`
- canonical spec: `docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
- runtime repair review: `docs/review/ai-chat-information-source-arbitration-review-2026-06-13.md`
- reviewed at: 2026-06-13

## 1. 审查对象

本次审查对象是设计方案，不是 runtime 全量验收。

审查问题：

1. 公开联网、内部 MCP/API、内部知识库、IntentOrch、用户上下文在 Planner / Evidence / Composer 里的优先级是否清楚。
2. 是否回答“先查能力再候选”还是“先排查再查能力再候选”。
3. 业务域是否需要，若需要应如何治理。
4. 是否避免特殊处理、业务关键词抢路由和不可覆盖的样例补丁。
5. 是否符合 Enterprise AI Chat OS 的 `Planner-first, tool-grounded, contract-guarded`。

## 2. 前置事实

- 当前代码已有最小运行态修复：`info_source_arbitration` 已进入 `/api/chat` 部分 response metadata / trace extra。
- 公开联网的 `required` 已不应作为排除内部问数/MCP 的条件。
- `runtime-config.ts` 默认 `businessDataSignals` 已清空，业务词表不再作为 public web 路径权威。
- 仍未完成的 runtime 证据：真实 `/api/chat` 全量回归、问数分支知识库候选采纳/拒绝、混合场景端到端验收。

## 3. 初审结论

结论：`revise`

初审发现：

- “先查能力”容易把 Capability Discovery 错当主 planner，公开事实和知识问题会被过早收窄。
- “先排查再查能力”容易把 public web need 或意图排查错当路径权威，仍可能抢内部工具。
- 知识库在问数链路中的角色不够明确，容易只在开放回答里生效。
- 业务域如果只说“不要硬编码”，会被误解为完全去业务域，导致 B 端数据产品不可用。
- Composer 输入边界需要更硬，否则 raw tool result、raw KB chunk、route rules 仍可能绕过 Evidence Ledger。

处理：已要求设计改成“证据需求理解 + 五类候选 + 统一仲裁 + 执行取证 + 证据仲裁 + Composer”的链路，并补充业务域治理和 Composer 白名单。

## 4. 修订后评审

| 评审角色 | 结论 | 依据 |
|---|---|---|
| B 端数据产品专家 | pass | 方案保留业务域，但将业务差异放到 manifest、metric catalog、tool metadata、knowledge policy 和 Admin policy；内部数据、内部口径、公开事实的用户心智清楚。 |
| AI 架构专家 | pass | 链路是 Request Understanding -> candidate harvesting -> Plan Arbitrator -> Evidence Collection -> Composer -> ContractSafety；IntentOrch 和上下文均为候选/弱信号。 |
| 数据治理专家 | pass | 公开联网被拆成 need candidate 和 evidence candidate；每个候选要求采纳/拒绝原因、SourceRef/EvidenceRef、风险和 Trace。 |
| 安全与合规专家 | pass | 内部数据保护优先；公开联网不能覆盖内部能力；Composer 不接收 raw/private payload；无证据不能确定回答。 |
| 前端体验专家 | pass | 方案不要求前端反推语义；前端继续消费 ResponseContract / DisclosureProjection；不涉及用户页面文案改动。 |

综合结论：`design_pass_runtime_gate_pending`

## 5. 通过条件的解释

本结论表示设计可以交给用户审查，并可作为后续 runtime 实施门禁。

本结论不表示：

- 真实 `/api/chat` 全量回归已经通过。
- 知识库候选已在问数分支完整落地。
- 所有 Composer 路径都已完成 raw payload 隔离。
- 可以把已有最小修复直接视作最终完成。

## 5.1 补充复审：冲突矩阵与反模式

补充审查项：

- 设计是否给出信息源冲突时的让位关系。
- 设计是否明确哪些实现即使能修 case 也必须阻断。
- 设计是否把用户审查点转化为可逐条判断的清单。

补充结论：`pass`

依据：

- `docs/architecture/request-understanding/information-source-coordination-design.md` 第 15 节已补充冲突决策矩阵，覆盖当前轮输入、内部 MCP/API、知识库、公开网页、IntentOrch、用户上下文、权限和 model-only 的典型冲突。
- 第 16 节已补充反模式与阻断判定，明确业务词 `includes()`、public web heuristic 业务词放行/阻断、IntentOrch 直接执行、知识库直答、Composer 读取 raw payload、公开联网失败后模型补事实等均不得通过。
- 第 17 节已补充用户审查清单，便于在进入 runtime 实施前由用户确认关键产品判断。

## 6. 后续实施不得越过的门禁

1. 公开联网 `required` 只能进入仲裁，不得排除内部能力。
2. Capability Discovery 必须产生候选和可执行性证据，不得按业务关键词硬切路由。
3. IntentOrch 只能给候选摘要，不得直接改工具或参数。
4. 用户上下文只能填空或调整表达，不得覆盖当前轮显式输入。
5. 知识库命中和公开来源都必须经过相关性、权限、时效和来源检查。
6. Composer 只能消费 Evidence Ledger、SourceRef、ToolCallTrace、ArbitrationSummary 和 safe context。
7. 每个候选必须有采纳/拒绝原因并进入 Trace。
8. 业务域规则必须可定位到 manifest、metadata、catalog、policy、Admin config 或 governed seed。
9. 非硬编码回归必须覆盖同义表达、不含原关键词、业务负例、低相关公开来源。
10. 真实 `/api/chat` 回归未通过前，状态不得升级为 runtime pass。

## 7. 用户审查建议

建议重点审查三个判断：

1. “Capability Discovery 是候选生成的权威输入，不是全局前置主脑”是否符合你的产品直觉。
2. “公开联网两阶段：need candidate 与 evidence candidate 分离”是否足以避免外部搜索抢内部工具。
3. “业务域需要保留，但只能治理化存在”是否能覆盖广告/B 端数据场景，同时避免特殊处理显得蠢。
