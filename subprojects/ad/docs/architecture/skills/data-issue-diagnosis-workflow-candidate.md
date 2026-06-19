# data_issue_diagnosis_workflow_candidate

## 定位

`data_issue_diagnosis_workflow_candidate` 是广告数据问题排查的受治理候选工作流，用于第一轮聚焦“归因 + 报表”的数据问题。

它不是新的运行时总线，不替代 Request Understanding、Task Planner、Plan Arbitrator、Capability Discovery、Execution Policy、Evidence Ledger、ResponseContract 或 Trace。它只描述候选排查路径、所需证据、工具来源和降级边界。

## 适用问题

- 报表值与 BI、媒体后台或用户预期不一致。
- 指标突增突降、空数据、字段缺失、日期缺口。
- 有消耗但转化、激活、注册、付费等指标异常。
- 用户怀疑归因、回传、采集、调度或报表层存在问题。

## 不适用问题

- 纯指标解释或稳定知识问答。
- 单纯趋势分析或投放效果总结。
- 创意、榜单、行业情报等非第一轮范围。
- 缺少项目/应用、指标、时间范围且无法从上下文安全补齐的问题。

## 输入契约

必填槽位：

- `project_or_app`
- `metric`
- `date_range`
- `compare_source`

可选槽位：

- `media`
- `event_type`
- `dimension`
- `campaign`
- `material`
- `package`
- `account`
- `expected_value`
- `observed_issue`

缺必填槽位时必须进入 `clarify_missing_inputs`，不得直接调用工具或生成确定结论。

## 候选路径

| Path | 目的 | 候选工具来源 | 采纳条件 |
|---|---|---|---|
| `report_metric_verification` | 查询报表事实值、时间覆盖和维度明细 | 报表 MCP `get_zt_*`、`get_dict_zt_*` | 用户问题需要确认报表数据或对比值 |
| `report_layer_comparison` | 判断报表层、聚合层或口径层差异 | 排查 MCP `diag.check_report_metric_layers` | 已有报表事实但差异层级未定位 |
| `collection_status_check` | 判断媒体采集、字段、延迟、空返回 | 排查 MCP `diag.check_media_collection_status` | 怀疑采集异常、延迟或空数据 |
| `spend_collection_comparison` | 消耗类或媒体上游差异对账 | 排查 MCP `diag.compare_spend_collection_layers` | 问题涉及消耗、媒体侧数值或采集层对账 |
| `attribution_callback_diagnosis` | 进入归因/回传闭环专科排查 | `callback-attribution-diagnosis`、归因 MCP、排查 MCP `diag.*` | 用户明确提到回传/归因，或前置证据指向归因层 |
| `scheduler_status_check` | 查看调度任务、执行状态和日志 | 运维调度 MCP `azkaban_*` | 怀疑任务延迟、失败、重试或入库未完成 |
| `clarify_missing_inputs` | 补齐关键槽位 | 无工具调用 | 缺少必填槽位或风险过高 |

## `callback-attribution-diagnosis` 使用边界

`callback-attribution-diagnosis` 是归因回推专科能力，不是本 workflow 的必经步骤。

优先调用条件：

- 用户明确提到回推、回传、归因失败、SDK/API 回调、iOS/鸿蒙激活闭环。
- 报表差异排查证据指向归因预处理、回传配置、基础事件入库或媒体事件汇总。
- 用户要求追踪某个事件从基础事件到媒体回传的闭环。

不得调用条件：

- 单纯报表查询、趋势查询或投放效果总结。
- 纯指标解释。
- 缺少项目/应用、时间范围、事件类型且无法安全补齐。
- 只存在弱相关猜测，没有工具证据指向归因层。

## 输出契约

输出必须能收口到 ResponseContract / SemanticResultContract：

- `summary`
- `diagnosis_status`: `success | partial | blocked | insufficient_evidence`
- `evidence_mode`: `tool_grounded | mixed_grounded | insufficient_evidence`
- `root_cause_candidates`
- `rejected_candidates`
- `evidence_refs`
- `source_refs`
- `tool_call_trace`
- `confidence`
- `next_actions`
- `capability_gaps`

无证据时不得输出确定根因；只能追问、降级或列出待验证假设。

## 第一轮验收

- 报表差异问题不直接硬走 `callback-attribution-diagnosis`。
- 明确归因/回传问题能命中 `callback-attribution-diagnosis`。
- 工具不可用时返回 `capability_gaps`，不伪装成功。
- 每个被采纳或拒绝的候选路径都可进入 Trace / runtime disclosure。
- 不新增业务关键词 if/else 到通用 Core。
- 第一轮不补 tool；只有审计验证触发缺口门槛后再讨论新增工具。
