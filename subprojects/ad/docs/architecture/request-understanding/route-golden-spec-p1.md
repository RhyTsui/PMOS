# P1 Route Golden Spec

## 目标

P1 route golden 用于固化通用 Chat 路由治理基线。它不只断言最终 intent，还要分层断言证据、权限、技能、能力、工具目的和 fallback 边界。

P1-A 只沉淀规格，不改变现有 `test:routing-golden` 行为。P1-B 之后可新增 `test:route-governance`，把本规格转成只读观测回归。

## 断言维度

每条 golden case 至少覆盖：

- `clientIntent`：前端 hint，不得成为硬门控。
- `serviceIntent`：通用 Chat 顶层意图。
- `primaryDeliverable`：最终交付物。
- `domainSignals`：业务域信号，只作为 evidence/scope。
- `matchedRules`：命中规则和来源。
- `selectedSkill`：候选技能和最终技能。
- `capabilityDecision`：candidate 与 executable 的区分。
- `toolPurpose`：工具调用目的。
- `isReportQuery`：是否允许进入普通报表链路。
- `promptRuntime`：active prompt、version、source、seed fallback、cache、hash。
- `warnings`：client hint conflict、Prompt 强引导、fallback 阻断等。

## P0/P0.5 Baseline

这些样例必须持续保留为路由回归输入，但不得写入通用路由逻辑成为 if/else。

| 输入类型 | 期望 |
|---|---|
| 普通产品/API 使用咨询 | `general_chat` 或 `help_qa`，不进入 report query |
| 能力支持咨询 | `help_qa`，不进入普通 report MCP |
| 配置说明咨询 | `help_qa`，不进入普通 report MCP |
| 字段解释 | `help_qa` 或等价字段解释，不进入普通 report MCP |
| 明确取数 | `data_query`，可进入报表能力 |
| 明确趋势/对比/排名并具备数据交付物 | `data_query`，可进入报表能力 |
| 原因诊断 | `issue_diagnosis`，可用 `evidence_fetch`，主意图不是 report query |
| 需求/方案/文档撰写 | `light_requirement`，默认不调用工具 |
| 日报/报告生成 | `report_delivery`，可进入报告生成或调度能力 |
| 上传文件后取数/拼表 | `data_query` 或文件取数等价意图 |
| 获取包/发起联调/配置执行 | `system_operation`，只允许对应 workflow scope |
| 闲聊 | `general_chat`，不清空 active workflow |
| structured currentProject 存在且文本为空 | 上下文保留 structured project |
| `body.intent=report_query` 但文本是帮助咨询 | 后端忽略 client hint，不进入普通 report MCP |

## P1 Governance Cases

新增治理类样例应覆盖：

- client hint 与后端判断冲突时，后端权威结果获胜。
- domain signal 命中但最终交付物是帮助时，不进入 report query。
- domain signal 命中但最终交付物是需求撰写时，不进入 report query。
- domain signal 命中但最终交付物是诊断时，不进入普通 report fallback。
- skill 缺少 trigger/domain scope 时，不因 route bonus 污染候选。
- active route rules 不存在时，seed 只作为缺失兜底。
- active runtime 存在时，seed 不覆盖 runtime。
- Prompt fallback、cache、content hash、conflict metadata 可观测。
- capability 只有 candidate、没有 executable 时，不调用 MCP。
- report fallback 不覆盖 help、diagnosis、system_operation、light_requirement、general_chat。

## 验收命令

P1-A 继续使用现有命令：

```bash
npm.cmd run test:routing-golden
npm.cmd run validate:ad-ui
```

P1-B 之后新增：

```bash
npm.cmd run test:route-governance
```

新增治理测试必须不调用外部 MCP，只验证路由、能力、工具选择和 metadata。
