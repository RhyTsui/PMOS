# VNext AD E2E 问题清单与任务拆分（2026-06-22 20:18 回放）

本文基于真实 E2E 回放产物整理问题清单，只记录和拆分任务，不修复运行时代码。

## 证据来源

- Checkpoint：`docs/review/小乔智投测试集v1.1_second-round-20260622-201804.checkpoint.json`
- Excel：`docs/review/小乔智投测试集v1.1_second-round-20260622-201804.xlsx`
- 分析结论：`docs/review/vnext-ad-full-e2e-analysis-2026-06-22-201804.md`
- 测试集有效用例：107 条
- 当前规则债务：P0 = 6，P1 = 34

## 任务优先级总览

| 优先级 | 任务 | 原因 |
|---|---|---|
| P0 | E2E-MEM-001 全量回放 RSS 阻断 | 107 条无法完整跑完，94 条未真实执行 |
| P0 | EVAL-MISMATCH 系列评测器误判 | 脚本 pass 不能代表 Contract/Evidence 合格 |
| P0 | CASE-FAIL-R12 MIG-010 空回答 | 已执行用例中的明确功能失败 |
| P0 | 规则债务 P0 清零 | 当前仍有 6 个 P0 阻断项 |
| P1 | CASE-SLOW-MISSING-R14 MIG-012 慢速 missing_input | 单条 150.2s 且触发内存峰值 |
| P1 | 规则债务 P1 清零 | 当前仍有 34 个 P1 必须迁移项 |

## P0-1：全量 E2E RSS 阻断

- Issue ID：`E2E-MEM-001`
- 严重级别：P0
- 类型：全量回放阻断
- 影响范围：Excel rows 15-129 中的 94 条被阻断
- 证据：`memoryPeakMb=3308`；日志记录 `dev server 内存 3282MB 超过护栏 3072MB`
- 当前表现：完成 R014 / MIG-012 后触发内存护栏，脚本停止高 RSS server，剩余用例未执行。
- 不能上线原因：107 条有效用例没有完成真实回放，剩余 94 条无法判断业务通过/失败。

建议拆成子任务：

1. 对 rows 2-14 做单条 RSS 增量复跑，记录每条 `memoryBefore/memoryAfter`、耗时、answer 长度、contract 大小、process_events 数量。
2. 对 MIG-011、MIG-012 做深度内存观测，因为两条耗时分别为 158.4s、150.2s，且 MIG-012 后触发峰值。
3. 检查 `/api/chat` 回放期间是否保留过大的 process_events、tool trace、MCP 原始 rows、语义结果或附件/会话上下文。
4. 在不改业务逻辑前提下，先得出内存增长来源归因：缓存、payload、trace、MCP rows、SSE buffer、conversation store 或 dev server build state。

验收标准：

- 能解释从约 2.3GB 增长到 3.3GB 的主要来源。
- 能让 107 条至少完整跑完一遍，阻断不再来自 RSS 护栏。

## P0-2：评测器判定与 Contract/Evidence 不一致

当前脚本将多条无证据或 ContractSafety 阻断结果判为“通过”。这些结果不能作为上线准入证据。

| Issue ID | Row | Case | 场景 | 脚本判定 | Contract | 证据状态 |
|---|---:|---|---|---|---|---|
| `EVAL-MISMATCH-R3` | 3 | MIG-001 | 天气 | 通过 | success | Source/Evidence/ToolTrace 全 0 |
| `EVAL-MISMATCH-R4` | 4 | MIG-002 | 新闻解读 | 通过 | blocked | Source/Evidence/ToolTrace 全 0 |
| `EVAL-MISMATCH-R5` | 5 | MIG-003 | 行业文档解读 | 通过 | blocked | Source/Evidence/ToolTrace 全 0 |
| `EVAL-MISMATCH-R6` | 6 | MIG-004 | 行业知识问答 | 通过 | blocked | Source/Evidence/ToolTrace 全 0 |
| `EVAL-MISMATCH-R7` | 7 | MIG-005 | 系统知识问答 | 通过 | blocked | Source/Evidence/ToolTrace 全 0 |
| `EVAL-MISMATCH-R8` | 8 | MIG-006 | 系统操作帮助 | 通过 | blocked | Source/Evidence/ToolTrace 全 0 |
| `EVAL-MISMATCH-R9` | 9 | MIG-007 | 指标解释 | 通过 | success | Source/Evidence/ToolTrace 全 0 |
| `EVAL-MISMATCH-R10` | 10 | MIG-008 | 系统说明 | 通过 | blocked | Source/Evidence/ToolTrace 全 0 |

建议拆成子任务：

1. 修改二轮评测器准入口径：`contractStatus=blocked` 不得判通过。
2. 对需要外部事实、知识库、文档、指标解释的用例，要求 SourceRef/EvidenceRef 或明确 unsupported evidence。
3. 对“安全检查阻断”回答，统一判为阻断或失败，而不是按回答长度/关键词通过。
4. 为 MIG-001 天气类 P4 场景定义低价值但诚实的验收口径：可以不专门工具化，但不能把“无法获取实时天气”判为“含天气信息通过”。

验收标准：

- 同一 checkpoint 重新审计后，这 8 条不再被归类为合格通过。
- 输出通过率同时展示脚本原始口径与 Contract/Evidence 严格口径。

## P0-3：MIG-010 空回答

- Issue ID：`CASE-FAIL-R12`
- Excel Row：12
- Case：MIG-010
- 场景：查维度数据
- 脚本判定：失败
- 原因：空回答
- Contract：缺失
- Evidence：SourceRef/EvidenceRef/ToolTrace 全 0
- 内存：该条结束后约 2948 MB

建议拆成子任务：

1. 单独复跑 MIG-010，保存完整 SSE event、done event、response_contract、process_events。
2. 判断空回答来自哪个环节：请求理解、工具执行、Answer Composer、ContractSafety、SSE 传输或评测脚本解析。
3. 若实际 SSE 有内容但 checkpoint 为空，修评测脚本解析；若 runtime 确实空输出，再进入 runtime 修复任务。

验收标准：

- MIG-010 有明确归因，不再只是“空回答”。
- 复跑产物能指出空内容第一次出现的链路位置。

## P1-1：MIG-012 慢速 missing_input

- Issue ID：`CASE-SLOW-MISSING-R14`
- Excel Row：14
- Case：MIG-012
- 场景：查维度数据
- 脚本判定：通过
- Contract：missing_input
- 耗时：150.2s
- ToolTrace：5
- 内存：该条结束后 3308 MB
- 回答：`还需要补充应用类型解析输出后才能继续。`

建议拆成子任务：

1. 单独复跑 MIG-012，检查缺参判断发生前是否已经执行了不必要 MCP 或字典解析。
2. 检查应用类型 enum 解析是否应在 preflight 阶段完成，而不是工具链执行后才 missing_input。
3. 将“合理追问”与“高成本追问”分开评估：追问可以合理，但 150s 和 5 条 tool trace 不合理。

验收标准：

- 若最终仍需追问，应在低成本 preflight 阶段完成。
- 单条耗时和内存增长不应接近全量回放护栏。

## P0/P1 规则债务上线阻断

当前 `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json` 显示：

- P0：6 个
- P1：34 个

P0 条目：

| ID | 文件 | Symbol | 处理方向 |
|---|---|---|---|
| RQO-003 | `report-query-orchestrator.ts` | `scoreCapabilityMatch` | 迁移到契约 |
| RQO-004 | `report-query-orchestrator.ts` | `hasStrongReportQueryIntent` | 降级为候选 |
| RQO-005 | `report-query-orchestrator.ts` | `selectReportToolForType` | 迁移到契约 |
| RQO-011 | `report-query-orchestrator.ts` | `executeReportQueryStep` | 拆成契约字段 |
| RU-004 | `request-understanding.ts` | `deriveRequestRouteDecision` | 拆成契约字段 |
| API-006 | `report-query-stage.ts` | `routePreferredReportCapability` | 迁移到契约 |

建议拆成子任务：

1. Report query 能力选择契约化：覆盖 RQO-003、RQO-005、API-006。
2. Report query 执行编排拆分：覆盖 RQO-011。
3. Request Understanding 路由契约化：覆盖 RU-004、RQO-004。
4. 每个子任务都必须带非硬编码反样例和 `check:rule-debt-inventory` 下降证据。

验收标准：

- P0 归零。
- P1 有 owner、迁移方案、验证方式和退出日期。
- 规则债务门禁不只是通过，还能证明对应 P0 条目已从 inventory 中退休或降级。

## 建议执行顺序

1. 先做 `E2E-MEM-001`，否则 107 条无法完整回放，后续通过率没有意义。
2. 并行做 `EVAL-MISMATCH`，否则 pass/fail 口径不可信。
3. 单独归因 `CASE-FAIL-R12` 和 `CASE-SLOW-MISSING-R14`。
4. 再进入 P0 规则债务清零。
5. 最后重新跑 107 条全量 E2E，生成严格口径通过率和上线准入结论。

