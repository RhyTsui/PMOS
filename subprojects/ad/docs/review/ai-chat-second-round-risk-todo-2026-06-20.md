# AI Chat 第二轮验收风险待办

日期：2026-06-20

## 当前结论

第二轮 MIG-050~060 还不能标记完成。MIG-051 已从 `debugging/not_configured` 误路由推进到 `report_query`，并修复了单日 ISO 日期被落到当天的问题；但留存报表主工具仍出现参数映射异常，不能用日报 fallback 结果冒充留存查询成功。

## 已完成修复

| 优先级 | 项目 | 证据 |
| --- | --- | --- |
| P0 | `multi_query` 0 子查询不再终止主链路，改为继续常规报表查询 | `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts` 通过 |
| P0 | `execute_workflow` semantic frame 不再无条件覆盖强查数信号 | MIG-051 从 `debugging` 回到 `report_query` |
| P0 | `/api/chat` 服务端上下文可从登录态携带当前项目和可见项目列表 | MIG-051 不再停在“确认项目” |
| P0 | 泛化维度词“应用类型”不再触发应用类型字典实体解析 | MIG-051 不再停在“应用类型解析输出” |
| P0 | `YYYY-MM-DD` 单日日期进入公共日期解析器 | MIG-051 回归回答日期从 2026-06-20 修正为 2026-02-01 |
| P0 | 不兼容 fallback 不再遮蔽主工具失败 | MIG-051 由假成功变为 `failed`，暴露 retention 参数映射问题 |
| P1 | 第二轮测试脚本 checkpoint 增加过程事件摘要 | checkpoint 包含 `processEventSummary` 和 `outputSummary` |

## 仍阻断

| 优先级 | 待办 | 现象 | 下一步验收 |
| --- | --- | --- | --- |
| P0 | 修复 `get_zt_ad_retention_report` 参数映射 | MIG-051 `get_zt_ad_retention_report` 报“查询参数映射异常”，当前最终 `response_contract.status=failed` | 重跑 MIG-051，必须返回留存指标而不是日报 fallback |
| P0 | 扩大 MIG-050/052/053 多指标拆解和工具覆盖 | 仍存在 report/multi-query 能力缺口，复合指标不能完整拆成 daily/roi/retention/hour 子查询 | 重跑 MIG-050~060，强制校验 source/evidence/tool trace 与关键数值 |
| P0 | 治理 E2E 长请求内存增长 | dev server 在多轮报表 E2E 后达到约 4GB 并 OOM | 采样单 case 内存、限制 IntentOrch/LLM 重入、批次运行不应崩服务 |
| P1 | 收紧第二轮测试判定 | 旧判定只要有数据和证据就通过，曾把错误日期/错误报表结果判为通过 | 对广告报表类用例增加关键日期、关键指标、预期数值或至少指标覆盖校验 |

## 已验证命令

- `npm.cmd run ts-check`
- `npm.cmd run validate:ad-ui`
- `npm.cmd exec tsx scripts/multi-query-stage-self-test.ts`（工作目录：`frontend/src`）
- `git diff --check`

## 最新关键证据

- `docs/review/小乔智投测试集v1.1_second-round-20260620-010627.checkpoint.json`
- 失败形态：MIG-051 进入 `report_query`，项目与日期已解析，终端字典成功，retention 主工具失败，日报 fallback 成功但不再作为最终成功替代。
