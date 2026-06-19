
# 小乔智投 自动化服务 1.0 总纲文档

## 1. 自动化定位

- 自动化是小乔智投 1.0 的核心能力之一。
- 自动化不是通用工作流平台，不涉及审批流、复杂 DAG 或节点编辑器。
- 自动化核心价值：把高频、重复、周期性的数据分析服务沉淀为持续运行的服务实例。
- 主要触发场景：定时报表、定时问数、文件上传触发、异常指标提醒。

## 2. 自动化创建方式

1. **Chat 保存自动化**（最核心）
2. **结果卡片保存自动化**（分析结果、创意、预测结果）
3. **模板创建自动化**（日报、周报、异常提醒等）

**注意：**不提供空白自动化创建，避免用户复杂配置。

## 3. 自动化任务对象模型

### 3.1 AutomationTask

- 用户创建的自动化任务实例。
- 属性：名称、说明、触发器、输出策略、通知策略、上下文绑定。

### 3.2 AutomationTrigger

- 支持类型：手动、定时（Cron）、文件上传触发、指标阈值触发、Webhook（预留）。
- 自动补全缺失参数（例如未指定触发时间默认 09:00 或根据上下文推理）。

### 3.3 AutomationExecution

- 每次自动化运行的记录。
- 属性：执行状态（queued、running、succeeded、partial_succeeded、failed、cancelled）、开始/结束时间、输入快照、执行结果、产物列表、错误信息。

### 3.4 AutomationResult / Artifact

- 执行产物写入我的资产，支持预览、下载、复用。
- 每个产物关联对应 executionId。

### 3.5 Notification

- 任务完成、部分成功、失败或生成文件时发送站内消息通知。
- 左侧侧边栏、用户头像、任务列表红点统一由消息中心控制。

## 4. 自动化执行架构

```text
API Layer
  ↓
Automation Service
  ↓
Trigger Service
  ↓
Scheduler / Event Router
  ↓
Queue
  ↓
Worker Pool
  ↓
Step Executor
  ↓
Execution Store
  ↓
Artifact Store
  ↓
Notification Service
```

- Worker 分池执行，按资源特征区分（parse / query / compute / artifact / notification / orchestrator）。
- Scheduler 支持 jitter，避免多用户同一时间洪峰。

## 5. 执行链路

```text
对话识别自动化意图
  ↓
生成任务草稿
  ↓
自动补全缺失参数
  ↓
用户确认
  ↓
保存任务
  ↓
Scheduler 到点触发
  ↓
Worker 执行问数/报表/文件生成
  ↓
生成文件写入资产
  ↓
创建通知
  ↓
前端红点展示
  ↓
用户打开结果
  ↓
标记已读
```

## 6. 参数补全策略

- 缺少触发时间、频率或输出格式时，自动推理默认值或结合上下文推荐。
- 系统展示草稿给用户确认，避免复杂配置操作。
- 引导用户优先使用自动化报表方向。

## 7. 不支持操作处理策略

- 对投放操作（如暂停广告、修改预算）等写操作，不直接支持。
- 降级为**异常提醒+通知+人工处理建议**。
- 保持友好提示，不拒绝，但明确当前不可执行。

## 8. 自动化前端设计

- 左侧一级入口：自动化
- 首页显示：最近运行状态、异常任务、最近生成结果、模板推荐、我的自动化列表
- 详情页显示：任务信息、触发器、输入上下文、输出配置、执行记录、生成文件、日志
- 执行记录页显示：步骤执行状态、分段查询结果、生成文件、通知、错误原因
- 红点和通知统一从消息中心获取

## 9. 自动化上线验收标准

- **战略评审**：自动化是服务沉淀能力，不是工作流平台
- **架构评审**：独立 Automation Domain、Execution Store、Worker、Scheduler、Notification/Artifact 集成、幂等、失败重试、权限校验
- **产品规划评审**：Chat 保存自动化、定时运行、分段取数、生成文件、写回资产、通知红点
- **需求评审**：触发条件、输入上下文、执行步骤、成功/失败标准、超时/重试、权限、输出、通知、审计、性能限制
- **设计评审**：侧边栏入口、首页、列表、详情页、执行记录页、失败状态、空状态、红点、文件卡片
- **用户体验评审**：用户知道任务目标、触发时间、数据范围、结果位置、失败原因、重跑操作、打开文件
- **实施评审**：单元/集成/端到端/并发/大文件/长任务/失败重试/权限/通知/资产/恢复测试

## 10. 生产级 1.0 最低技术清单

### 数据库表

```text
automation_definitions
automation_triggers
automation_executions
automation_step_runs
automation_artifacts
automation_notifications
automation_templates
automation_quotas
```

### 后端服务

```text
AutomationDefinitionService
TriggerService
SchedulerService
ExecutionOrchestrator
StepExecutorRegistry
AutomationWorker
RetryService
ArtifactCommitService
NotificationService
AuditLogService
QuotaService
```

### 前端页面

```text
/automations
/automations/new
/automations/templates
/automations/:id
/automations/:id/runs
/automations/runs/:runId
```

### API 接口

```text
POST   /api/automations
GET    /api/automations
GET    /api/automations/:id
PATCH  /api/automations/:id
POST   /api/automations/:id/enable
POST   /api/automations/:id/pause
POST   /api/automations/:id/run
GET    /api/automations/:id/executions
GET    /api/automation-executions/:id
POST   /api/automation-executions/:id/cancel
POST   /api/automation-executions/:id/retry
GET    /api/automation-templates
GET    /api/notifications/unread-count
POST   /api/notifications/mark-read
```

## 11. 总结

- 自动化是对话生成的轻量自动化任务能力。
- 聚焦定时报表、定时问数、文件生成和通知。
- 参数缺失时自动补全并展示草稿确认。
- 不支持投放操作等写操作时降级提示。
- 执行链路异步、分段、可追踪、可重试、可审计。
- 左侧侧边栏显示一级入口，统一红点与通知。
- 保持 AI First、Chat First、轻配置、高价值感，支持后续扩展到创意、预测等其他服务。
