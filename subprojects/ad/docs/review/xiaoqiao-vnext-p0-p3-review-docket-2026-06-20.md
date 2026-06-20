# 小乔智投 VNext P0-P3 多角色评审记录

- 日期：2026-06-20
- 来源：`小乔智投AI服务平台白皮书_VNext_内部查看版.pdf`
- 架构真源：`docs/architecture/ENTERPRISE_AI_CHAT_OS_SPEC.md`
- 守护规范：`docs/architecture/governance/ai-chat-implementation-guardrails.md`
- 结论：P0/P1 可进入受治理实施；P2/P3 只能按 shadow、建议或受控自动化等级逐步推进。

## 当前问题边界

- 运行面：`/api/chat` 已有 pipeline、问数、拼表、公开联网、诊断、包查询、Evidence Ledger、Guardrail；仍需验证真实登录态、MCP 入参和证据一致性。
- 控制面：Prompt、MCP、路由规则、能力、模型、自动任务配置已有基础；仍需补齐五大能力中心、自动化等级和审批策略治理字段。
- 展示面：会话工作台、资料与结果、自动任务、右侧运行过程已有入口；不得退回后台 dashboard。
- 观测面：Trace、planner shadow、二轮验收记录已有基础；Evidence Ledger 需要按 case 和 stage 形成可审计证据链。
- 配置面：ServiceCatalog、CapabilityManifest、Metric Catalog、Prompt、MCP、Feature flags 是治理入口；业务差异不得散落到 stage、renderer 或 Prompt if/else。

## 多角色评审

| 角色 | 结论 | 阻断项 |
|---|---|---|
| 产品/业务 | 有条件通过 | P0 只承诺统一服务入口和可信数据入口；P2/P3 不提前承诺全自动投放。 |
| 架构 | 有条件通过 | 五大中心只能作为 ServiceCatalog/CapabilityManifest 分类，不得新增平行协议。 |
| 数据/数仓 | 有条件通过 | 指标、报表域、字段解释、数据权限必须来自受治理目录和真实工具。 |
| MCP/旧智投 | 有条件通过 | Tool Contract、错误码、权限失败、回滚能力和返回样本必须冻结。 |
| 前端体验 | 有条件通过 | 用户页面必须保持会话驱动、任务承接、证据披露和下一步动作。 |
| 风险合规 | 有条件通过 | L3+ 动作必须确认和审计；L4/L5 必须有回滚策略和长期评测证据。 |
| QA/观测 | 有条件通过 | 真实 `/api/chat`、SSE、页面回放、Trace、Evidence、乱码和非硬编码补测必须通过。 |

## P0 Gate

- ServiceCatalog 和 CapabilityManifest 包含 `center`、`serviceLine`、`automationLevel`、`riskLevel`、`evidenceNeed`、`outputSurface`、`approvalPolicy`。
- Output Guardrail error 不只写 metadata，必须阻断或降级最终响应。
- Evidence Ledger 至少支持 case、conversation、stage 维度。
- Metric/report domain 映射进入 Metric Catalog / Report Catalog，不留在通用 stage 内。
- 用户可见入口使用产品语言，如“资料与结果”“自动任务”“处理进展”。

## 后续验收

- 静态：`npm.cmd run ts-check`、`npm.cmd run validate:ad-ui`、`git diff --check`、乱码扫描。
- 真实链路：刷新登录态后重跑 MIG-050~068，校验 intent、slot、tool、MCP 入参、Evidence、SourceRef、ToolCallTrace、最终回答和 UI 展示。
- 产品用例：查数、复合拼表、取包、联调、诊断、定时报表、资料引用、自动任务创建各至少 1 条端到端用例。
