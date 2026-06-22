# VNext AD 上线准入矩阵（基于 2026-06-22 20:18 E2E）

本文基于真实 E2E 回放结果生成上线准入判定矩阵，只记录结论，不修复代码。

## 证据来源

- Checkpoint：`docs/review/小乔智投测试集v1.1_second-round-20260622-201804.checkpoint.json`
- Excel：`docs/review/小乔智投测试集v1.1_second-round-20260622-201804.xlsx`
- 分析报告：`docs/review/vnext-ad-full-e2e-analysis-2026-06-22-201804.md`
- 问题清单：`docs/review/vnext-ad-e2e-issue-backlog-2026-06-22-201804.md`

## 准入结论

当前不可上线。

原因：

1. 107 条有效用例没有完成真实回放，94 条被 RSS 护栏阻断。
2. 脚本通过率与严格证据口径差异很大，不能直接作为质量结论。
3. P0/P1 规则债务仍未清零。
4. Evidence Ledger、SourceRef、ToolCallTrace 在多类用例中缺失。

## 脚本口径 vs 严格准入口径

| 口径 | 通过 | 失败 | 阻断/未执行 | 其他 | 通过率 |
|---|---:|---:|---:|---:|---:|
| 二轮脚本原始口径 | 12 | 1 | 94 | 0 | 11.2% |
| Strict Gate 口径 | 3 | 1 | 94 | 9 | 2.8% |

Strict Gate 口径说明：

- `strict_pass`：连通用例有有效回答，或业务用例同时满足 `contractStatus=success`、SourceRef、EvidenceRef、ToolCallTrace 和 grounded execution。
- `evidence_incomplete`：脚本判通过，但 SourceRef/EvidenceRef/ToolCallTrace 不满足。
- `contract_blocked`：ContractSafety 或 ResponseContract 已阻断。
- `needs_input`：进入追问/缺参状态，不算最终通过。
- `blocked_not_executed`：因系统护栏未真实执行。

## Strict Gate 分布

| 状态 | 数量 | 含义 |
|---|---:|---|
| `strict_pass` | 3 | 严格意义上可作为局部正样本 |
| `evidence_incomplete` | 2 | 脚本判通过但证据不完整 |
| `contract_blocked` | 6 | 脚本判通过但 Contract 已阻断 |
| `failed` | 1 | 明确失败 |
| `needs_input` | 1 | 缺参追问，且本轮耗时/内存异常 |
| `blocked_not_executed` | 94 | RSS 护栏导致未真实执行 |

## 严格通过样本

| Row | Case | 场景 | 说明 |
|---:|---|---|---|
| 2 | MIG-000 | 连通 | 有有效欢迎回答，作为连通样本通过 |
| 11 | MIG-009 | 查大盘数据 | `contractStatus=success`，SourceRef=1，EvidenceRef=2，ToolTrace=2 |
| 13 | MIG-011 | 查明细数据 | `contractStatus=success`，SourceRef=2，EvidenceRef=3，ToolTrace=2 |

注意：MIG-011 耗时 158.4s，虽然严格证据口径通过，但仍有性能风险。

## 不应计入通过的样本

| Row | Case | 脚本判定 | Strict Gate | 原因 |
|---:|---|---|---|---|
| 3 | MIG-001 | 通过 | evidence_incomplete | 无 SourceRef/EvidenceRef/ToolTrace，且回答无法获取实时天气 |
| 4 | MIG-002 | 通过 | contract_blocked | Contract blocked，回答为安全检查阻断 |
| 5 | MIG-003 | 通过 | contract_blocked | Contract blocked，回答为安全检查阻断 |
| 6 | MIG-004 | 通过 | contract_blocked | Contract blocked，回答为安全检查阻断 |
| 7 | MIG-005 | 通过 | contract_blocked | Contract blocked，回答为安全检查阻断 |
| 8 | MIG-006 | 通过 | contract_blocked | Contract blocked，回答为安全检查阻断 |
| 9 | MIG-007 | 通过 | evidence_incomplete | 无证据，且回答要求用户补充上下文 |
| 10 | MIG-008 | 通过 | contract_blocked | Contract blocked，回答为安全检查阻断 |
| 14 | MIG-012 | 通过 | needs_input | 缺参追问，不是最终业务通过；耗时 150.2s |

## 上线阻断清单

| 阻断项 | 状态 | 证据 |
|---|---|---|
| 107 条真实回放完成 | 未完成 | 94 条因 RSS 护栏阻断 |
| P0 清零 | 未完成 | `ai-chat-rule-debt-inventory` 当前 P0=6 |
| P1 清零 | 未完成 | `ai-chat-rule-debt-inventory` 当前 P1=34 |
| 评测器可信 | 未完成 | 8 条脚本通过但 Strict Gate 不通过 |
| Evidence Ledger 闭环 | 未完成 | 天气、新闻、知识、文档类样本缺 Source/Evidence/ToolTrace |
| 内存稳定性 | 未完成 | `memoryPeakMb=3308`，超过 3072MB 护栏 |

## 下一次回放前置条件

1. 能完整跑完 107 条，不因 RSS 护栏提前终止。
2. 二轮脚本输出原始口径和 Strict Gate 口径两套统计。
3. blocked contract、缺证据、空回答不得归为通过。
4. P0/P1 inventory 必须纳入准入汇总。
5. 每次回放必须保留 checkpoint、xlsx、日志和严格口径审计结果。

