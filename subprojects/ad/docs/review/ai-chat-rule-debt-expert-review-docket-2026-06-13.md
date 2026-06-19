# AI Chat 规则债务专家委员会评审 Docket

- docket id: `ai-chat-rule-debt-expert-review-docket-2026-06-13`
- inventory: `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json`
- status: `pending_review`
- runtime migration: `blocked`

## 1. 评审边界

本 docket 只用于安排和记录专家委员会评审准入，不批准 runtime 迁移。

评审范围覆盖：

- 显性硬编码。
- 业务 `if/else`。
- 人工 `signal` / route phrase / fallback。
- 长期兼容 adapter。
- 规则密度膨胀和热点文件搬家风险。
- 乱码与 UTF-8 健康。

任何 P0/P1 条目只有在 JSON 清单中补齐结构化 `review_evidence`，并通过 `npm run check:rule-debt-inventory` 后，才允许进入 runtime 迁移。

## 2. P0 阻断项逐条议程

| ID | 位置 | 当前权力 | 架构归属 | 建议处理 | 当前结论 |
|---|---|---:|---|---|---|
| `RQO-003` | `report-query-orchestrator.ts:989` `scoreCapabilityMatch` | 选工具 | Plan Arbitrator | 迁移到契约 | `pending` |
| `RQO-004` | `report-query-orchestrator.ts:1211` `hasStrongReportQueryIntent` | 选工具 | Request Understanding | 降级为候选 | `pending` |
| `RQO-005` | `report-query-orchestrator.ts:1234` `selectReportToolForType` | 选工具 | Capability Discovery | 迁移到契约 | `pending` |
| `RQO-011` | `report-query-orchestrator.ts:4080` `executeReportQueryStep` | 生成最终回答 | Answer Composer | 拆成契约字段 | `pending` |
| `RU-004` | `request-understanding.ts:525` `deriveRequestRouteDecision` | 选工具 | Plan Arbitrator | 拆成契约字段 | `pending` |
| `API-006` | `route.ts:2356` `routePreferredReportCapability` | 选工具 | Capability Discovery | 迁移到契约 | `pending` |

## 3. P0 通过条件

每个 P0 条目必须逐条满足：

- 架构负责人确认不新增平行 Contract / Schema / OS。
- Chat Runtime 负责人确认 Request Understanding、Plan Arbitrator、Capability Discovery、Execution Policy、Answer Composer 边界清晰。
- 业务域负责人确认规则保留或迁移有真实业务价值，不是测试样例补丁。
- 数据/模型负责人确认 signal 只作为弱候选，不替代 Planner、Evidence 或 Tool Contract。
- QA/Eval 负责人确认覆盖非硬编码补测、业务负例、乱码健康、真实 `/api/chat` 或等价 runtime regression。
- 安全/治理负责人确认权限、敏感信息、ContractSafety、Trace 不被绕过。
- 产品负责人确认用户结果不退化，不暴露内部术语。

## 4. 分批建议

| Batch | 条目 | 目标 |
|---|---|---|
| `B1-route-authority` | `RU-004`, `RQO-004` | 先把路由权降级为 planner candidate + arbitration trace |
| `B2-capability-selection` | `RQO-003`, `RQO-005`, `API-006` | 把工具/能力选择迁到 Capability Discovery + Plan Arbitrator |
| `B3-report-execution-split` | `RQO-011` | 拆分 preflight、dictionary resolver、tool execution、evidence normalization、answer composition |

## 5. 当前结论

当前所有 P0 条目均为 `pending`。

- 不允许改 runtime。
- 不允许删除现有规则。
- 不允许把 seed/config 当作合规豁免。
- 允许继续补评测样本、Trace 观测设计和迁移方案。
