# Task Template Registry

## 概述

Task Template Registry 是自动化任务模板的注册中心。每个模板定义了：
- 必填槽位（requiredSlots）
- 输出契约（outputContract）
- 风险等级（riskLevel）
- 执行器绑定（executorBinding）

## 标准模板

### 1. scheduled_join_table — 拼表 + 定时更新

**场景**：用户上传或选择 Excel/CSV/报表模板，配置数据源、字段映射、过滤条件和更新时间，系统定时取数并生成更新后的拼表产物。

| 属性 | 值 |
|---|---|
| templateId | `scheduled_join_table` |
| riskLevel | L3 |
| executor | `join-table-executor` |

**必填槽位**：
- `sourceTables` / `sourceReports` — 数据源列表
- `joinKeys` — 关联字段
- `outputFields` — 输出字段
- `schedule` — 定时规则
- `outputFormat` — 输出格式（Excel/CSV）

**输出**：
- task_run_completed message
- 表格预览
- artifactRefs: Excel/CSV 文件
- evidenceRefs / sourceRefs

### 2. scheduled_aggregate_table — 聚合表 + 定时更新

**场景**：用户指定媒体、项目、指标、维度、时间范围和聚合规则，系统定时生成聚合表。

| 属性 | 值 |
|---|---|
| templateId | `scheduled_aggregate_table` |
| riskLevel | L3 |
| executor | `aggregate-table-executor` |

**必填槽位**：
- `metrics` — 指标列表
- `dimensions` — 维度列表
- `filters` — 过滤条件
- `aggregationRules` — 聚合规则
- `schedule` — 定时规则
- `outputFormat` — 输出格式

**输出**：
- 聚合表摘要
- 表格预览
- 图表可选
- artifactRefs: Excel/CSV

**备注**：具体聚合函数/Tool 由用户提供特征清单后绑定，执行器预留 tool binding 接口。

### 3. gi_keyword_daily_digest — GI 日报 + 关键词定制

**场景**：用户配置行业、关键词、关注方向和日报时间，系统每天生成游戏行业情报日报。

| 属性 | 值 |
|---|---|
| templateId | `gi_keyword_daily_digest` |
| riskLevel | L1/L2 |
| executor | `daily-digest-executor` |

**必填槽位**：
- `industryScope` — 行业范围
- `keywords` — 关键词列表
- `digestTime` — 日报时间
- `sourceScope` — 来源范围
- `outputPreference` — 输出偏好

**输出**：
- Markdown 日报
- 重点新闻/动态
- 来源列表 sourceRefs
- 可选 structured_data

**约束**：
- 不得编造资讯
- 必须带 sourceRefs
- 支持用户通过对话修改关键词
- 支持"无重要更新则不打扰"策略

**备注**：GI 系统 API 接口规范待对接确认，执行器预留 API client binding 接口。

### 4. scheduled_metric_monitor — 指标监控 + 定时更新

**场景**：用户指定项目、媒体、指标、阈值、检查频率，系统定时检查并在异常时回写消息。

| 属性 | 值 |
|---|---|
| templateId | `scheduled_metric_monitor` |
| riskLevel | L2/L3 |
| executor | `metric-monitor-executor` |

**必填槽位**：
- `metrics` — 指标列表
- `entityScope` — 实体范围（project/media/app/campaign）
- `thresholdRules` — 阈值规则
- `checkFrequency` — 检查频率
- `timeWindow` — 时间窗口

**输出**：
- 无异常：只记录 TaskRun，不生成用户消息
- 有异常：task_run_completed 或 task_needs_action message
- 异常明细表
- 排查建议
- evidenceRefs

## 模板注册接口

```typescript
interface TaskTemplateDefinition {
  templateId: string;
  name: string;
  description: string;
  requiredSlots: SlotDefinition[];
  outputContract: OutputContract;
  riskLevel: 'L0' | 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  executorBinding: string;
  proposalCardRenderer?: string;
  resultCardRenderer?: string;
}
```

## 模板筛选

轻量自动化列表支持按模板筛选：
- 全部
- 拼表（scheduled_join_table）
- 聚合表（scheduled_aggregate_table）
- GI 日报（gi_keyword_daily_digest）
- 指标监控（scheduled_metric_monitor）
