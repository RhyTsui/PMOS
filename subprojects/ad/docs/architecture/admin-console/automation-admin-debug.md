# Automation Admin Debug 自动化管理员调试

## 概述

管理员后台保留完整的自动化任务运行视图，包括 TaskRun / Trace / Artifact / Error / Evidence Ledger。

## 管理员可见内容

### AutomationTask 详情
- 任务配置（含 raw config）
- 关联会话
- 运行历史

### TaskRun 详情
- 运行状态
- 开始/结束时间
- 输出消息 ID
- 错误信息
- Trace ID

### TaskArtifact 详情
- 产物类型
- 文件 URI
- 元数据

### TaskTrace 详情
- 完整 trace payload
- 各步骤耗时
- 工具调用详情

### TaskError 详情
- 错误码
- 错误信息
- 堆栈（开发模式）

### Evidence Ledger
- 证据链
- 来源引用
- 工具结果

## API

管理员 API 放在 `/api/xiaoqiao/admin/` 命名空间下：

- `GET /api/xiaoqiao/admin/debug-automation/configs` — 任务配置列表
- `GET /api/xiaoqiao/admin/debug-automation/configs/:id` — 任务配置详情
- 现有 debug-automation 端点保持不变

## 约束

1. 普通用户不可访问管理员 API。
2. 管理员视图不影响普通用户体验。
3. Trace 数据保留策略遵循现有 observability 规范。
