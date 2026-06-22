# Automation Message Components 自动化消息组件

## 概述

任务相关消息在会话中使用专用卡片组件渲染，不使用通用 markdown 渲染。

## 组件清单

### 1. TaskProposalCard — 任务创建确认卡

展示任务名称、范围、频率/条件、输出、风险等级。用户可确认或取消。

**Props**：
- taskTitle: string
- description: string
- schedule: string（用户可读，非 cron）
- riskLevel: string（用户可读文案）
- onConfirm: () => void
- onCancel: () => void

**约束**：
- 不展示 cron、raw params、tool name
- 高风险任务必须提示需要确认

### 2. TaskStatusCard — 通用状态变更卡

展示任务状态变更（created/updated/paused/resumed/deleted）。

**Props**：
- action: 'created' | 'updated' | 'paused' | 'resumed' | 'deleted'
- taskTitle: string
- changes?: string[]（修改内容，仅 updated）
- effectiveAt?: string（生效时间）
- undoAction?: () => void（撤销入口）

### 3. TaskResultCard — 任务结果卡

展示任务执行结果，默认 compact 模式。

**Props**：
- payload: TaskResultMessagePayload
- onViewDetail: () => void
- onOpenSourcePanel: () => void
- onCopy: () => void

**展示**：
- 摘要（summary）
- 关键发现（keyFindings，最多 3 条）
- 操作按钮

### 4. TaskFailureCard — 失败卡

展示失败原因和补救动作。

**Props**：
- taskTitle: string
- errorMessage: string
- retryAction: () => void
- viewDetailsAction: () => void

### 5. TaskNeedsActionCard — 需人工确认卡

展示需要用户处理的任务。

**Props**：
- taskTitle: string
- actionRequired: string
- confirmAction: () => void
- dismissAction: () => void

### 6. TaskInlineActions — 消息内操作按钮

展示任务消息的可操作按钮。

**按钮**：
- 查看明细
- 重新运行
- 暂停/恢复任务
- 删除任务（需二次确认）
- 复制结果
- 查看过程与依据

## 模板专用渲染器

### JoinTableResultRenderer — 拼表结果

- 表格预览（前 N 行）
- 下载按钮（Excel/CSV）
- 数据源说明

### AggregateTableResultRenderer — 聚合表结果

- 摘要文案
- 表格预览
- 图表（可选）
- 下载按钮

### DailyDigestResultRenderer — GI 日报结果

- 重点摘要（markdown）
- 来源列表
- 继续追问按钮

### MetricMonitorResultRenderer — 指标监控结果

- 异常等级标签
- 影响范围
- 建议动作
- 异常明细表

## 渲染规则

1. 主消息默认 compact，明细进入展开区或右侧。
2. raw params / cron / debug 不出现在主消息。
3. 失败消息必须给补救动作。
4. needs_action 必须有确认按钮。
