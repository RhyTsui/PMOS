# VNext AD 107 条有效用例真实 E2E 回放分析（2026-06-22 20:18）

本轮只做真实 E2E 回放与问题记录，不修复运行时代码。

## 回放产物

- Checkpoint：`docs/review/小乔智投测试集v1.1_second-round-20260622-201804.checkpoint.json`
- Excel：`docs/review/小乔智投测试集v1.1_second-round-20260622-201804.xlsx`
- 日志：`docs/review/second-round-full-e2e-20260622-2018.log`
- 测试集：`E:/AI/ai-os/docs/sources/inbox/小乔智投测试集v1.1.xlsx`
- 有效用例：107 条

## 总体结果

| 指标 | 数量 |
|---|---:|
| 总用例 | 107 |
| 脚本判定通过 | 12 |
| 脚本判定失败 | 1 |
| 脚本判定阻断 | 94 |
| 脚本错误 | 0 |
| 脚本通过率 | 11.2% |
| 实际执行到有回答/契约结果的用例 | 13 |
| 内存峰值 | 3308 MB |

本轮不能作为上线准入通过证据。主要原因不是业务用例已经全部失败，而是全量回放在第 13 个有效用例后触发 dev server RSS 内存护栏，剩余 94 条未执行，均被记录为阻断。

## 关键阻断

### 1. 全量回放被 RSS 内存护栏提前终止

- 触发点：完成 R014 / MIG-012 后。
- 日志记录：`dev server 内存 3282MB 超过护栏 3072MB`
- checkpoint 峰值：`memoryPeakMb=3308`
- 脚本动作：停止超过内存护栏的服务进程。
- 影响：R015 之后的 94 条用例没有真实业务结果，只能归类为内存阻断，不能用于功能通过/失败判断。

### 2. 评测器 pass 与 ResponseContract 严重不一致

脚本判定通过的 12 条中，至少 8 条不具备可上线的证据闭环：

| Excel Row | Case | 场景 | 脚本判定 | Contract | 证据状态 | 观察 |
|---:|---|---|---|---|---|---|
| 3 | MIG-001 | 天气 | 通过 | success | 无 SourceRef/EvidenceRef/ToolCallTrace | 回答称无法获取实时天气，却因“含天气信息”通过 |
| 4 | MIG-002 | 新闻解读 | 通过 | blocked | 无证据 | 输出为“未通过证据和安全检查” |
| 5 | MIG-003 | 行业文档解读 | 通过 | blocked | 无证据 | 输出为“未通过证据和安全检查” |
| 6 | MIG-004 | 行业知识问答 | 通过 | blocked | 无证据 | 输出为“未通过证据和安全检查” |
| 7 | MIG-005 | 系统知识问答 | 通过 | blocked | 无证据 | 输出为“未通过证据和安全检查” |
| 8 | MIG-006 | 系统操作帮助 | 通过 | blocked | 无证据 | 输出为“未通过证据和安全检查” |
| 9 | MIG-007 | 指标解释 | 通过 | success | 无证据 | 回答要求用户补充上下文，不是有效指标解释 |
| 10 | MIG-008 | 系统说明 | 通过 | blocked | 无证据 | 输出为“未通过证据和安全检查” |

结论：当前二轮评测器不能只看脚本 pass/fail。上线准入必须以 ResponseContract、EvidenceRef、SourceRef、ToolCallTrace、ContractSafety 与业务期望共同判定。

### 3. 第一条明确功能失败：MIG-010 空回答

- Excel Row：12
- Case：MIG-010
- 场景：查维度数据
- 脚本判定：失败
- 原因：空回答
- Contract：缺失
- 证据：无 SourceRef、无 EvidenceRef、无 ToolCallTrace
- 内存：该条结束后 server RSS 约 2948 MB

### 4. MIG-012 进入 missing_input，但代价过高

- Excel Row：14
- Case：MIG-012
- 场景：查维度数据
- 脚本判定：通过
- 原因：合理追问
- Contract：missing_input
- 回答：`还需要补充应用类型解析输出后才能继续。`
- 证据：SourceRef 3、EvidenceRef 1、ToolCallTrace 5
- 耗时：150.2s
- 内存：该条结束后记录约 3308 MB，并触发全量阻断

这说明链路能走到工具/证据，但缺参或 enum 解析仍会造成高成本执行，且可能伴随内存增长。

## 真正具备较强通过证据的用例

本轮只有两条报表查询具备相对完整的契约证据：

| Excel Row | Case | 场景 | Contract | SourceRef | EvidenceRef | ToolTrace | 观察 |
|---:|---|---|---|---:|---:|---:|---|
| 11 | MIG-009 | 查大盘数据 | success | 1 | 2 | 2 | 有数据回答与契约证据 |
| 13 | MIG-011 | 查明细数据 | success | 2 | 3 | 2 | 有结论、证据、口径，耗时 158.4s |

这两条可以作为后续问数链路继续分析的样本，但不能代表 107 条整体可上线。

## 问题分类

1. **内存/RSS 阻断**
   - 94 条未执行。
   - 优先级最高，因为它阻止真实全量回放。

2. **评测器误判**
   - blocked contract、无证据、空洞 fallback 被判通过。
   - 当前 pass rate 不可信。

3. **Evidence Ledger 不闭环**
   - 天气、新闻、行业文档、系统知识类用例多为 SourceRef/EvidenceRef/ToolCallTrace 为空。
   - 有些甚至 ContractSafety 已阻断，但脚本仍判通过。

4. **查数链路局部可用但性能/内存风险高**
   - MIG-009、MIG-011 有较完整证据。
   - MIG-011/MIG-012 单条耗时 150s 左右，且内存持续接近/超过护栏。

5. **MIG-010 空回答**
   - 这是明确功能失败，需要后续单独复现和归因。

## 上线准入判断

当前状态距离“107 条有效用例真实回放，P0/P1 清零，才能上线”仍有明显差距：

- 107 条没有完成真实执行，94 条被内存护栏阻断。
- P0/P1 规则债务未清零。
- 评测器与 ResponseContract 不一致，无法作为上线质量门。
- Evidence Ledger 未覆盖天气、新闻、知识、文档等关键场景。
- 报表链路有可用样本，但存在耗时和内存风险。

结论：不可上线，不能进入准入通过阶段。

## 建议后续任务拆分

1. **内存阻断复现与定位**
   - 目标：找出 2.3GB -> 3.3GB 增长来源。
   - 方法：按 rows 2-14 分片复跑，记录每条前后 RSS、payload 大小、process_events 数量、contract 大小。
   - 不在该任务中修功能，只定位内存来源。

2. **评测器准入口径修正**
   - 目标：blocked contract、无 evidence、无 SourceRef/ToolTrace 不能判通过。
   - 覆盖：MIG-001、MIG-002、MIG-003、MIG-004、MIG-005、MIG-006、MIG-008。

3. **Evidence Ledger 闭环专项**
   - 目标：天气、新闻、行业文档、系统知识、指标解释必须有明确 SourceRef/EvidenceRef 或明确 unsupported 降级证据。

4. **MIG-010 空回答归因**
   - 目标：确认是 SSE 中断、Answer Composer 空输出、ContractSafety 清空、还是工具执行失败未转译。

5. **MIG-012 missing_input 归因**
   - 目标：确认应用类型解析为何仍要求补充，以及为什么该条执行到 150s 后触发内存峰值。

6. **重新全量 E2E**
   - 前置：内存问题至少能支持 107 条跑完。
   - 验收：107 条均有真实执行结果；阻断只能是业务/权限/数据口径阻断，不应是系统 RSS 护栏。

