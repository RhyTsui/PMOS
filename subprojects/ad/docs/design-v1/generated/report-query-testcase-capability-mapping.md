# 问数测试集能力归属矩阵

生成时间：2026-06-19T16:50:01.170Z

## 1. 汇总

- 用例总数：91
- P0 用例：72
- P1 用例：16
- P2 用例：3

### 1.1 当前状态

| 状态 | 数量 |
|---|---:|
| partial | 91 |

### 1.2 Tool 命中

| Tool 命中状态 | 数量 |
|---|---:|
| exact | 91 |

### 1.3 报表域

| 报表域 | 数量 |
|---|---:|
| ad_daily_report | 42 |
| ad_roi_report | 25 |
| ad_retention_report | 17 |
| ad_hour_report | 6 |
| report_diagnosis_candidate | 1 |

### 1.4 责任层

| 责任层 | 涉及用例数 |
|---|---:|
| chat_mapping_required | 91 |
| ui_required | 91 |
| mcp_native | 90 |
| orchestrator_postprocess | 17 |

### 1.5 门禁

- Tool 选择门禁：通过
- Tool mismatch / not selected：0
- P0 Tool mismatch / not selected：0
- 多工具编排用例：42

## 2. 用例明细

| 用例 | P | 业务域 | 报表域 | 期望 tool | 当前 tool | Tool 命中 | 责任层 | 状态 |
|---|---|---|---|---|---|---|---|---|
| MIG-001 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-002 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-003 | P2 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-004 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-005 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-006 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-007 | P0 | 广告报表 | ad_hour_report | get_zt_hour_report, get_zt_ad_day_report | get_zt_hour_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-008 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-009 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-010 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-011 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-012 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-013 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-014 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-015 | P0 | 媒体报表 | ad_hour_report | get_zt_hour_report, get_zt_ad_day_report | get_zt_hour_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-016 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-017 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-018 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-019 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-020 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-021 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-022 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-023 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-024 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-025 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-026 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-027 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-028 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-029 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-030 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-031 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-032 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-033 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-034 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-035 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-036 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-037 | P1 | 广告报表 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-038 | P1 | 指标口径 | ad_retention_report | get_zt_ad_retention_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-039 | P1 | 指标口径 | ad_retention_report | get_zt_ad_retention_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-040 | P0 | 广告报表 | ad_hour_report | get_zt_hour_report, get_zt_ad_day_report | get_zt_hour_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-041 | P0 | 媒体报表 | ad_hour_report | get_zt_hour_report, get_zt_ad_day_report | get_zt_hour_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-042 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-043 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-044 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-045 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-046 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-047 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-048 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-049 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-050 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_hour_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-051 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-052 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-053 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-054 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-055 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-056 | P0 | 指标口径 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-057 | P0 | 指标口径 | ad_hour_report | get_zt_hour_report, get_zt_ad_day_report | get_zt_hour_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-058 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-059 | P1 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-060 | P1 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-061 | P0 | 媒体报表 | ad_hour_report | get_zt_hour_report, get_zt_ad_day_report | get_zt_hour_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-062 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-063 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-064 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-065 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-066 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-067 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-068 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-069 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-070 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-071 | P1 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-072 | P0 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-073 | P1 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-074 | P1 | 广告报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-075 | P0 | 指标口径 | ad_roi_report | get_zt_ad_roi_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-076 | P0 | 指标口径 | ad_retention_report | get_zt_ad_retention_report, get_zt_hour_report, get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_retention_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-077 | P0 | 媒体报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-001 | P0 | Tools/MCP调用 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-002 | P0 | 权限与范围 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-003 | P0 | 多轮上下文 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-004 | P0 | 指标口径 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-006 | P1 | 指标口径 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-007 | P1 | 意图识别 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-008 | P1 | 应用类型 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-009 | P1 | 稳定性与性能 | ad_roi_report | get_zt_ad_roi_report, get_zt_ad_day_report | get_zt_ad_roi_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-010 | P1 | 展示体验 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-FBK-012 | P1 | 数据准确性 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-FBK-013 | P2 | 边界场景 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-015 | P1 | 自然量报表 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |
| MIG-FBK-017 | P1 | 问题排查 | report_diagnosis_candidate | get_zt_ad_roi_report | get_zt_ad_roi_report | exact | chat_mapping_required, orchestrator_postprocess, ui_required | partial |
| MIG-FBK-018 | P2 | 空结果处理 | ad_daily_report | get_zt_ad_day_report | get_zt_ad_day_report | exact | mcp_native, chat_mapping_required, ui_required | partial |

## 3. 说明

- `partial` 不等于失败，通常表示 MCP tool 已能命中，但仍需要验证 Chat slot、后处理、UI 或 Trace。
- `unknown_or_gap` 只表示当前规则或当前绑定能力无法确认，不直接等同于 MCP 缺失。
- 本脚本中的推断规则仅用于测试集归属和门禁，不是生产路由事实来源；生产执行事实应来自 MCP tool schema、动态策略配置、权限上下文和知识库口径说明的分层组合。
- JSON 产物包含每条用例的 slots、dictionary tools、postprocess、UI contract 和 failure categories。
