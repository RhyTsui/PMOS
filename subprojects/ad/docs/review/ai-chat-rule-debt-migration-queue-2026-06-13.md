# AI Chat 规则债务迁移候审队列

- queue id: `ai-chat-rule-debt-migration-queue-2026-06-13`
- inventory: `docs/review/ai-chat-rule-debt-inventory-2026-06-13.json`
- expert review docket: `docs/review/ai-chat-rule-debt-expert-review-docket-2026-06-13.md`
- B5 review packet: `docs/review/ai-chat-rule-debt-b5-public-source-review-packet-2026-06-14.md`
- browser E2E evidence: `docs/review/e2e/browser-e2e-results-20260615.md`
- status: `blocked_pending_expert_review`
- runtime migration: `blocked`
- human final approval: `docs/review/ai-chat-runtime-p0p1-human-final-approval-2026-06-15.md`

## 1. 队列原则

本队列不是迁移批准书。它只把 P0/P1 规则债务排成候审批次，确保每条都有明确去向、准入条件和验证要求。

硬约束：

- 未补齐 `review_evidence` 的条目不得改 runtime。
- P0 必须逐条评审；P1 可按同类批次评审，但必须覆盖 owner、边界、验证和退出条件。
- 任何批次都不能新增平行 Contract / Schema / OS。
- 任何批次都不能把 seed/config 当作合规豁免。
- 每批必须通过 `npm run check:rule-debt-inventory`、`npm run check:runtime-migration-gate` 和 `npm run validate:ad-ui`。
- 当 `check:runtime-migration-gate` 检测到未评审 runtime diff 时，迁移队列保持 `blocked`，不得通过抬高源码密度基线或扩展 allowlist 绕过。

## 2. 候审批次

| Batch | 条目 | 目标架构 | 准入状态 |
|---|---|---|---|
| `B1-request-understanding` | `RU-001`, `RU-002`, `RU-003`, `RU-004`, `RQO-004`, `API-003`, `API-004` | Request Understanding 输出弱候选；Plan Arbitrator 决策；current-turn explicit input 优先 | `blocked` |
| `B2-capability-discovery` | `RQO-001`, `RQO-003`, `RQO-005`, `RQO-009`, `RQO-010`, `API-006`, `RCM-001`, `RCM-004` | Capability Manifest / Tool Contract / resolver candidate；候选、拒绝原因和覆盖证据入 Trace | `blocked` |
| `B3-metric-and-admin-seed` | `RQO-002`, `ADP-001`, `ADP-002`, `RCM-002`, `RTC-004` | Metric Catalog / Admin governed config；owner、version、rollout、退出条件和评测覆盖 | `blocked` |
| `B4-execution-policy-fallback` | `RQO-007`, `RQO-008`, `MCP-001` | Execution Policy / MCP outcome taxonomy；fallback 分类、重试上限、禁止安全绕过 | `blocked` |
| `B5-public-source-arbitration` | `PWR-001`, `PWR-002`, `PWR-003`, `FNR-001`, `FNR-002`, `API-005`, `API-008`, `API-009`, `OAPC-002`, `RTC-001`, `RTC-002`, `WSR-001` | Knowledge/Public Web source arbitration；公开来源与内部数据冲突入 Trace | `blocked` |
| `B6-answer-model-trace` | `RQO-011`, `MR-001`, `API-001`, `API-002`, `API-007`, `OAPC-001` | Answer Composer / Model Service / ResponseContract / Trace 只读 projection | `blocked` |

## 3. 条目覆盖表

| ID | Batch | 当前处理建议 | 迁移准入 |
|---|---|---|---|
| `RQO-001` | `B2-capability-discovery` | 迁移到契约 | `pending_review_evidence` |
| `RQO-002` | `B3-metric-and-admin-seed` | 迁移到契约 | `pending_review_evidence` |
| `RQO-003` | `B2-capability-discovery` | 迁移到契约 | `pending_review_evidence` |
| `RQO-004` | `B1-request-understanding` | 降级为候选 | `pending_review_evidence` |
| `RQO-005` | `B2-capability-discovery` | 迁移到契约 | `pending_review_evidence` |
| `RQO-007` | `B4-execution-policy-fallback` | 迁移到契约 | `pending_review_evidence` |
| `RQO-008` | `B4-execution-policy-fallback` | 迁移到契约 | `pending_review_evidence` |
| `RQO-009` | `B2-capability-discovery` | 迁移到契约 | `pending_review_evidence` |
| `RQO-010` | `B2-capability-discovery` | 拆成契约字段 | `pending_review_evidence` |
| `RQO-011` | `B6-answer-model-trace` | 拆成契约字段 | `pending_review_evidence` |
| `RU-001` | `B1-request-understanding` | 进入受治理配置 | `pending_review_evidence` |
| `RU-002` | `B1-request-understanding` | 降级为候选 | `pending_review_evidence` |
| `RU-003` | `B1-request-understanding` | 降级为候选 | `pending_review_evidence` |
| `RU-004` | `B1-request-understanding` | 拆成契约字段 | `pending_review_evidence` |
| `ADP-001` | `B3-metric-and-admin-seed` | 进入受治理配置 | `pending_review_evidence` |
| `ADP-002` | `B3-metric-and-admin-seed` | 进入受治理配置 | `pending_review_evidence` |
| `PWR-001` | `B5-public-source-arbitration` | 拆成契约字段 | `pending_review_evidence` |
| `PWR-002` | `B5-public-source-arbitration` | 降级为候选 | `pending_review_evidence` |
| `PWR-003` | `B5-public-source-arbitration` | 迁移到契约 | `pending_review_evidence` |
| `FNR-001` | `B5-public-source-arbitration` | 迁移到契约 | `pending_review_evidence` |
| `FNR-002` | `B5-public-source-arbitration` | 降级为候选 | `pending_review_evidence` |
| `MCP-001` | `B4-execution-policy-fallback` | 迁移到契约 | `pending_review_evidence` |
| `MR-001` | `B6-answer-model-trace` | 保留但隔离 | `pending_review_evidence` |
| `API-001` | `B6-answer-model-trace` | 拆成契约字段 | `pending_review_evidence` |
| `API-002` | `B6-answer-model-trace` | 迁移到契约 | `pending_review_evidence` |
| `API-003` | `B1-request-understanding` | 降级为候选 | `pending_review_evidence` |
| `API-004` | `B1-request-understanding` | 降级为候选 | `pending_review_evidence` |
| `API-005` | `B5-public-source-arbitration` | 拆成契约字段 | `pending_review_evidence` |
| `API-006` | `B2-capability-discovery` | 迁移到契约 | `pending_review_evidence` |
| `API-007` | `B6-answer-model-trace` | 拆成契约字段 | `pending_review_evidence` |
| `API-008` | `B5-public-source-arbitration` | 迁移到契约 | `pending_review_evidence` |
| `API-009` | `B5-public-source-arbitration` | 迁移到契约 | `pending_review_evidence` |
| `RCM-001` | `B2-capability-discovery` | 迁移到契约 | `pending_review_evidence` |
| `RCM-002` | `B3-metric-and-admin-seed` | 进入受治理配置 | `pending_review_evidence` |
| `RCM-004` | `B2-capability-discovery` | 迁移到契约 | `pending_review_evidence` |
| `RTC-001` | `B5-public-source-arbitration` | 进入受治理配置 | `pending_review_evidence` |
| `RTC-002` | `B5-public-source-arbitration` | 进入受治理配置 | `pending_review_evidence` |
| `OAPC-001` | `B6-answer-model-trace` | 降级为候选 | `pending_review_evidence` |
| `OAPC-002` | `B5-public-source-arbitration` | 迁移到契约 | `pending_review_evidence` |
| `RTC-004` | `B3-metric-and-admin-seed` | 保留但隔离 | `pending_review_evidence` |
| `WSR-001` | `B5-public-source-arbitration` | 迁移到契约 | `pending_review_evidence` |

## 4. 当前结论

41/45 条目已获 `approved_with_conditions`（人工最终批准 2026-06-15）。
剩余 4 条为 P2（`RQO-006`, `MR-002`, `RCM-003`, `RTC-003`），不阻断 runtime。

**浏览器 E2E 6/6 通过**（2026-06-15），覆盖 B5 批次全部公开来源验证场景：
- 知识库命中/无命中/stale 信号 ✅
- 公网检索官方来源 ✅
- 低相关性正确拒绝 ✅
- 天气查询 (Open-Meteo) ✅

`runtime_migration_gate` 元数据仍保持 `blocked` 策略语义（人工批准条件 #3），
直到后续真实验收补齐并更新治理门禁。
