# Skill 与 MCP 覆盖审计（2026-06-13）

## 结论

本轮仅清理运行态停用 Skill 和重复未安装 Skill，不处理历史文档目录，不新增 MCP tool。

- 运行态 Skill Contract 已从 22 个收敛为 12 个，保留项均为 `enabled=true`。
- `skills.json` 中未安装的安卓归因与回推排查副本已删除。
- `callback-attribution-diagnosis` 是当前唯一工具绑定 100% 覆盖的专科 Skill。
- 多个保留 Skill 仍存在旧工具绑定名，下一阶段应做 Tool Contract / alias 对齐，而不是直接补旧名 tool。

## 已清理对象

### 删除的停用 Skill Contract

- `report-orchestration`
- `ads_health_monitor_skill`
- `auto_debug_skill`
- `industry_news_skill`
- `industry_traffic_analysis_skill`
- `campaign_performance_overview_skill`
- `creative_benchmark_analysis_skill`
- `ranking_signal_analysis_skill`
- `metric_requirement_intake_skill`
- `integration_requirement_workflow_skill`

### 删除的重复未安装 Skill

- `skill-1780020920154`：安卓归因与回推排查（副本）

## 保留 Skill 覆盖矩阵

| Skill | 绑定工具数 | 已连接 MCP 覆盖 | 缺口 | 判定 |
|---|---:|---:|---:|---|
| `callback-attribution-diagnosis` | 13 | 13 | 0 | 强可用，归因回推专科能力 |
| `report_data_quality_check_skill` | 0 | 0 | 0 | 本地质量检查型，保留 |
| `package_delivery_execution_skill` | 10 | 2 | 8 | 需要旧别名迁移 |
| `package_status_query_skill` | 3 | 1 | 2 | 需要旧别名迁移 |
| `delivery_diagnosis_skill` | 2 | 1 | 1 | 需要旧别名迁移 |
| `metric_diff_diagnosis_skill` | 2 | 0 | 2 | 需要改造为报表 MCP + 排查 MCP |
| `preflight_quality_check_skill` | 8 | 0 | 8 | 需要重建工具契约 |
| `knowledge_answer_skill` | 1 | 0 | 1 | 需对齐知识库能力来源 |
| `metric_explainer_skill` | 1 | 0 | 1 | 需对齐指标口径来源 |
| `tracking_link_delivery_skill` | 3 | 0 | 3 | 需对齐监测链接 MCP 实际工具名 |
| `report_template_builder_skill` | 2 | 0 | 2 | 非第一轮重点，待报表模板能力确认 |
| `scheduled_report_skill` | 3 | 0 | 3 | 非第一轮重点，待定时任务能力确认 |

## 当前可复用 MCP 能力

第一轮数据问题排查不补 tool，优先复用已连接 MCP：

- 报表 MCP：`get_zt_*`、`get_dict_zt_*`、`list_all_apps`
- 排查 MCP：`diag.check_report_metric_layers`、`diag.compare_spend_collection_layers`、`diag.check_media_collection_status`、归因闭环相关 `diag.*`
- 归因 MCP：`check_callback_config`、`check_fusion_attribution`、`analyze_attribution_stats`、`find_missing_feedback_devices`、`diagnose_attribution_issue`
- 运维调度 MCP：`azkaban_*`

## 下一阶段建议

1. 将 `metric_diff_diagnosis_skill` 从旧工具名改造为报表 MCP + 排查 MCP 的能力组合。
2. 建立旧工具绑定名到真实 MCP 工具名的 alias / Tool Contract 对齐表。
3. 先验证 `data_issue_diagnosis_workflow_candidate` 的候选路径，不直接接入主链执行。
4. 只有当验证触发明确缺口时，再讨论补 tool。
